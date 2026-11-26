import { z } from "zod";
import type { AnalysisReport } from "../types";

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
  dimensions: z.array(mbtiDimensionSchema).length(4),
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
});

export const ReportSchema = z.object({
  id: text(120),
  createdAt: text(80),
  provider: z.enum([
    "demo",
    "deepseek",
    "openai",
    "anthropic",
    "gemini",
    "ollama",
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
