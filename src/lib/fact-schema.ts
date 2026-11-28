import { z } from "zod";
import {
  MESSAGE_CUES,
  MESSAGE_EMOTIONS,
  MESSAGE_INTENTS,
} from "./message-insights";

const text = (max: number) => z.string().trim().min(1).max(max);
const confidence = z.enum(["低", "中", "较高"]).catch("低");

export const FactSchema = z.object({
  id: text(80),
  type: z.enum([
    "self_disclosure",
    "question",
    "plan",
    "conflict",
    "repair",
    "boundary",
    "support",
    "short_reply",
    "commitment",
    "withdrawal",
    "other",
  ]),
  quote: text(500),
  sessionId: text(80),
  observation: text(500),
  alternative: text(500),
  confidence,
});

export const ExtractedMessageInsightSchema = z.object({
  messageId: text(80),
  quote: text(500),
  emotion: z.enum(MESSAGE_EMOTIONS),
  intent: z.enum(MESSAGE_INTENTS),
  cue: z.enum(MESSAGE_CUES),
  confidence,
  explanation: text(400),
});

export const FactLedgerSchema = z.object({
  facts: z.array(FactSchema).min(1).max(40),
  planState: z.object({
    status: z.enum(["none", "proposed", "confirmed", "cancelled", "ambiguous"]),
    summary: text(500),
    evidenceIds: z.array(text(80)).max(12),
  }),
  shortReplyFacts: z
    .array(
      z.object({
        messageId: text(80),
        quote: text(120),
        classification: z.enum([
          "acknowledgment",
          "low_energy",
          "topic_closed",
          "possible_withdrawal",
          "uncertain",
        ]),
        afterEffect: z.enum(["recovered", "no_recovery", "unknown"]),
        observation: text(400),
      }),
    )
    .max(12),
  messageInsights: z.array(ExtractedMessageInsightSchema).max(120).default([]),
});

export type ExtractedFactLedger = z.infer<typeof FactLedgerSchema>;
