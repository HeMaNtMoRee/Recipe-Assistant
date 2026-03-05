/* ════════════════════════════════════════════════════════════════════
   Recipe Assistant – Frontend Logic
   ════════════════════════════════════════════════════════════════════ */

const API_BASE = window.location.origin; // FastAPI serves on same origin

// ── DOM refs ──────────────────────────────────────────────────────────
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const chatForm = document.getElementById("chat-form");
const sendBtn = document.getElementById("send-btn");
const fileInput = document.getElementById("file-input");
const uploadDropZone = document.getElementById("upload-drop-zone");
const uploadProgress = document.getElementById("upload-progress");
const progressPhase = document.getElementById("progress-phase");
const progressPct = document.getElementById("progress-pct");
const progressFill = document.getElementById("progress-fill");
const progressDetail = document.getElementById("progress-detail");
const uploadResult = document.getElementById("upload-result");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const statusDot = document.querySelector(".dot");
const statusText = document.getElementById("status-text");

// ── Sidebar / view switching ─────────────────────────────────────────
function switchView(name) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(`view-${name}`).classList.add("active");
    document.getElementById(`btn-${name}`).classList.add("active");
    // close mobile sidebar
    document.getElementById("sidebar").classList.remove("open");
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
}

// ── Health check (sets status indicator) ─────────────────────────────
async function checkHealth() {
    try {
        const res = await fetch(`${API_BASE}/`);
        if (res.ok) {
            const data = await res.json();
            statusDot.classList.add("online");
            statusText.textContent = `Online · ${data.chunks_stored} chunks`;
        } else {
            throw new Error();
        }
    } catch {
        statusDot.classList.remove("online");
        statusText.textContent = "Backend offline";
    }
}
setInterval(checkHealth, 30000);
checkHealth();

// ════════════════════════════════════════════════════════════════════
//  CHAT
// ════════════════════════════════════════════════════════════════════

let isStreaming = false;

async function sendMessage(e) {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || isStreaming) return;

    appendMessage("user", text);
    chatInput.value = "";
    isStreaming = true;
    sendBtn.disabled = true;

    // Create bot bubble with typing indicator
    const { bubble } = appendMessage("bot", null, true);

    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, top_k: 5 }),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            bubble.innerHTML = formatMarkdown(fullText);
            scrollToBottom();
        }

        if (!fullText) {
            bubble.innerHTML = `<p style="color:var(--text-muted)">No response received.</p>`;
        }
    } catch (err) {
        bubble.innerHTML = `<p style="color:var(--error)">${err.message}. Make sure the backend is running.</p>`;
    } finally {
        isStreaming = false;
        sendBtn.disabled = false;
        chatInput.focus();
        scrollToBottom();
    }
}

function appendMessage(role, text, isTyping = false) {
    const row = document.createElement("div");
    row.className = `message ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "You" : "🤖";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (isTyping) {
        bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    } else {
        bubble.innerHTML = role === "user" ? escapeHtml(text) : formatMarkdown(text);
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatContainer.appendChild(row);
    scrollToBottom();
    return { row, bubble };
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ── Markdown-lite formatter ──────────────────────────────────────────
function formatMarkdown(raw) {
    if (!raw) return "";
    let html = escapeHtml(raw);

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    // Inline code
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");

    // Unordered lists (lines starting with - )
    html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

    // Ordered lists (lines starting with number. )
    html = html.replace(/^\d+\.\s(.+)$/gm, "<li>$1</li>");
    // wrap consecutive <li> not inside <ul> into <ol>
    html = html.replace(/(<li>(?:(?!<\/?[uo]l>).)*<\/li>\s*)+/g, (match) => {
        if (match.includes("<ul>")) return match;
        return `<ol>${match}</ol>`;
    });

    // Headings
    html = html.replace(/^### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^## (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>");

    // Paragraphs – split on double newlines
    html = html
        .split(/\n{2,}/)
        .map(block => {
            block = block.trim();
            if (!block) return "";
            if (/^<[huo]/.test(block)) return block;
            return `<p>${block.replace(/\n/g, "<br>")}</p>`;
        })
        .join("\n");

    return html;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ════════════════════════════════════════════════════════════════════
//  UPLOAD
// ════════════════════════════════════════════════════════════════════

// Drag & drop
uploadDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadDropZone.classList.add("dragover");
});
uploadDropZone.addEventListener("dragleave", () => {
    uploadDropZone.classList.remove("dragover");
});
uploadDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadDropZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
});
uploadDropZone.addEventListener("click", (e) => {
    // Don't open file browser when clicking the limit dropdown or the Choose File button
    if (e.target.closest(".limit-control") || e.target.closest(".btn-primary")) return;
    fileInput.click();
});
fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) uploadFile(fileInput.files[0]);
});

const PHASE_LABELS = {
    preparing: "📦 Preparing",
    parsing: "📄 Parsing Recipes",
    embedding: "🧠 Generating Embeddings",
    storing: "💾 Storing in Vector DB",
    complete: "✅ Complete",
};

function updateProgressBar(phase, percent, detail) {
    progressPhase.textContent = PHASE_LABELS[phase] || phase;
    progressPct.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    progressDetail.textContent = detail || "";
}

async function uploadFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["json", "csv"].includes(ext)) {
        showUploadResult("Only .json and .csv files are supported.", false);
        return;
    }

    const limit = document.getElementById("recipe-limit").value || "0";

    // Show progress bar, hide previous result
    uploadProgress.style.display = "block";
    uploadResult.style.display = "none";
    updateProgressBar("preparing", 0, "Starting upload…");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch(`${API_BASE}/upload-recipes?limit=${limit}`, {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json();
            showUploadResult(`${err.detail || "Upload failed."}`, false);
            uploadProgress.style.display = "none";
            return;
        }

        // Read SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop(); // keep incomplete line in buffer

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;

                try {
                    const evt = JSON.parse(jsonStr);

                    if (evt.type === "progress") {
                        // Weighted overall: parsing=0-40%, embedding=40-85%, storing=85-100%
                        let overallPct = 0;
                        if (evt.phase === "parsing") {
                            overallPct = evt.percent * 0.4;
                        } else if (evt.phase === "embedding") {
                            overallPct = 40 + evt.percent * 0.45;
                        } else if (evt.phase === "storing") {
                            overallPct = 85 + evt.percent * 0.15;
                        }
                        updateProgressBar(evt.phase, Math.round(overallPct), evt.detail);

                    } else if (evt.type === "done") {
                        updateProgressBar("complete", 100, "Done!");
                        setTimeout(() => {
                            uploadProgress.style.display = "none";
                            showUploadResult(
                                `<strong>${evt.message}</strong><br>Chunks created: ${evt.chunks_created}<br>Total chunks in DB: ${evt.total_chunks}`,
                                true
                            );
                            checkHealth();
                        }, 600);
                    }
                } catch { /* ignore parse errors */ }
            }
        }
    } catch (err) {
        showUploadResult(`${err.message}`, false);
        uploadProgress.style.display = "none";
    }
}

function showUploadResult(html, success) {
    uploadResult.innerHTML = html;
    uploadResult.className = `upload-result ${success ? "success" : "error"}`;
    uploadResult.style.display = "block";
}

// ════════════════════════════════════════════════════════════════════
//  SEARCH
// ════════════════════════════════════════════════════════════════════

async function performSearch(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    searchResults.innerHTML = `<p style="color:var(--text-secondary)">Searching…</p>`;

    try {
        const res = await fetch(`${API_BASE}/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, top_k: 5 }),
        });
        const data = await res.json();

        if (!res.ok) {
            searchResults.innerHTML = `<p style="color:var(--error)">${data.detail || "Search failed."}</p>`;
            return;
        }

        if (!data.results || data.results.length === 0) {
            searchResults.innerHTML = `<p style="color:var(--text-muted)">No results found.</p>`;
            return;
        }

        searchResults.innerHTML = data.results
            .map(
                (r, i) => `
        <div class="result-card">
          <div class="meta">
            <span class="badge">${r.metadata.chunk_type || "chunk"}</span>
            <span>${r.metadata.title || ""}</span>
            <span>Similarity: ${(r.similarity * 100).toFixed(1)}%</span>
          </div>
          <div class="body">${escapeHtml(r.text)}</div>
        </div>`
            )
            .join("");
    } catch (err) {
        searchResults.innerHTML = `<p style="color:var(--error)">${err.message}</p>`;
    }
}

// ── Keyboard shortcut: Enter to send ─────────────────────────────────
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event("submit"));
    }
});
