"""Embedding service using sentence-transformers.

Uses the lightweight 'all-MiniLM-L6-v2' model (~80 MB) which provides
a good balance between speed and quality for semantic search.
"""

from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    """Lazy-load and cache the embedding model."""
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of text strings."""
    model = get_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """Generate a single embedding for a user query."""
    model = get_model()
    embedding = model.encode(query, show_progress_bar=False)
    return embedding.tolist()


# Chunking helpers

def chunk_recipe(recipe_dict: dict, recipe_id: int) -> list[dict]:
    """Break a recipe into meaningful chunks for embedding.

    Returns a list of dicts with keys: text, metadata.
    Each chunk captures a distinct aspect of the recipe so that
    semantic search can match on ingredients, instructions, or metadata.
    """
    title = recipe_dict.get("title", "Untitled")
    chunks: list[dict] = []

    # ── 1. Overview chunk (title + description + metadata) ────────────
    overview_parts = [f"Recipe: {title}"]
    if recipe_dict.get("description"):
        overview_parts.append(recipe_dict["description"])
    for field in ("cuisine", "category", "prep_time", "cook_time", "total_time", "servings", "calories"):
        val = recipe_dict.get(field)
        if val:
            label = field.replace("_", " ").title()
            overview_parts.append(f"{label}: {val}")
    chunks.append({
        "text": "\n".join(overview_parts),
        "metadata": {"recipe_id": recipe_id, "chunk_type": "overview", "title": title},
    })

    # ── 2. Ingredients chunk ──────────────────────────────────────────
    ingredients = recipe_dict.get("ingredients", [])
    if ingredients:
        ing_text = f"Ingredients for {title}:\n" + "\n".join(f"- {i}" for i in ingredients)
        chunks.append({
            "text": ing_text,
            "metadata": {"recipe_id": recipe_id, "chunk_type": "ingredients", "title": title},
        })

    # ── 3. Instructions chunk ─────────────────────────────────────────
    instructions = recipe_dict.get("instructions", [])
    if instructions:
        instr_text = f"Instructions for {title}:\n" + "\n".join(
            f"Step {idx + 1}: {step}" for idx, step in enumerate(instructions)
        )
        chunks.append({
            "text": instr_text,
            "metadata": {"recipe_id": recipe_id, "chunk_type": "instructions", "title": title},
        })

    return chunks
