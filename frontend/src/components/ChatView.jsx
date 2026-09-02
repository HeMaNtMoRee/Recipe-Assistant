import { useEffect, useRef, useState } from "react";
import ViewHeader from "./ViewHeader";
import Message from "./Message";
import { SendIcon } from "./icons";
import { streamChat } from "../api";
import "./ChatView.css";

const WELCOME = {
  id: "welcome",
  role: "bot",
  text:
    "Hey there, chef! I'm your AI recipe assistant. I can help you with:\n\n" +
    "- Finding recipes by ingredients or cuisine\n" +
    "- Quick meals under a time limit\n" +
    "- Step-by-step cooking instructions\n" +
    "- Cooking tips and substitutions\n\n" +
    'Try asking: *"Show me pasta recipes under 30 minutes"* or *"What can I make with chicken and rice?"*',
};

export default function ChatView({ onToggleSidebar }) {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const idCounter = useRef(1);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    const userId = idCounter.current++;
    const botId = idCounter.current++;

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", text },
      { id: botId, role: "bot", text: "", typing: true },
    ]);
    setInput("");
    setIsStreaming(true);

    try {
      await streamChat(text, (fullText) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { ...m, text: fullText, typing: false } : m))
        );
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId && !m.text
            ? { ...m, text: "No response received.", typing: false }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId
            ? {
                ...m,
                text: `${err.message}. Make sure the backend is running.`,
                typing: false,
                error: true,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <section className="view">
      <ViewHeader
        title="Recipe Chat"
        subtitle="Ask me anything about cooking!"
        onToggleSidebar={onToggleSidebar}
      />

      <div className="chat-container" ref={containerRef}>
        {messages.map((m) => (
          <Message key={m.id} role={m.role} text={m.text} typing={m.typing} error={m.error} />
        ))}
      </div>

      <form className="chat-input-area" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about a recipe…"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" className="send-btn" disabled={isStreaming} title="Send">
            <SendIcon width={17} height={17} />
          </button>
        </div>
      </form>
    </section>
  );
}
