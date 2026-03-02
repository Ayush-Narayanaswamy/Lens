import { analyzeLocally } from "../analysis/heuristics";
import { clearHistory, deleteHistoryItem, getHistory, prependHistory } from "../shared/storage";
import { AnalysisResult, PagePayload, RuntimeMessage } from "../shared/types";

interface RuntimeReply {
  ok: boolean;
  data?: unknown;
  error?: string;
}

interface AiRateState {
  day: string;
  count: number;
  lastRequestAt: number;
}

const HISTORY_LIMIT = 50;
const OLLAMA_BASE_URL = (import.meta.env.VITE_OLLAMA_BASE_URL ?? "http://localhost:11434").trim();
const OLLAMA_MODEL = (import.meta.env.VITE_OLLAMA_MODEL ?? "llama3.1:8b").trim();
const OLLAMA_API_KEY = (import.meta.env.VITE_OLLAMA_API_KEY ?? "").trim();
const OLLAMA_PATH = (import.meta.env.VITE_OLLAMA_PATH ?? "/api/generate").trim();
const AI_DAILY_LIMIT = Number(import.meta.env.VITE_AI_DAILY_LIMIT ?? "5");
const AI_COOLDOWN_SECONDS = Number(import.meta.env.VITE_AI_COOLDOWN_SECONDS ?? "60");
const ALLOWED_CLOUD_MODELS = (import.meta.env.VITE_ALLOWED_CLOUD_MODELS ?? "gemma3:4b")
  .split(",")
  .map((model: string) => model.trim())
  .filter(Boolean);
const AI_RATE_KEY = "lens_ai_rate";

chrome.runtime.onInstalled.addListener(() => {
  const sidePanelApi = chrome.sidePanel as
    | {
        setPanelBehavior?: (options: { openPanelOnActionClick: boolean }) => Promise<void>;
      }
    | undefined;

  void sidePanelApi?.setPanelBehavior?.({ openPanelOnActionClick: true });
});

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  const url = tab.url ?? "";
  const unsupported =
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("view-source:");

  if (unsupported) {
    throw new Error("This page type cannot be analyzed. Open a normal http/https webpage.");
  }

  return tab.id;
}

async function extractActivePage(): Promise<PagePayload> {
  const tabId = await getActiveTabId();
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "EXTRACT_PAGE" });
    if (response?.ok) {
      return response.payload as PagePayload;
    }
  } catch {
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });

  const retried = await chrome.tabs.sendMessage(tabId, { type: "EXTRACT_PAGE" });
  if (!retried?.ok) {
    throw new Error(retried?.error ?? "Failed to extract page content after reconnect.");
  }
  return retried.payload as PagePayload;
}

function getUtcDayLabel(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getAiRateState(): Promise<AiRateState> {
  const raw = await chrome.storage.local.get(AI_RATE_KEY);
  const saved = raw[AI_RATE_KEY] as AiRateState | undefined;
  const today = getUtcDayLabel();

  return saved && saved.day === today
    ? saved
    : {
        day: today,
        count: 0,
        lastRequestAt: 0
      };
}

async function canCallAi(): Promise<{ allowed: boolean; reason?: string }> {
  if (!OLLAMA_BASE_URL || !OLLAMA_MODEL) {
    return { allowed: false, reason: "AI explanation unavailable (.env Ollama config missing)." };
  }

  if (OLLAMA_BASE_URL.includes("ollama.com") && !ALLOWED_CLOUD_MODELS.includes(OLLAMA_MODEL)) {
    return {
      allowed: false,
      reason: `Model '${OLLAMA_MODEL}' is blocked by budget guard. Allowed: ${ALLOWED_CLOUD_MODELS.join(", ")}`
    };
  }

  const now = Date.now();
  const state = await getAiRateState();

  if (state.count >= AI_DAILY_LIMIT) {
    return { allowed: false, reason: `AI daily limit reached (${AI_DAILY_LIMIT}/day).` };
  }

  const cooldownMs = AI_COOLDOWN_SECONDS * 1000;
  if (state.lastRequestAt > 0 && now - state.lastRequestAt < cooldownMs) {
    return {
      allowed: false,
      reason: `AI cooling down. Try again in ${Math.ceil((cooldownMs - (now - state.lastRequestAt)) / 1000)}s.`
    };
  }

  return { allowed: true };
}

async function recordAiUsage(): Promise<void> {
  const state = await getAiRateState();
  const nextState: AiRateState = {
    day: state.day,
    count: state.count + 1,
    lastRequestAt: Date.now()
  };

  await chrome.storage.local.set({ [AI_RATE_KEY]: nextState });
}

function formatAiPrompt(result: AnalysisResult): string {
  const reasonBlock = result.reasons
    .map((reason, index) => `${index + 1}. ${reason.signal}: ${reason.detail}`)
    .join("\n");

  return [
    "You are helping summarize webpage credibility signals.",
    "Do not claim definitive truth. Keep a neutral, assistive tone.",
    `Page title: ${result.page.title}`,
    `Domain: ${result.page.domain}`,
    `Reliability score: ${result.scores.reliability}/100`,
    `Bias score: ${result.scores.bias}/100`,
    `Risk level: ${result.scores.risk}`,
    "Signals:",
    reasonBlock,
    "Write a concise explanation with:",
    "- Why this page was flagged",
    "- What the user should verify next",
    "Limit to 100 words."
  ].join("\n");
}

function getEndpointHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function getAiExplanationWithMeta(result: AnalysisResult): Promise<{ text: string; requestId?: string; endpointHost: string; model: string }> {
  const quota = await canCallAi();
  if (!quota.allowed) {
    throw new Error(quota.reason ?? "AI unavailable.");
  }

  const prompt = formatAiPrompt(result);
  const normalizedPath = OLLAMA_PATH.startsWith("/") ? OLLAMA_PATH : `/${OLLAMA_PATH}`;
  const endpoint = `${OLLAMA_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (OLLAMA_API_KEY) {
    headers.Authorization = `Bearer ${OLLAMA_API_KEY}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 120
        }
      })
    });
  } catch (error) {
    const message = String(error);
    if (message.includes("AbortError")) {
      throw new Error(`Ollama request timed out (15s) at ${endpoint}.`);
    }
    if (OLLAMA_BASE_URL.includes("localhost") || OLLAMA_BASE_URL.includes("127.0.0.1")) {
      throw new Error(`Cannot reach local Ollama at ${endpoint}. Start Ollama with 'ollama serve' and ensure model '${OLLAMA_MODEL}' is pulled.`);
    }
    throw new Error(`Cannot reach AI endpoint at ${endpoint}. Check VITE_OLLAMA_BASE_URL and network access.`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 429) {
      throw new Error("Ollama/API quota exceeded (429). Try later or lower request frequency.");
    }
    throw new Error(`Ollama error (${response.status})${errorBody ? `: ${errorBody.slice(0, 160)}` : ""}`);
  }

  const data = (await response.json()) as { response?: string };
  const text = data.response?.trim();
  if (!text) {
    throw new Error("Ollama returned an empty explanation.");
  }

  await recordAiUsage();
  return {
    text,
    requestId: response.headers.get("x-request-id") ?? undefined,
    endpointHost: getEndpointHost(endpoint),
    model: OLLAMA_MODEL
  };
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse: (response: RuntimeReply) => void) => {
  void (async () => {
    try {
      switch (message.type) {
        case "RUN_ANALYSIS": {
          const page = await extractActivePage();
          if (!page.text || page.text.length < 220) {
            throw new Error("Insufficient content on this page to analyze.");
          }

          const result = analyzeLocally(page);
          try {
            const ai = await getAiExplanationWithMeta(result);
            result.aiExplanation = ai.text;
            result.explanationSource = OLLAMA_BASE_URL.includes("ollama.com") ? "ollama-cloud" : "ollama-local";
            result.aiMeta = {
              endpointHost: ai.endpointHost,
              model: ai.model,
              requestId: ai.requestId,
              callStatus: "success"
            };
          } catch (aiError) {
            result.aiExplanation = `AI explanation skipped: ${(aiError as Error).message}`;
            result.explanationSource = "local-only";
            result.aiMeta = {
              endpointHost: getEndpointHost(OLLAMA_BASE_URL),
              model: OLLAMA_MODEL,
              callStatus: "fallback"
            };
          }
          await prependHistory(result, HISTORY_LIMIT);
          sendResponse({ ok: true, data: result });
          return;
        }
        case "GET_HISTORY": {
          const history = await getHistory();
          sendResponse({ ok: true, data: history });
          return;
        }
        case "CLEAR_HISTORY": {
          await clearHistory();
          sendResponse({ ok: true, data: [] });
          return;
        }
        case "DELETE_HISTORY_ITEM": {
          const payload = message.payload as { id: string };
          const history = await deleteHistoryItem(payload.id);
          sendResponse({ ok: true, data: history });
          return;
        }
        default:
          sendResponse({ ok: false, error: "Unknown action." });
      }
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
  })();

  return true;
});
