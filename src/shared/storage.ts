import { AnalysisResult } from "./types";

const HISTORY_KEY = "credlens_history";

export async function getHistory(): Promise<AnalysisResult[]> {
  const data = await chrome.storage.local.get(HISTORY_KEY);
  const history = (data[HISTORY_KEY] as AnalysisResult[] | undefined) ?? [];
  return history.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveHistory(history: AnalysisResult[]): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_KEY]: history });
}

export async function prependHistory(item: AnalysisResult, limit: number): Promise<AnalysisResult[]> {
  const history = await getHistory();
  const deduped = history.filter((entry) => entry.page.url !== item.page.url);
  const next = [item, ...deduped].slice(0, limit);
  await saveHistory(next);
  return next;
}

export async function deleteHistoryItem(id: string): Promise<AnalysisResult[]> {
  const history = await getHistory();
  const next = history.filter((entry) => entry.id !== id);
  await saveHistory(next);
  return next;
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_KEY]: [] });
}
