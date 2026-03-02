import { PagePayload } from "../shared/types";

function selectMainText(): string {
  const article = document.querySelector("article");
  if (article?.textContent) {
    return article.textContent;
  }
  const main = document.querySelector("main");
  if (main?.textContent) {
    return main.textContent;
  }
  return document.body?.innerText ?? "";
}

function extractPagePayload(): PagePayload {
  const text = selectMainText().replace(/\s+/g, " ").trim();
  const excerpt = text.slice(0, 1200);
  const bylineMeta = document.querySelector('meta[name="author"]')?.getAttribute("content")?.trim();
  const timeMeta =
    document.querySelector('meta[property="article:published_time"]')?.getAttribute("content")?.trim() ??
    document.querySelector("time")?.getAttribute("datetime")?.trim();

  return {
    url: location.href,
    title: document.title.trim(),
    byline: bylineMeta,
    publishedTime: timeMeta,
    domain: location.hostname.replace(/^www\./, ""),
    text,
    excerpt,
    outboundLinks: Array.from(document.querySelectorAll("a[href]"))
      .map((link) => (link as HTMLAnchorElement).href)
      .filter((href) => href.startsWith("http") && !href.includes(location.hostname)).length
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "EXTRACT_PAGE") {
    try {
      sendResponse({ ok: true, payload: extractPagePayload() });
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
    return true;
  }
  return false;
});
