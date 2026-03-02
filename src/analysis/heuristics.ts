import { AnalysisReason, AnalysisResult, BiasLevel, Confidence, PagePayload, RiskLevel } from "../shared/types";
import { SOURCE_PROFILES } from "./source-profiles";

const LOW_TRUST_HINTS = ["-news-now", "patriot", "truth", "viral", "dailybuzz", "uncensored"];

const SENSATIONAL_PATTERNS = [
  /shocking/gi,
  /you won'?t believe/gi,
  /must read/gi,
  /exposed/gi,
  /destroyed/gi,
  /traitor/gi,
  /wake up/gi,
  /everyone is saying/gi
];

const LEFT_CUES = [/systemic/gi, /equity/gi, /social justice/gi, /collective/gi];
const RIGHT_CUES = [/patriot/gi, /traditional values/gi, /deep state/gi, /border crisis/gi];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getRiskFromReliability(score: number): RiskLevel {
  if (score >= 70) return "Low";
  if (score >= 45) return "Medium";
  return "High";
}

function getConfidence(reasons: AnalysisReason[], textLength: number): Confidence {
  if (textLength < 400 || reasons.length < 2) return "Low";
  if (reasons.length >= 4 && textLength > 1800) return "High";
  return "Medium";
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, regex) => count + (text.match(regex)?.length ?? 0), 0);
}

function findSourceProfile(domain: string) {
  return SOURCE_PROFILES.find((profile) => domain === profile.domain || domain.endsWith(`.${profile.domain}`));
}

export function analyzeLocally(page: PagePayload): AnalysisResult {
  const reasons: AnalysisReason[] = [];
  const combined = `${page.title} ${page.text}`;
  let reliability = 55;

  const sourceProfile = findSourceProfile(page.domain);
  if (sourceProfile?.tier === "high") {
    reliability += 24;
    reasons.push({
      signal: "Source profile",
      detail: sourceProfile.note,
      impact: "positive"
    });
  }
  if (sourceProfile?.tier === "mixed") {
    reliability += 2;
    reasons.push({
      signal: "Source profile",
      detail: sourceProfile.note,
      impact: "neutral"
    });
  }
  if (sourceProfile?.tier === "low") {
    reliability -= 22;
    reasons.push({
      signal: "Source profile",
      detail: sourceProfile.note,
      impact: "negative"
    });
  }
  if (sourceProfile?.tier === "satire") {
    reliability -= 30;
    reasons.push({
      signal: "Source profile",
      detail: sourceProfile.note,
      impact: "negative"
    });
  }

  const lowTrustHit = LOW_TRUST_HINTS.some((hint) => page.domain.includes(hint));
  if (lowTrustHit && !sourceProfile) {
    reliability -= 18;
    reasons.push({
      signal: "Source caution",
      detail: "Domain naming pattern resembles low-trust click-driven outlets.",
      impact: "negative"
    });
  }

  const sensationalHits = countMatches(combined, SENSATIONAL_PATTERNS);
  if (sensationalHits > 0) {
    reliability -= Math.min(20, sensationalHits * 3);
    reasons.push({
      signal: "Sensational language",
      detail: `Detected ${sensationalHits} sensational phrases that may reduce factual framing.`,
      impact: "negative"
    });
  }

  if (page.outboundLinks >= 5) {
    reliability += 10;
    reasons.push({
      signal: "Citation depth",
      detail: "Article links to multiple external sources, which can improve verifiability.",
      impact: "positive"
    });
  } else if (page.outboundLinks <= 1) {
    reliability -= 10;
    reasons.push({
      signal: "Citation depth",
      detail: "Very few external references were found.",
      impact: "negative"
    });
  }

  if (!page.byline || !page.publishedTime) {
    reliability -= 6;
    reasons.push({
      signal: "Transparency",
      detail: "Missing author or publication date lowers transparency.",
      impact: "negative"
    });
  } else {
    reliability += 6;
    reasons.push({
      signal: "Transparency",
      detail: "Author and publication metadata are present.",
      impact: "positive"
    });
  }

  const leftScore = countMatches(combined, LEFT_CUES);
  const rightScore = countMatches(combined, RIGHT_CUES);
  let bias: BiasLevel = "Center";
  if (leftScore > rightScore + 2) {
    bias = "Low";
  } else if (rightScore > leftScore + 2) {
    bias = "High";
  }

  reliability = clamp(reliability, 0, 100);

  if (!sourceProfile) {
    reasons.push({
      signal: "Source profile",
      detail: "Domain is not in the local reputation set yet, so score relies more on content-level signals.",
      impact: "neutral"
    });
  }

  const risk = getRiskFromReliability(reliability);
  const confidence = getConfidence(reasons, page.text.length);

  const summary =
    risk === "Low"
      ? "Signals suggest relatively reliable framing, but still verify core claims."
      : risk === "Medium"
        ? "Mixed quality signals detected. Cross-check claims with at least two independent sources."
        : "High caution recommended. Strong manipulation or weak sourcing signals were detected.";

  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    page,
    scores: {
      reliability,
      bias,
      risk,
      confidence
    },
    reasons: reasons.slice(0, 5),
    summary
  };
}
