"""FastAPI application – Recipe Assistant backend."""

import json
import csv
import io
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import get_db, init_db
from models import Recipe, RecipeIn, SearchQuery, ChatQuery
from embedding import embed_texts, embed_query, chunk_recipe
from vector_db import add_chunks, search as vector_search, get_chunk_count, clear_all
from rag import stream_chat_response

app = FastAPI(title="Recipe Assistant API", version="1.0.0")

# ── CORS (allow the frontend to talk to the backend) ─────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup ───────────────────────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    init_db()


# ── Health check ──────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message": "Recipe Assistant API is running 🍳",
        "chunks_stored": get_chunk_count(),
    }


@app.delete("/clear-data")
def clear_data(db: Session = Depends(get_db)):
    """Delete all recipes from SQLite and all embeddings from ChromaDB."""
    from models import Recipe
    count = db.query(Recipe).count()
    db.query(Recipe).delete()
    db.commit()
    clear_all()
    return {"message": f"Cleared {count} recipes and all embeddings.", "chunks_remaining": get_chunk_count()}


# ── Helpers: parse CSV row into recipe dict ───────────────────────────

def _parse_csv_row(row: dict) -> dict:
    """Convert a CSV row into our recipe dict."""
    title = row.get("title", "Untitled").strip()

    # Parse JSON-encoded lists
    raw_ingredients = row.get("ingredients", "[]")
    raw_directions = row.get("directions", "[]")

    try:
        ingredients = json.loads(raw_ingredients) if raw_ingredients else []
    except json.JSONDecodeError:
        ingredients = [raw_ingredients]

    try:
        instructions = json.loads(raw_directions) if raw_directions else []
    except json.JSONDecodeError:
        instructions = [raw_directions]

    return {
        "title": title,
        "description": "",
        "ingredients": ingredients,
        "instructions": instructions,
        "cuisine": "",
        "category": "",
        "prep_time": "",
        "cook_time": "",
        "total_time": "",
        "servings": "",
        "calories": None,
        "source": row.get("source", ""),
        "link": row.get("link", ""),
    }


def _progress_event(phase: str, current: int, total: int, detail: str = "") -> str:
    """Build a JSON SSE line for progress tracking."""
    pct = round((current / total) * 100, 1) if total else 0
    payload = json.dumps({
        "type": "progress",
        "phase": phase,
        "current": current,
        "total": total,
        "percent": pct,
        "detail": detail,
    })
    return f"data: {payload}\n\n"


def _done_event(inserted: int, chunks_created: int) -> str:
    """Build a final SSE event."""
    payload = json.dumps({
        "type": "done",
        "message": f"Successfully ingested {inserted} recipe(s).",
        "chunks_created": chunks_created,
        "total_chunks": get_chunk_count(),
    })
    return f"data: {payload}\n\n"


# ── Upload Recipes (JSON or CSV) with SSE progress ───────────────────

@app.post("/upload-recipes")
async def upload_recipes(
    file: UploadFile = File(...),
    limit: int = Query(default=0, description="Max recipes to load (0 = all)"),
    db: Session = Depends(get_db),
):
    """Accept a JSON or CSV file. Streams SSE progress events back."""
    filename = file.filename.lower()
    content = await file.read()

    if filename.endswith(".json"):
        try:
            recipes_data = json.loads(content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON file.")
        if isinstance(recipes_data, dict):
            recipes_data = [recipes_data]
        if not isinstance(recipes_data, list):
            raise HTTPException(status_code=400, detail="JSON must be an array of recipe objects.")

    elif filename.endswith(".csv"):
        try:
            text = content.decode("utf-8", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            recipes_data = []
            for row in reader:
                recipes_data.append(_parse_csv_row(row))
                if limit and len(recipes_data) >= limit:
                    break
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")
    else:
        raise HTTPException(status_code=400, detail="Only .json and .csv files are supported.")

    if limit and len(recipes_data) > limit:
        recipes_data = recipes_data[:limit]

    def generate():
        total = len(recipes_data)
        BATCH_SIZE = 64
        all_chunk_ids = []
        all_documents = []
        all_metadatas = []
        all_embeddings = []
        inserted = 0

        # ── Phase 1: Parsing & storing in SQLite (0-40%) ──────────
        yield _progress_event("parsing", 0, total, "Starting recipe ingestion…")

        for i, item in enumerate(recipes_data):
            recipe_obj = Recipe(
                title=item.get("title", "Untitled"),
                description=item.get("description", ""),
                ingredients=json.dumps(item.get("ingredients", [])),
                instructions=json.dumps(item.get("instructions", [])),
                cuisine=item.get("cuisine", ""),
                category=item.get("category", ""),
                prep_time=item.get("prep_time", ""),
                cook_time=item.get("cook_time", ""),
                total_time=item.get("total_time", ""),
                servings=item.get("servings", ""),
                calories=item.get("calories"),
            )
            db.add(recipe_obj)
            db.flush()

            chunks = chunk_recipe(item, recipe_obj.id)
            for idx, chunk in enumerate(chunks):
                chunk_id = f"recipe_{recipe_obj.id}_chunk_{idx}"
                all_chunk_ids.append(chunk_id)
                all_documents.append(chunk["text"])
                all_metadatas.append(chunk["metadata"])

            inserted += 1

            # Send progress every 5 recipes or on last recipe
            if (i + 1) % 5 == 0 or (i + 1) == total:
                yield _progress_event("parsing", i + 1, total,
                    f"Parsed {i + 1}/{total} recipes")

        db.commit()

        # ── Phase 2: Embedding (40-85%) ───────────────────────────
        total_chunks = len(all_documents)
        embedded = 0

        yield _progress_event("embedding", 0, total_chunks, "Generating embeddings…")

        for i in range(0, total_chunks, BATCH_SIZE):
            batch_texts = all_documents[i : i + BATCH_SIZE]
            batch_embs = embed_texts(batch_texts)
            all_embeddings.extend(batch_embs)
            embedded += len(batch_texts)

            yield _progress_event("embedding", embedded, total_chunks,
                f"Embedded {embedded}/{total_chunks} chunks")

        # ── Phase 3: Storing in vector DB (85-100%) ───────────────
        yield _progress_event("storing", 0, total_chunks, "Storing in vector database…")

        CHROMA_BATCH = 5000
        stored = 0
        for i in range(0, len(all_chunk_ids), CHROMA_BATCH):
            end = min(i + CHROMA_BATCH, len(all_chunk_ids))
            add_chunks(
                all_chunk_ids[i:end],
                all_embeddings[i:end],
                all_documents[i:end],
                all_metadatas[i:end],
            )

            stored = end
            yield _progress_event("storing", stored, total_chunks,
                f"Stored {stored}/{total_chunks} chunks")

        yield _done_event(inserted, total_chunks)

    return StreamingResponse(generate(), media_type="text/event-stream")


# Search (similarity search)

@app.post("/search")
def search_recipes(query: SearchQuery):
    """Perform semantic search over recipe chunks."""
    if get_chunk_count() == 0:
        raise HTTPException(status_code=404, detail="No recipes in the database. Upload recipes first.")

    query_emb = embed_query(query.query)
    results = vector_search(query_emb, top_k=query.top_k)

    hits = []
    if results and results.get("documents"):
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            hits.append({
                "text": doc,
                "metadata": meta,
                "similarity": round(1 - dist, 4),
            })

    return {"query": query.query, "results": hits}


# Chat (RAG pipeline with streaming)

@app.post("/chat")
async def chat(query: ChatQuery):
    """RAG chat endpoint – streams tokens from Ollama."""
    context_chunks: list[str] = []
    if get_chunk_count() > 0:
        query_emb = embed_query(query.message)
        results = vector_search(query_emb, top_k=query.top_k)
        if results and results.get("documents"):
            context_chunks = results["documents"][0]

    return StreamingResponse(
        stream_chat_response(query.message, context_chunks),
        media_type="text/plain",
    )


# Serve frontend static files

import os

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_path):
    app.mount("/app", StaticFiles(directory=frontend_path, html=True), name="frontend")
