export type View = "analyze" | "history" | "method";
export type SourceKey = "self" | "other";
export type Confidence = "低" | "中" | "较高";
export type Decision = "继续推进" | "适度推进" | "先观察" | "暂缓推进";

export type ProviderId =
  | "demo"
  | "deepseek"
  | "openai"
  | "anthropic"
  | "gemini"
  | "ollama"
  | "custom";

export interface ProviderSettings {
  provider: ProviderId;
  baseUrl: string;
  model: string;
  rememberKey: boolean;
  apiKey?: string;
}

export interface AnalysisInput {
  selfProfile: string;
  otherProfile: string;
  chat: string;
  relationshipStage: string;
  goal: string;
  consent: boolean;
}

export interface TraitScore {
  key: string;
  label: string;
  score: number;
  summary: string;
}

export interface MbtiDimension {
  key: "EI" | "SN" | "TF" | "JP";
  left: string;
  right: string;
  score: number;
  leaning: string;
  note: string;
}

export interface MbtiLens {
  candidate: string;
  alternatives: string[];
  confidence: Confidence;
  dimensions: MbtiDimension[];
}

export interface InteractionPattern {
  attachment: string;
  conflict: string;
  pace: string;
  energy: string;
  humor: string;
}

export interface PersonProfile {
  summary: string;
  mbti: MbtiLens;
  bigFive: TraitScore[];
  interaction: InteractionPattern;
  values: string[];
  needs: string[];
  boundaries: string[];
  greenFlags: string[];
  watchouts: string[];
}

export interface CompatibilityDimension {
  key: string;
  label: string;
  score: number;
  summary: string;
}

export interface InterestSignals {
  score: number;
  confidence: Confidence;
  verdict: string;
  signals: string[];
  ambiguities: string[];
}

export interface EvidenceItem {
  id: string;
  source: "主页" | "聊天" | "双方互动";
  quote: string;
  observation: string;
  inference: string;
  confidence: Confidence;
  caution: string;
}

export interface ActionPlan {
  decision: Decision;
  rationale: string;
  nextMessage: string;
  ifWarm: string;
  ifCold: string;
  conversationMoves: string[];
  stopSigns: string[];
}

export interface AnalysisReport {
  id: string;
  createdAt: string;
  provider: ProviderId;
  stage: string;
  decision: Decision;
  overallTitle: string;
  overallSummary: string;
  confidence: Confidence;
  compatibilityScore: number;
  person: PersonProfile;
  self: PersonProfile;
  compatibility: {
    score: number;
    label: string;
    summary: string;
    dimensions: CompatibilityDimension[];
  };
  interest: InterestSignals;
  action: ActionPlan;
  evidence: EvidenceItem[];
  uncertainties: string[];
  safetyNotes: string[];
}

export interface HistoryRecord {
  id: string;
  createdAt: string;
  title: string;
  decision: Decision;
  score: number;
  report: AnalysisReport;
}

export interface AnalyzeProgress {
  percent: number;
  label: string;
}
