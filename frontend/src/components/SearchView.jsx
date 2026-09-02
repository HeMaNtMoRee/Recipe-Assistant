import { useState } from "react";
import ViewHeader from "./ViewHeader";
import { searchRecipes } from "../api";
import "./SearchView.css";

export default function SearchView({ onToggleSidebar }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setStatus("loading");
    setResults(null);

    try {
      const data = await searchRecipes(q, 5);
      setResults(data.results || []);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  return (
    <section className="view">
      <ViewHeader
        title="Semantic Search"
        subtitle="Find recipes by meaning, not just keywords"
        onToggleSidebar={onToggleSidebar}
      />

      <div className="search-area">
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="e.g. healthy vegetarian dinner"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        <div className="search-results">
          {status === "loading" && <p className="search-hint">Searching…</p>}
          {status === "error" && <p className="search-hint search-hint--error">{errorMsg}</p>}
          {status === "idle" && results && results.length === 0 && (
            <p className="search-hint">No results found.</p>
          )}

          {results?.map((r, i) => (
            <div className="result-card" key={i} style={{ animationDelay: `${i * 40}ms` }}>
              <div className="result-card__meta">
                <span className="badge">{r.metadata?.chunk_type || "chunk"}</span>
                <span>{r.metadata?.title || ""}</span>
                <span className="result-card__score">
                  Similarity: {(r.similarity * 100).toFixed(1)}%
                </span>
              </div>
              <div className="result-card__body">{r.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
