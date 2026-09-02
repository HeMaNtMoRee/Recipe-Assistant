"""ChromaDB vector store for recipe embeddings."""

import chromadb

COLLECTION_NAME = "recipe_chunks"

_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None


def get_client() -> chromadb.ClientAPI:
    """Return a persistent ChromaDB client."""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path="./chroma_data")
    return _client


def get_collection() -> chromadb.Collection:
    """Return (or create) the recipe_chunks collection."""
    global _collection
    if _collection is None:
        client = get_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def add_chunks(ids: list[str], embeddings: list[list[float]],
               documents: list[str], metadatas: list[dict]):
    """Upsert chunks into the vector store."""
    collection = get_collection()
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def search(query_embedding: list[float], top_k: int = 5) -> dict:
    """Query the vector store and return top-k results."""
    collection = get_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )
    return results


def get_chunk_count() -> int:
    """Return the total number of chunks stored."""
    return get_collection().count()


def clear_all():
    """Delete the collection and recreate it (wipes all embeddings)."""
    global _collection
    client = get_client()
    client.delete_collection(COLLECTION_NAME)
    _collection = None
    get_collection()  # recreate empty collection