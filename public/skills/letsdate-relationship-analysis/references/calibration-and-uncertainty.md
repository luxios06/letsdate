# Calibration and Uncertainty

Use this reference before assigning compatibility, interest, MBTI, Big Five, or a relationship decision.

## Core rule

A score is a calibrated summary of observable signals. It is not a probability, a diagnosis, or a prediction that a relationship will succeed.

Text-only evidence should never produce a compatibility or interest score of 100. A short, warm exchange is not enough to support near-certainty.

## Sample statistics

Calculate and report:

- `evidenceMessages`: distinct messages from the other person.
- `reciprocalTurns`: approximate number of alternating SELF/OTHER exchanges.
- `questionCount`: relevant questions, not every question mark in a quoted block.
- `sourceCount`: profile and chat source types that are actually present.
- `reliability`: a 0-1 value reflecting sample size and context diversity.
- `scoreCap`: the maximum score permitted by the evidence.

## Practical caps

- Fewer than 4 other-person messages: cap compatibility and interest at 70.
- 4-11 other-person messages and at least 3 reciprocal turns: cap at 86.
- At least 12 other-person messages, 4 reciprocal turns, and 2 source types: cap at 94.
- Safety concerns can lower the decision regardless of the score.

## Shrinkage

When evidence is limited, move uncertain scores toward the neutral midpoint:

```text
calibrated = 50 + (raw - 50) * reliability
```

Use reliability around 0.2-0.35 for very short material, 0.45-0.7 for moderate material, and 0.75-0.95 for repeated cross-context evidence. These bands are heuristics, not measurements.

Do not shrink every subdimension in the same way if a specific dimension has direct evidence and another does not. Preserve real disagreement instead of flattening everything to the same number.

## MBTI uncertainty

MBTI must be treated as four independent lenses:

- `insufficient`: no reliable branch evidence. Score 50, leaning `证据不足`.
- `tentative`: one or two independent lines, or one explicit self-description directly about the axis.
- `supported`: multiple distinct behavioral lines across contexts, with alternatives considered.

If more than one axis is `insufficient`, output candidate `待观察` and no four-letter alternatives. A guessed type is worse than an unknown type.

Do not infer:

- Extroversion from reply speed, message count, or emoji.
- Sensing from concrete nouns.
- Thinking from work topics or factual language.
- Judging from having a schedule or meeting a deadline.

## Big Five uncertainty

Big Five traits are continuous hypotheses. If evidence is insufficient:

- Score 50.
- Status `insufficient`.
- State what missing behavior would help.

Do not turn one reply into a stable trait. Emotional sensitivity especially must not be inferred from a single negative emotion or one delayed response.

## Relationship decision

Use calibrated evidence:

- `继续推进`: strong reciprocal signals and no safety concern.
- `适度推进`: positive enough for one low-pressure test.
- `先观察`: mixed or thin evidence.
- `暂缓推进`: low reciprocity, repeated ambiguity, rejection, pressure, or boundary violation.

The decision should prefer the lower-risk action when evidence is uncertain.
