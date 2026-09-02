import { useRef, useState } from "react";
import ViewHeader from "./ViewHeader";
import { UploadIcon, CheckIcon, AlertIcon } from "./icons";
import { uploadRecipes } from "../api";
import "./UploadView.css";

const PHASE_LABELS = {
  preparing: "Preparing",
  parsing: "Parsing recipes",
  embedding: "Generating embeddings",
  storing: "Storing in vector DB",
  complete: "Complete",
};

export default function UploadView({ onToggleSidebar, onUploaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [limit, setLimit] = useState("100");
  const [progress, setProgress] = useState(null); // { phase, pct, detail }
  const [result, setResult] = useState(null); // { message, success }
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleZoneClick(e) {
    if (e.target.closest(".limit-control") || e.target.closest(".btn-primary")) return;
    fileInputRef.current?.click();
  }

  function handleFileInputChange() {
    const file = fileInputRef.current?.files?.[0];
    if (file) handleFile(file);
  }

  async function handleFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["json", "csv"].includes(ext)) {
      setResult({ message: "Only .json and .csv files are supported.", success: false });
      return;
    }

    setResult(null);
    setProgress({ phase: "preparing", pct: 0, detail: "Starting upload…" });

    try {
      await uploadRecipes(file, limit || "0", (evt) => {
        if (evt.type === "progress") {
          let overallPct = 0;
          if (evt.phase === "parsing") overallPct = evt.percent * 0.4;
          else if (evt.phase === "embedding") overallPct = 40 + evt.percent * 0.45;
          else if (evt.phase === "storing") overallPct = 85 + evt.percent * 0.15;

          setProgress({
            phase: evt.phase,
            pct: Math.round(overallPct),
            detail: evt.detail || "",
          });
        } else if (evt.type === "done") {
          setProgress({ phase: "complete", pct: 100, detail: "Done!" });
          setTimeout(() => {
            setProgress(null);
            setResult({
              message: evt.message,
              chunksCreated: evt.chunks_created,
              totalChunks: evt.total_chunks,
              success: true,
            });
            onUploaded?.();
          }, 500);
        }
      });
    } catch (err) {
      setProgress(null);
      setResult({ message: err.message, success: false });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="view">
      <ViewHeader
        title="Upload Recipes"
        subtitle="Import your recipe collection"
        onToggleSidebar={onToggleSidebar}
      />

      <div className="upload-area">
        <div
          ref={dropZoneRef}
          className={`upload-card${dragOver ? " upload-card--drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={handleZoneClick}
        >
          <UploadIcon width={38} height={38} strokeWidth={1.4} />
          <h3>Drop your JSON or CSV file here</h3>
          <p>or click to browse</p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            hidden
            onChange={handleFileInputChange}
          />

          <div className="limit-control">
            <label htmlFor="recipe-limit">Max recipes to load:</label>
            <select
              id="recipe-limit"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            >
              <option value="100">100 (quick test)</option>
              <option value="500">500</option>
              <option value="1000">1,000</option>
              <option value="5000">5,000</option>
              <option value="0">All (may be slow)</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </button>
        </div>

        {progress && (
          <div className="upload-progress">
            <div className="progress-header">
              <span className="progress-phase">
                {PHASE_LABELS[progress.phase] || progress.phase}
              </span>
              <span className="progress-pct">{progress.pct}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
            </div>
            <p className="progress-detail">{progress.detail}</p>
          </div>
        )}

        {result && (
          <div className={`upload-result${result.success ? " upload-result--ok" : " upload-result--err"}`}>
            <span className="upload-result__icon">
              {result.success ? <CheckIcon width={16} height={16} /> : <AlertIcon width={16} height={16} />}
            </span>
            <div>
              <strong>{result.message}</strong>
              {result.success && (
                <p className="upload-result__meta">
                  Chunks created: {result.chunksCreated} · Total chunks in DB: {result.totalChunks}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
