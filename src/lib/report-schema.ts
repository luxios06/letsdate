import { z } from "zod";
import type { AnalysisReport } from "../types";
import {
  MESSAGE_CUES,
  MESSAGE_EMOTIONS,
  MESSAGE_INTENTS,
} from "./message-insights";

const score = z.number().int().min(0).max(100);
const confidence = z.enum(["低", "中", "较高"]);
const decision = z.enum(["继续推进", "适度推进", "先观察", "暂缓推进"]);
const evidenceStatus = z.enum(["insufficient", "tentative", "supported"]);
const evidenceStrength = z.enum(["insufficient", "tentative", "confirmed"]);
const text = (max: number) => z.string().trim().min(1).max(max);
const list = (max: number, min = 1) =>
  z.array(text(max)).min(min).max(8);

const traitSchema = z.object({
  key: text(40),
  label: text(20),
  score,
  summary: text(180),
  status: evidenceStatus,
  evidenceIds: z.array(text(80)).max(12),
});

const mbtiDimensionSchema = z.object({
  key: z.enum(["EI", "SN", "TF", "JP"]),
  left: text(8),
  right: text(8),
  score,
  leaning: text(16),
  note: text(220),
  status: evidenceStatus,
  evidenceIds: z.array(text(80)).max(12),
});

const mbtiSchema = z.object({
  candidate: text(16),
  alternatives: z.array(text(16)).max(8),
  confidence,
  summary: text(500),
  dimensions: z.array(mbtiDimensionSchema).length(4),
});

const attachmentCueSchema = z.object({
  key: z.enum(["safe", "anxious", "avoidant", "mixed", "insufficient"]),
  label: text(30),
  status: evidenceStatus,
  score,
  confidence,
  summary: text(300),
  evidenceIds: z.array(text(80)).max(20),
  counterEvidenceIds: z.array(text(80)).max(20),
  missingInformation: z.array(text(180)).max(8),
});

const personSchema = z.object({
  summary: text(400),
  mbti: mbtiSchema,
  bigFive: z.array(traitSchema).length(5),
  interaction: z.object({
    attachment: text(320),
    conflict: text(320),
    pace: text(320),
    energy: text(320),
    humor: text(320),
  }),
  values: list(40, 0),
  needs: list(60, 0),
  boundaries: list(60, 0),
  greenFlags: list(80, 0),
  watchouts: list(80, 0),
  attachmentAssessment: z.object({
    summary: text(400),
    scope: text(300),
    cues: z.array(attachmentCueSchema).min(3).max(5),
  }),
});

export const ReportSchema = z.object({
  id: text(120),
  createdAt: text(80),
  relationshipLabel: text(40),
  provider: z.enum([
    "demo",
    "deepseek",
    "openai",
    "anthropic",
    "gemini",
    "ollama",
    "browser",
    "custom",
  ]),
  stage: text(80),
  decision,
  overallTitle: text(120),
  overallSummary: text(1200),
  confidence,
  compatibilityScore: score,
  calibration: z.object({
    evidenceMessages: z.number().int().min(0).max(10000),
    reciprocalTurns: z.number().int().min(0).max(10000),
    questionCount: z.number().int().min(0).max(10000),
    sourceCount: z.number().int().min(0).max(10),
    reliability: z.number().min(0).max(1),
    scoreCap: score,
    method: text(200),
    notes: list(240, 1),
  }),
  emotion: z.object({
    valence: z.number().min(-1).max(1),
    intensity: z.number().min(0).max(1),
    categories: z
      .array(
        z.object({
          key: z.enum([
            "good",
            "joy",
            "sadness",
            "anger",
            "fear",
            "disgust",
            "surprise",
          ]),
          label: text(8),
          count: z.number().min(0).max(100000),
          score: score,
        }),
      )
      .length(7),
    intimacySignals: z
      .array(
        z.object({
          key: z.enum([
            "closeness",
            "flirtation",
            "reassurance",
            "withdrawal",
            "control",
            "repair",
            "boundary",
            "future",
          ]),
          label: text(30),
          score,
          hits: z.array(text(80)).max(12),
          sender: z.enum(["self", "other", "both"]),
        }),
      )
      .max(10),
    quickRead: z.object({
      headline: text(200),
      observation: text(500),
      suggestion: text(500),
      confidence,
      missingInformation: z.array(text(300)).max(8),
    }),
    source: z.enum(["cnsenti-dutir", "local-fallback"]),
  }),
  knowledge: z.object({
    relatedCases: z
      .array(
        z.object({
          id: text(80),
          title: text(160),
          source: text(80),
          license: text(40),
          pattern: text(120),
          situation: text(300),
          takeaway: text(300),
          similarity: score,
          synthetic: z.boolean(),
        }),
      )
      .max(3),
    clusterHints: z.array(text(80)).max(12),
    caseCount: z.number().int().min(0).max(100000),
  }),
  messageInsights: z
    .array(
      z.object({
        messageId: text(80),
        quote: text(500),
        sender: z.enum(["self", "other"]),
        timestamp: z.string().trim().max(80).nullable(),
        emotion: z.enum(MESSAGE_EMOTIONS),
        intent: z.enum(MESSAGE_INTENTS),
        cue: z.enum(MESSAGE_CUES),
        confidence,
        explanation: text(400),
        source: z.enum([
          "local-rules",
          "local-llm",
          "browser-local",
          "provider",
        ]),
      }),
    )
    .max(120),
  humanRead: z.object({
    canConfirm: text(500),
    likely: text(500),
    alternatives: text(500),
    observeNext: text(500),
    supportNote: text(500),
  }),
  contextGaps: z
    .array(
      z.object({
        question: text(300),
        why: text(300),
        priority: z.number().int().min(1).max(10),
      }),
    )
    .max(8),
  shortReplies: z
    .array(
      z.object({
        messageId: text(80),
        quote: text(120),
        sessionId: text(80),
        classification: z.enum([
          "acknowledgment",
          "low_energy",
          "topic_closed",
          "possible_withdrawal",
          "uncertain",
        ]),
        explanation: text(400),
        baselineCharacters: z.number().int().min(0).max(10000),
        sessionShift: z.number().int().min(-10000).max(10000),
        replyLagMs: z.number().int().min(0).nullable(),
        baselineReplyLagMs: z.number().int().min(0).nullable(),
        replyLagShiftMs: z.number().int().nullable(),
        afterEffect: z.enum(["recovered", "no_recovery", "unknown"]),
        evidenceIds: z.array(text(80)).max(12),
        confidence,
      }),
    )
    .max(12),
  pipeline: z.object({
    version: text(60),
    stages: list(120, 1),
    messageCount: z.number().int().min(0).max(100000),
    sessionCount: z.number().int().min(0).max(10000),
    timestampCoverage: z.number().min(0).max(1),
    localRuleMode: z.boolean(),
    exactQuoteVerification: z.boolean(),
  }),
  person: personSchema,
  self: personSchema,
  compatibility: z.object({
    score,
    label: text(80),
    summary: text(600),
    dimensions: z
      .array(
        z.object({
          key: text(40),
          label: text(30),
          score,
          summary: text(220),
        }),
      )
      .min(3)
      .max(8),
  }),
  interest: z.object({
    score,
    confidence,
    verdict: text(300),
    signals: list(240, 1),
    ambiguities: list(240, 1),
  }),
  action: z.object({
    decision,
    rationale: text(800),
    nextMessage: text(500),
    messageOptions: z
      .array(
        z.object({
          tone: text(12),
          text: text(500),
        }),
      )
      .min(1)
      .max(3),
    ifWarm: text(500),
    ifCold: text(500),
    conversationMoves: list(240, 1),
    stopSigns: list(240, 1),
  }),
  evidence: z
    .array(
      z.object({
        id: text(80),
        source: z.enum(["主页", "聊天", "双方互动"]),
        quote: text(500),
        observation: text(500),
        inference: text(500),
        confidence,
        caution: text(500),
        status: evidenceStrength,
        evidenceIds: z.array(text(80)).max(12),
      }),
    )
    .min(1)
    .max(12),
  uncertainties: list(500, 1),
  safetyNotes: list(500, 1),
});

export function validateReport(report: AnalysisReport): AnalysisReport {
  const result = ReportSchema.safeParse(report);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `模型报告结构无效：${issue?.path.join(".") || "unknown"} ${issue?.message || ""}`.trim(),
    );
  }
  return report;
}
