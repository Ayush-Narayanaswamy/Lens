import { useEffect, useState } from "react";
import { AnalysisResult, RuntimeMessage } from "../shared/types";

function runtimeCall<T>(message: RuntimeMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: { ok: boolean; data?: T; error?: string }) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error ?? "Request failed"));
        return;
      }
      resolve(response.data as T);
    });
  });
}

export function HistoryApp(): JSX.Element {
  const [items, setItems] = useState<AnalysisResult[]>([]);
  const [status, setStatus] = useState("Loading history...");

  const loadHistory = async (): Promise<void> => {
    try {
      const history = await runtimeCall<AnalysisResult[]>({ type: "GET_HISTORY" });
      setItems(history);
      setStatus(history.length ? "" : "No analyses yet.");
    } catch (error) {
      setStatus(String(error));
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal='true']"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        }
      },
      { threshold: 0.1 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [items.length, status]);

  const removeItem = async (id: string): Promise<void> => {
    try {
      const next = await runtimeCall<AnalysisResult[]>({ type: "DELETE_HISTORY_ITEM", payload: { id } });
      setItems(next);
      if (!next.length) setStatus("No analyses yet.");
    } catch (error) {
      setStatus(String(error));
    }
  };

  const clearAll = async (): Promise<void> => {
    try {
      await runtimeCall<AnalysisResult[]>({ type: "CLEAR_HISTORY" });
      setItems([]);
      setStatus("No analyses yet.");
    } catch (error) {
      setStatus(String(error));
    }
  };

  return (
    <div className="page" style={{ maxHeight: "none", minHeight: "100vh" }}>
      <section className="hero row" data-reveal="true">
        <div>
          <h1 className="title">Analysis History</h1>
          <p className="subtitle">Recent pages checked by CredLens.</p>
        </div>
        <button className="button secondary" onClick={clearAll}>
          Clear all
        </button>
      </section>

      {status ? <section className="card small" data-reveal="true">{status}</section> : null}

      <section className="stack">
        {items.map((item) => (
          <article className="card" key={item.id} data-reveal="true">
            <div className="row">
              <strong>{item.page.title || item.page.domain}</strong>
              <span className="pill">{item.scores.risk}</span>
            </div>
            <p className="small">{item.page.url}</p>
            <p className="small">
              Reliability {item.scores.reliability} • Bias {item.scores.bias}% • Confidence {item.scores.confidence}
            </p>
            <div className="row">
              <span className="small">{new Date(item.createdAt).toLocaleString()}</span>
              <button className="button secondary" onClick={() => removeItem(item.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
