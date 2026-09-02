# Recipe Assistant

Recipe Assistant is a full-stack recipe search and chat application built with FastAPI, React, ChromaDB, and Ollama. It lets users upload recipe datasets in JSON or CSV format, run semantic search over the stored recipes, and ask a local AI assistant for recipe recommendations and cooking guidance using retrieval-augmented generation (RAG).

## Features

- Upload recipe collections from JSON or CSV files
- Store recipe metadata in SQLite
- Split recipes into searchable chunks for semantic retrieval
- Use sentence-transformers to generate embeddings with ChromaDB
- Search recipes by meaning, not only exact keywords
- Chat with a local Ollama model using retrieved recipe context
- Stream progress updates while ingesting uploaded files
- Serve the built frontend from the FastAPI backend

## Tech stack

- Backend: FastAPI, SQLAlchemy, Uvicorn
- Database: SQLite
- Vector search: ChromaDB
- Embeddings: sentence-transformers / all-MiniLM-L6-v2
- AI model: Ollama with `gemma3:4b`
- Frontend: React + Vite

## Project structure

```text
Recipe_Assistant/
├── backend/
│   ├── database.py
│   ├── embedding.py
│   ├── main.py
│   ├── models.py
│   ├── rag.py
│   ├── requirements.txt
│   ├── vector_db.py
│   ├── chroma_data/
│   └── recipes.db
├── data/
│   └── sample_recipes.json
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   └── src/
├── .gitignore
├── README.md
└── .venv/ (optional local virtual environment)
```

## How it works

The app has three main layers:

1. Frontend React UI
   - Chat tab
   - Upload tab
   - Search tab
2. FastAPI backend
   - Handles uploads, search, chat, and static frontend serving
3. Recipe retrieval pipeline
   - Recipe files are parsed and stored in SQLite
   - Each recipe is chunked into overview, ingredients, and instructions sections
   - Embeddings are created and saved in ChromaDB
   - User queries are embedded and matched against stored recipe chunks
   - Relevant recipe context is sent to Ollama for grounded responses

## Prerequisites

Before running the app, install the following:

- Python 3.10+
- Node.js 18+
- Ollama
- Git (optional, but recommended)

### Verify installation

```bash
python --version
node --version
npm --version
ollama --version
```

## Setup

### 1) Clone the repository

```bash
git clone <repository-url>
cd Recipe_Assistant
```

### 2) Create a Python virtual environment

On Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
```

On macOS/Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

### 3) Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4) Pull the Ollama model

Start Ollama:

```bash
ollama serve
```

Then pull the language model used by the app:

```bash
ollama pull gemma3:4b
```

### 5) Install frontend dependencies

From the project root:

```bash
cd frontend
npm install
```

## Run the app

### Development mode

Run the backend in one terminal:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Run the frontend in another terminal:

```bash
cd frontend
npm run dev
```

The frontend dev server usually runs at:

```text
http://localhost:5173
```

The Vite dev configuration proxies API calls to the backend at `http://localhost:8000`.

### Production-style mode

Build the frontend once:

```bash
cd frontend
npm run build
```

Then run the backend normally:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

If a built frontend exists under `frontend/dist`, the backend serves it as static files.

## Uploading recipe data

The app accepts `.json` and `.csv` files. The upload API streams progress updates while parsing, embedding, and indexing recipes.

### JSON format

```json
[
  {
    "title": "Pasta Carbonara",
    "description": "Classic Italian pasta dish",
    "ingredients": ["spaghetti", "eggs", "parmesan", "pancetta", "black pepper"],
    "instructions": [
      "Boil the pasta until al dente.",
      "Cook pancetta until crisp.",
      "Whisk eggs and parmesan together.",
      "Combine everything off heat and toss well."
    ],
    "cuisine": "Italian",
    "category": "Main Course",
    "prep_time": "10 minutes",
    "cook_time": "20 minutes",
    "total_time": "30 minutes",
    "servings": "4",
    "calories": 450
  }
]
```

### CSV format

CSV files are parsed by the backend using common recipe columns such as:

- `title`
- `ingredients`
- `directions`
- `source`
- `link`

The app will accept arrays encoded as JSON strings in the CSV fields when needed.

## Using the app

### Chat view

- Ask the assistant about ingredients, recipe ideas, meal planning, or cooking steps.
- The app retrieves the most relevant recipe chunks and sends them to the local Ollama model.
- Responses are streamed back in real time.

### Search view

- Enter a natural-language query like: “healthy vegetarian dinner”
- The app finds similar recipe chunks using embeddings and cosine similarity
- Results include matched text and similarity percentage

### Upload view

- Drag and drop a JSON or CSV file, or select one manually
- Optionally limit how many recipes are ingested
- Watch upload progress and final chunk counts as embeddings are stored

## API endpoints

### GET /

Health check endpoint. Returns service status and stored chunk count.

### POST /upload-recipes

Uploads a JSON or CSV recipe dataset and streams progress updates as it parses and embeds content.

### POST /search

Performs semantic search over the recipe chunks.

Request body:

```json
{
  "query": "quick chicken dinner",
  "top_k": 5
}
```

### POST /chat

Sends a chat message and returns a streamed AI response.

Request body:

```json
{
  "message": "What can I make with rice and eggs?",
  "top_k": 5
}
```

### DELETE /clear-data

Removes all recipe records from SQLite and all embeddings from ChromaDB.

## Notes

- The first time the app runs, `SentenceTransformer` downloads the embedding model automatically.
- ChromaDB persists recipe embeddings under `backend/chroma_data`.
- SQLite data is stored in `backend/recipes.db`.
- The app is designed to run locally; Ollama must be active for chat responses.

## Troubleshooting

### Ollama connection errors

If the chat feature says it cannot reach Ollama:

```bash
ollama serve
ollama pull gemma3:4b
```

### No recipes found

If search or chat returns no context, upload recipe data first through the Upload view.

### Frontend not loading

Ensure the frontend dependencies are installed and the backend is running.

```bash
cd frontend
npm install
npm run dev
```

## License

This project is provided as-is for local development and experimentation.

### CSV Format

A CSV file with the following columns: `title`, `ingredients`, `directions`, `link`, `source`, `NER`.

The `ingredients` and `directions` columns must contain JSON encoded arrays. This matches the format of the included `full_dataset.csv`. Example row:

```
title,ingredients,directions,link,source,NER
"Pasta Carbonara","[""spaghetti"", ""eggs"", ""parmesan""]","[""Boil pasta"", ""Mix ingredients""]","","","[""spaghetti"", ""eggs""]"
```

### Controlling Dataset Size

The upload interface provides a limit selector because the full dataset contains over 2 million recipes. Processing all of them would take a very long time. Available options:

| Limit  | Approximate Processing Time | Recommended For          |
|--------|----------------------------|--------------------------|
| 100    | Under 1 minute             | Quick test               |
| 500    | 2 to 5 minutes             | Small collection         |
| 1,000  | 5 to 10 minutes            | Moderate collection      |
| 5,000  | 15 to 30 minutes           | Large collection         |
| All    | Several hours              | Full dataset (advanced)  |

---

## Running the Application

### Step 1: Start Ollama

Open a terminal and start the Ollama service. This must remain running for the chat feature to work.

```
ollama serve
```

### Step 2: Start the backend server

Open a second terminal, navigate to the backend directory, and start the FastAPI server.

On Windows:

```
cd Recipe_Assistant\backend
python -m uvicorn main:app --reload --port 8000
```

On macOS and Linux:

```
cd Recipe_Assistant/backend
python -m uvicorn main:app --reload --port 8000
```

You should see output similar to:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
INFO:     Application startup complete.
```

The `--reload` flag enables automatic server restart when you modify backend files. This is useful during development. Remove it in production.

### Step 3: Open the application

Open your web browser and navigate to:

```
http://localhost:8000/app/index.html
```

The frontend is served as static files by FastAPI, so no separate web server is needed — as long as you've run `npm run build` in `frontend/` at least once (see [Installation, Step 5](#installation)). If you're using `npm run dev` instead, open `http://localhost:5173` for the hot-reloading version.

---

## Using the Application

The interface has three sections accessible from the sidebar.

### Upload

This is where you load recipe data into the system. Before you can chat or search, you must upload at least one dataset.

1. Click "Upload" in the sidebar
2. Select the maximum number of recipes to load from the dropdown
3. Click "Choose File" or drag and drop a JSON or CSV file onto the upload area
4. The progress bar will show three phases:
   a. Parsing: reading the file and storing recipes in SQLite
   b. Embedding: generating vector embeddings for each recipe chunk
   c. Storing: saving embeddings to ChromaDB
5. Once complete, a success message shows the number of recipes and chunks created

Each recipe is split into up to three chunks before embedding: an overview chunk (title, description, metadata), an ingredients chunk, and an instructions chunk. This allows the search to match on specific aspects of a recipe rather than the recipe as a whole.

### Chat

The chat interface provides a conversational experience powered by the RAG pipeline.

1. Click "Chat" in the sidebar
2. Type your question in the text field at the bottom
3. Press Enter or click the send button
4. The AI response streams in real time, token by token

Example questions you can ask:

```
What recipes can I make with chicken and rice?
Show me a quick pasta recipe under 30 minutes.
What are some vegetarian dinner ideas?
How do I make chocolate chip cookies?
What can I substitute for butter in baking?
```

The system retrieves the five most relevant recipe chunks from the database, includes them as context in the prompt, and sends it to the Gemma 3:4b model running on Ollama. If no recipes match the query, the model falls back to general cooking knowledge.

### Search

Semantic search lets you find recipes by meaning rather than exact keyword matching.

1. Click "Search" in the sidebar
2. Enter a natural language query
3. Click Search
4. Results appear as cards showing the matched text, recipe title, chunk type (overview, ingredients, or instructions), and a similarity score

For example, searching "healthy low calorie salad" will find recipes whose descriptions, ingredients, or instructions are semantically related to that concept, even if they do not contain those exact words.

---

## API Reference

The backend exposes the following HTTP endpoints. All are accessible at `http://localhost:8000`.

### GET /

Health check endpoint. Returns the current status and the number of stored chunks.

**Response:**

```json
{
  "message": "Recipe Assistant API is running",
  "chunks_stored": 300
}
```

### POST /upload-recipes

Upload a JSON or CSV file of recipes. Streams Server Sent Events (SSE) to report progress.

**Query Parameters:**

| Parameter | Type | Default | Description                           |
|-----------|------|---------|---------------------------------------|
| limit     | int  | 0       | Maximum recipes to process (0 = all)  |

**Request:** Multipart form upload with a `file` field.

**Response:** SSE stream with JSON events:

Progress event:

```json
{
  "type": "progress",
  "phase": "embedding",
  "current": 150,
  "total": 300,
  "percent": 50.0,
  "detail": "Embedded 150/300 chunks"
}
```

Done event:

```json
{
  "type": "done",
  "message": "Successfully ingested 100 recipe(s).",
  "chunks_created": 300,
  "total_chunks": 300
}
```

### POST /search

Perform semantic similarity search over stored recipe chunks.

**Request body:**

```json
{
  "query": "quick chicken dinner",
  "top_k": 5
}
```

**Response:**

```json
{
  "query": "quick chicken dinner",
  "results": [
    {
      "text": "Recipe: Chicken Stir Fry\nCook Time: 15 minutes",
      "metadata": {
        "recipe_id": 42,
        "chunk_type": "overview",
        "title": "Chicken Stir Fry"
      },
      "similarity": 0.7823
    }
  ]
}
```

### POST /chat

Send a message to the RAG chat pipeline. The response streams as plain text.

**Request body:**

```json
{
  "message": "How do I make pancakes?",
  "top_k": 5
}
```

**Response:** Streamed plain text, token by token.

### DELETE /clear-data

Delete all recipes from SQLite and all embeddings from ChromaDB.

**Response:**

```json
{
  "message": "Cleared 100 recipes and all embeddings.",
  "chunks_remaining": 0
}
```

---

## How the RAG Pipeline Works

RAG (Retrieval Augmented Generation) is a technique that improves language model responses by providing relevant context from a knowledge base. Here is the step by step process used in this application.

### 1. Data Ingestion

When you upload a recipe file:

1. The file is parsed (JSON is loaded directly; CSV rows have their JSON encoded `ingredients` and `directions` fields decoded).
2. Each recipe is stored in the SQLite database as a structured row.
3. Each recipe is split into chunks. A recipe with title, ingredients, and instructions produces three chunks. A recipe with only a title produces one chunk.
4. All chunk texts are passed through the `all-MiniLM-L6-v2` embedding model in batches of 64. Each chunk is converted into a 384 dimensional vector.
5. The vectors, along with the original text and metadata, are stored in ChromaDB.

### 2. Query Processing

When you send a chat message or perform a search:

1. Your query text is embedded using the same `all-MiniLM-L6-v2` model.
2. ChromaDB performs a cosine similarity comparison between your query vector and all stored chunk vectors.
3. The top 5 most similar chunks are retrieved along with their original text and metadata.

### 3. Response Generation (Chat only)

For the chat endpoint:

1. The retrieved chunks are combined into a context block.
2. A prompt is constructed that includes a system message (defining the assistant's personality and formatting rules), the context block, and the user's question.
3. This prompt is sent to the Gemma 3:4b model running on Ollama via the `/api/chat` endpoint.
4. The model generates a response token by token, which is streamed back through FastAPI to the frontend.
5. The frontend renders each token as it arrives, creating a real time typing effect.

### 4. Chunking Strategy

Recipes are broken into separate chunks because embedding models have limited context windows and perform better on focused text. The three chunk types are:

**Overview chunk:** Contains the recipe title, description, cuisine, category, cooking times, servings, and calories. This chunk helps match queries about recipe types, dietary categories, or time constraints.

**Ingredients chunk:** Contains the full ingredients list prefixed with the recipe title. This chunk helps match queries about specific ingredients or what you can make with what you have.

**Instructions chunk:** Contains the step by step cooking instructions prefixed with the recipe title. This chunk helps match queries about cooking techniques or how to prepare something.

---

## Data Management

### Viewing stored data

The health check endpoint at `http://localhost:8000/` shows the current chunk count. The sidebar in the frontend also displays a live status indicator with the chunk count.

### Clearing all data

Option 1: Use the API endpoint.

```
curl -X DELETE http://localhost:8000/clear-data
```

On Windows PowerShell:

```
Invoke-RestMethod -Method DELETE -Uri "http://localhost:8000/clear-data"
```

Option 2: Delete files manually. Stop the backend server first, then delete:

```
Recipe_Assistant/backend/recipes.db
Recipe_Assistant/backend/chroma_data/
```

Both files are recreated automatically when the server starts again.

### Adding more data

You can upload multiple files. Each upload adds to the existing data rather than replacing it. If you want to start fresh, clear the data first and then upload again.

---

## Troubleshooting

### The backend fails to start

Ensure all dependencies are installed: `pip install -r requirements.txt`. If you see import errors, verify that you are using Python 3.10 or higher and that your virtual environment is activated.

### Chat returns a connection error

The chat feature requires Ollama to be running with the Gemma 3:4b model pulled. Verify by running:

```
ollama list
```

You should see `gemma3:4b` in the output. If not, run `ollama pull gemma3:4b`. If Ollama is not running, start it with `ollama serve`.

### Embedding model download is slow

The `all-MiniLM-L6-v2` model is approximately 80 MB and downloads from Hugging Face on first run. If the download is slow, check your internet connection. The model is cached locally after the first download and will not need to be downloaded again.

### Upload is taking too long

Reduce the recipe limit. Processing time scales linearly with the number of recipes. Start with 100 for testing, then increase once you have confirmed everything works.

### Search returns no results

You must upload recipes before searching. Check the status indicator in the sidebar. If it shows "0 chunks", no data has been uploaded yet.

### ChromaDB telemetry warnings

You may see messages like "Failed to send telemetry event". These are harmless warnings from ChromaDB's usage analytics and do not affect functionality.

### The `/app` page is blank, or returns a 404

FastAPI only serves the frontend if `frontend/dist/` exists. Build it first:

```
cd frontend
npm install
npm run build
```

Then restart (or just refresh — no server restart is needed for static files).

### Port 8000 is already in use

If another application is using port 8000, specify a different port:

```
python -m uvicorn main:app --reload --port 8001
```

Then access the application at `http://localhost:8001/app/index.html`.
