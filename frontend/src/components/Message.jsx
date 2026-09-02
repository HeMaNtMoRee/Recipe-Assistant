import { formatMarkdown, escapeHtml } from "../utils/markdown";

export default function Message({ role, text, typing, error }) {
  const isUser = role === "user";

  let html;
  if (typing) {
    html = null;
  } else if (isUser) {
    html = escapeHtml(text);
  } else {
    html = formatMarkdown(text);
  }

  return (
    <div className={`message message--${role}`}>
      <div className="message__avatar">{isUser ? "you" : "ai"}</div>
      <div className={`message__bubble${error ? " message__bubble--error" : ""}`}>
        {typing ? (
          <span className="typing">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  );
}
