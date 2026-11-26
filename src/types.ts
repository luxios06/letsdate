export type View = "analyze" | "history" | "method";
export type SourceKey = "self" | "other" | "chat";
export type Confidence = "低" | "中" | "较高";
export type Decision = "继续推进" | "适度推进" | "先观察" | "暂缓推进";
export type EvidenceStatus = "insufficient" | "tentative" | "supported";
export type EvidenceStrength = "insufficient" | "tentative" | "confirmed";
export type MessageKind =
  | "short"
  | "question"
  | "plan"
  | "conflict"
  | "repair"
  | "support"
  | "self_disclosure"
  | "statement";
export type ShortReplyClass =
  | "acknowledgment"
  | "low_energy"
  | "topic_closed"
  | "possible_withdrawal"
  | "uncertain";
export type AttachmentCueKind =
  | "safe"
  | "anxious"
  | "avoidant"
  | "mixed"
  | "insufficient";

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
  status: EvidenceStatus;
  evidenceIds: string[];
}

export interface MbtiDimension {
  key: "EI" | "SN" | "TF" | "JP";
  left: string;
  right: string;
  score: number;
  leaning: string;
  note: string;
  status: EvidenceStatus;
  evidenceIds: string[];
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

export interface AttachmentCue {
  key: AttachmentCueKind;
  label: string;
  status: EvidenceStatus;
  score: number;
  confidence: Confidence;
  summary: string;
  evidenceIds: string[];
  counterEvidenceIds: string[];
  missingInformation: string[];
}

export interface AttachmentAssessment {
  summary: string;
  cues: AttachmentCue[];
  scope: string;
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
  attachmentAssessment: AttachmentAssessment;
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
  status: EvidenceStrength;
  evidenceIds: string[];
}

export interface MessageOption {
  tone: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  sender: "self" | "other";
  text: string;
  sessionId: string;
  timestamp: string | null;
  timestampMs: number | null;
  replyLagMs: number | null;
  kind: MessageKind;
  short: boolean;
  replyToId: string | null;
}

export interface ConversationSession {
  id: string;
  label: string;
  messageIds: string[];
}

export interface PlanState {
  status: "none" | "proposed" | "confirmed" | "cancelled" | "ambiguous";
  day: string;
  time: string;
  venue: string;
  evidenceIds: string[];
  summary: string;
}

export interface ShortReplyInsight {
  messageId: string;
  quote: string;
  sessionId: string;
  classification: ShortReplyClass;
  explanation: string;
  baselineCharacters: number;
  sessionShift: number;
  replyLagMs: number | null;
  baselineReplyLagMs: number | null;
  replyLagShiftMs: number | null;
  afterEffect: "recovered" | "no_recovery" | "unknown";
  evidenceIds: string[];
  confidence: Confidence;
}

export interface ContextGap {
  question: string;
  why: string;
  priority: number;
}

export interface HumanRead {
  canConfirm: string;
  likely: string;
  alternatives: string;
  observeNext: string;
  supportNote: string;
}

export interface PipelineMeta {
  version: string;
  stages: string[];
  messageCount: number;
  sessionCount: number;
  timestampCoverage: number;
  localRuleMode: boolean;
  exactQuoteVerification: boolean;
}

export interface ActionPlan {
  decision: Decision;
  rationale: string;
  nextMessage: string;
  messageOptions: MessageOption[];
  ifWarm: string;
  ifCold: string;
  conversationMoves: string[];
  stopSigns: string[];
}

export interface ScoreCalibration {
  evidenceMessages: number;
  reciprocalTurns: number;
  questionCount: number;
  sourceCount: number;
  reliability: number;
  scoreCap: number;
  method: string;
  notes: string[];
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
  calibration: ScoreCalibration;
  humanRead: HumanRead;
  contextGaps: ContextGap[];
  shortReplies: ShortReplyInsight[];
  pipeline: PipelineMeta;
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
