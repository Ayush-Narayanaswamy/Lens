export type RiskLevel = "Low" | "Medium" | "High";
export type Confidence = "Low" | "Medium" | "High";

export interface PagePayload {
  url: string;
  title: string;
  byline?: string;
  publishedTime?: string;
  domain: string;
  text: string;
  excerpt: string;
  outboundLinks: number;
}

export interface AnalysisReason {
  signal: string;
  detail: string;
  impact: "positive" | "negative" | "neutral";
}

export interface AnalysisScores {
  reliability: number;
  bias: number;
  risk: RiskLevel;
  confidence: Confidence;
}

export interface AnalysisResult {
  id: string;
  createdAt: number;
  page: PagePayload;
  scores: AnalysisScores;
  reasons: AnalysisReason[];
  summary: string;
  aiExplanation?: string;
  explanationSource?: "ollama-cloud" | "ollama-local" | "local-only";
  aiMeta?: {
    endpointHost: string;
    model: string;
    requestId?: string;
    callStatus: "success" | "fallback";
  };
}

export interface RuntimeMessage {
  type: "RUN_ANALYSIS" | "GET_HISTORY" | "CLEAR_HISTORY" | "DELETE_HISTORY_ITEM";
  payload?: unknown;
}
