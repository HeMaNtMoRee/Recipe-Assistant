"""RAG pipeline – talks to a local Ollama instance running Gemma 3:4b."""

import httpx
import json
from typing import AsyncGenerator

OLLAMA_BASE_URL = "http://localhost:11434"
MODEL_NAME = "gemma3:4b"

SYSTEM_PROMPT = """You are a friendly and expert recipe assistant. You help users find recipes, answer cooking questions, and provide detailed guidance about ingredients, cooking techniques, and meal planning.

When answering, use the provided recipe context to give accurate, specific answers. Format your responses nicely:
- Use **bold** for recipe names and important terms
- Use bullet points for ingredient lists
- Use numbered steps for instructions
- Include cooking times and serving info when available

If the context doesn't contain relevant recipes, say so honestly and offer general cooking advice instead. Always be helpful, warm, and encouraging to home cooks of all skill levels."""


def build_rag_prompt(user_message: str, context_chunks: list[str]) -> str:
    """Combine retrieved context with the user query into a prompt."""
    if context_chunks:
        context_block = "\n\n---\n\n".join(c for c in context_chunks if c)
        return (
            f"Here is relevant recipe information from my database:\n\n"
            f"{context_block}\n\n"
            f"---\n\n"
            f"User question: {user_message}\n\n"
            f"Please answer the user's question using the recipe information above. "
            f"If the information doesn't fully answer the question, supplement with your general cooking knowledge."
        )
    else:
        return (
            f"User question: {user_message}\n\n"
            f"I don't have specific recipes matching this query in my database. "
            f"Please provide helpful general cooking advice."
        )


async def stream_chat_response(
    user_message: str, context_chunks: list[str]
) -> AsyncGenerator[str, None]:
    """Stream tokens from the Ollama API."""
    prompt = build_rag_prompt(user_message, context_chunks)

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "stream": True,
        "options": {
            "num_predict": 2048  # Adjust this to increase or decrease the response length
        }
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        token = data.get("message", {}).get("content", "")
                        if token:
                            yield token
                        if data.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue
    except httpx.ConnectError:
        yield "\n\**Error**: Could not connect to Ollama. Make sure Ollama is running (`ollama serve`) and the Gemma 3:4b model is pulled (`ollama pull gemma3:4b`)."
    except httpx.HTTPStatusError as e:
        yield f"\n\n**Error**: Ollama returned status {e.response.status_code}."
    except Exception as e:
        yield f"\n\n**Error**: {str(e)}"
