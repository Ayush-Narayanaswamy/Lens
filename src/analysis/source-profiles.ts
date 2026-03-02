export type SourceTier = "high" | "mixed" | "low" | "satire";

export interface SourceProfile {
  domain: string;
  tier: SourceTier;
  note: string;
}

export const SOURCE_PROFILES: SourceProfile[] = [
  { domain: "reuters.com", tier: "high", note: "Wire-service with strong editorial verification patterns." },
  { domain: "apnews.com", tier: "high", note: "Wire-service with broad factual reporting standards." },
  { domain: "bbc.com", tier: "high", note: "Large newsroom with transparent editorial standards." },
  { domain: "npr.org", tier: "high", note: "Established public-interest reporting and sourcing." },
  { domain: "wsj.com", tier: "high", note: "Established newsroom with identifiable editorial process." },
  { domain: "nytimes.com", tier: "high", note: "Large newsroom with visible corrections process." },
  { domain: "theguardian.com", tier: "high", note: "Established newsroom with editorial transparency." },
  { domain: "economist.com", tier: "high", note: "Long-form publication with structured fact-checking." },
  { domain: "ft.com", tier: "high", note: "Financial reporting with high sourcing standards." },
  { domain: "pbs.org", tier: "high", note: "Public media reporting with transparent editorial structure." },
  { domain: "axios.com", tier: "mixed", note: "Fast-format reporting; quality varies by topic and source depth." },
  { domain: "vox.com", tier: "mixed", note: "Analysis-heavy style; verify framing against primary sources." },
  { domain: "huffpost.com", tier: "mixed", note: "Opinion and reporting mix; check claim-level sourcing." },
  { domain: "forbes.com", tier: "mixed", note: "Contributor network includes variable editorial oversight." },
  { domain: "businessinsider.com", tier: "mixed", note: "Quality varies by desk and article type." },
  { domain: "foxnews.com", tier: "mixed", note: "Reporting quality can vary between news and opinion sections." },
  { domain: "cnn.com", tier: "mixed", note: "Large network; segment type can affect framing and depth." },
  { domain: "msnbc.com", tier: "mixed", note: "Contains both reporting and strongly framed commentary." },
  { domain: "theonion.com", tier: "satire", note: "Known satire publication; not intended as literal news." },
  { domain: "babylonbee.com", tier: "satire", note: "Known satire publication; interpret as parody." },
  { domain: "worldnewsdailyreport.com", tier: "satire", note: "Frequently cited as fictional/satirical content." },
  { domain: "infowars.com", tier: "low", note: "Frequent unverified claims and sensational framing concerns." },
  { domain: "beforeitsnews.com", tier: "low", note: "Low editorial controls and high rumor prevalence." },
  { domain: "naturalnews.com", tier: "low", note: "Repeated reliability concerns in health/science claims." },
  { domain: "zerohedge.com", tier: "low", note: "Strong framing and mixed sourcing reliability by article." }
];
