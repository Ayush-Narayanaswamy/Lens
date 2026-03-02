import { useEffect, useMemo, useState } from "react";
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

export function PopupApp(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const riskTone = useMemo(() => {
    if (!result) return "--";
    return result.scores.risk;
  }, [result]);

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
  }, [result, error]);

  const onAnalyze = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const analyzed = await runtimeCall<AnalysisResult>({ type: "RUN_ANALYSIS" });
      setResult(analyzed);
    } catch (err) {
      setError((err as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const explanationSourceLabel =
    result?.explanationSource === "ollama-cloud"
      ? "Explanation source: Ollama Cloud"
      : result?.explanationSource === "ollama-local"
        ? "Explanation source: Ollama Local"
        : result?.explanationSource === "local-only"
          ? "Explanation source: Local fallback"
          : "Explanation source: Pending";

  const callStatusLabel =
    result?.aiMeta?.callStatus === "success"
      ? "AI call status: Success"
      : result?.aiMeta?.callStatus === "fallback"
        ? "AI call status: Fallback used"
        : "AI call status: Pending";

  return (
    <div className="page" data-scrollable="true">
      <section className="hero" data-reveal="true">
        <h1 className="title">Lens</h1>
        <p className="subtitle">Modern assistive checks for reliability, bias, and manipulation cues.</p>
      </section>

      <section className="card stack fade-in" data-reveal="true">
        <div className="row">
          <span className="pill">Risk: {riskTone}</span>
          <button className="button" onClick={onAnalyze} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze this page"}
          </button>
        </div>
        <p className="small">Assistive signal only — always verify major claims independently.</p>
      </section>

      {error ? (
        <section className="card" data-reveal="true">
          <p className="small">{error}</p>
        </section>
      ) : null}

      {result ? (
        <>
          <section className="card stack" data-reveal="true">
            <div className="grid-3">
              <div className="metric">
                <div className="metric-label">Reliability</div>
                <div className="metric-value">{result.scores.reliability}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Bias</div>
                <div className="metric-value">{result.scores.bias}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Confidence</div>
                <div className="metric-value">{result.scores.confidence}</div>
              </div>
            </div>
            <p className="small">{result.summary}</p>
            <p className="small">{explanationSourceLabel}</p>
            <p className="small">{callStatusLabel}</p>
            {result.aiMeta ? (
              <p className="small">
                Model: {result.aiMeta.model} • Host: {result.aiMeta.endpointHost}
                {result.aiMeta.requestId ? ` • Request ID: ${result.aiMeta.requestId}` : ""}
              </p>
            ) : null}
          </section>

          <section className="card stack" data-reveal="true">
            <h2 className="title" style={{ fontSize: 14, margin: 0 }}>
              Why flagged?
            </h2>
            <ul className="list">
              {result.reasons.map((reason) => (
                <li className="list-item" key={`${reason.signal}-${reason.detail}`}>
                  <strong>{reason.signal}</strong>
                  <p className="small">{reason.detail}</p>
                </li>
              ))}
            </ul>
            {result.aiExplanation ? <p className="small">{result.aiExplanation}</p> : null}
          </section>

          <section className="card row" data-reveal="true">
            <button className="button secondary" onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("history.html") })}>
              View History
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
