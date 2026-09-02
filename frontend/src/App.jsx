import { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import UploadView from "./components/UploadView";
import SearchView from "./components/SearchView";
import { fetchHealth } from "./api";
import "./App.css";

export default function App() {
  const [view, setView] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState({ online: false, text: "Connecting…" });

  const checkHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setStatus({ online: true, text: `Online · ${data.chunks_stored} chunks` });
    } catch {
      setStatus({ online: false, text: "Backend offline" });
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 30000);
    return () => clearInterval(id);
  }, [checkHealth]);

  function handleNavigate(next) {
    setView(next);
    setSidebarOpen(false);
  }

  return (
    <div className="app">
      {sidebarOpen && <div className="app__scrim" onClick={() => setSidebarOpen(false)} />}

      <Sidebar view={view} onNavigate={handleNavigate} open={sidebarOpen} status={status} />

      <main className="app__main">
        {view === "chat" && (
          <ChatView onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        )}
        {view === "upload" && (
          <UploadView
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onUploaded={checkHealth}
          />
        )}
        {view === "search" && (
          <SearchView onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        )}
      </main>
    </div>
  );
}
