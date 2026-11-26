import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);

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
  confidence: z.enum(["低", "中", "较高"]),
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
});

export type ExtractedFactLedger = z.infer<typeof FactLedgerSchema>;
