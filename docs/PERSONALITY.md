# Personality Tendency

letsdate now gives a directional personality reading instead of defaulting to "待观察" whenever evidence is imperfect.

## Output

The report provides:

- one current best-fit four-letter MBTI tendency;
- confidence for that tendency;
- the closest alternative types;
- per-axis direction and evidence status;
- a short explanation connecting the tendency to communication.

Low confidence changes the strength of the claim, not whether a useful direction is shown.

`待观察` remains only for text with no detectable behavioral signal, such as a conversation made entirely of greetings.

## Signal model

The local TypeScript engine scores four bipolar axes:

- E/I: shared activity and external expression versus solitude and processing space.
- S/N: concrete details and plans versus patterns, future possibilities and abstract meaning.
- T/F: logic, rules and trade-offs versus emotional impact and relationship values.
- J/P: scheduling and closure versus flexibility and open options.

Only the target person's profile and own messages contribute to that person's MBTI tendency. The other speaker's messages are used for dyadic interaction analysis, not for typing the target.

Signals are weighted by explicitness. Multiple aligned behaviors increase confidence. One weak phrase can provide a first-pass direction but remains low confidence.

## Referenced open-source projects

### OpenJung Core

`openjung/core` (MIT code, CC BY-NC-SA questionnaire) was reviewed for:

- deterministic bipolar scoring;
- distance-from-midpoint confidence;
- profile clarity;
- a four-letter summary assembled from independent axes.

The OEJTS questionnaire itself is not bundled. letsdate does not need users to complete a questionnaire for this workflow.

### KnowMe

`AIPMAndy/KnowMe` (Apache-2.0) was reviewed for:

- Chinese behavioral signal categories;
- sample-adjusted confidence;
- reporting a best-fit type with alternatives instead of withholding judgment;
- translating type into communication guidance.

letsdate uses an original TypeScript implementation for dating profiles and chat transcripts.

### MbtiBench

`Personality-NLP/MbtiBench` was reviewed as a research reference for per-dimension soft labels. No dataset, model or code artifact is bundled.

### Personality Prediction from Text

`jkwieser/personality-prediction-from-text` (MIT) was reviewed for Big Five text-signal structure. Its English Reddit/Kaggle-style models and data are not appropriate as a direct predictor for Chinese dating conversations, so no model artifact was imported.

## Psychoanalysis review

GitHub searches for psychoanalysis-based personality tools mostly returned unlicensed demos, astrology hybrids or clinical material without a usable text-analysis implementation. Those were not integrated.

letsdate instead exposes relationship needs, conflict behavior, boundaries and attachment-like interaction cues as observable communication patterns. It does not diagnose defense mechanisms, trauma, personality disorders or unconscious motives.

## Limits

- MBTI is used as a communication lens, not a clinical test.
- The result can change when the target person's context, stress level or communication setting changes.
- Cultural indirectness and workplace hierarchy can affect language.
- Important conclusions should be checked through direct communication.
