// ════════════════════════════════════════════════════════════════════
// Recipe Assistant — API client
// In dev (vite dev server) the backend runs separately on :8000.
// In production the built app is served by FastAPI itself, same origin.
// ════════════════════════════════════════════════════════════════════

export const API_BASE = import.meta.env.DEV ? "http://localhost:8000" : "";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/`);
  if (!res.ok) throw new Error("Backend offline");
  return res.json();
}

/** Streams a chat response, calling onChunk(text) for every piece received. */
export async function streamChat(message, onChunk, { signal } = {}) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, top_k: 5 }),
    signal,
  });

  if (!res.ok) throw new Error(`Server error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }

  return full;
}

/** Uploads a recipes file, calling onEvent(evt) for every SSE progress/done event. */
export async function uploadRecipes(file, limit, onEvent) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload-recipes?limit=${limit}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let detail = "Upload failed.";
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;
      try {
        onEvent(JSON.parse(jsonStr));
      } catch {
        /* ignore malformed event */
      }
    }
  }
}

export async function searchRecipes(query, top_k = 5) {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Search failed.");
  return data;
}
