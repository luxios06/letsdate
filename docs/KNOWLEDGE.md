# Knowledge Retrieval

letsdate does not fine-tune a foundation model on scraped private chats. The current implementation builds a small, inspectable relationship-pattern library and retrieves similar situations before model synthesis.

## Sources

- CPED `valid_split.csv`, Apache-2.0: Chinese emotional dialogue used only to derive anonymized scene, emotion, pattern and takeaway records.
- letsdate synthetic cases, CC0-1.0: fully fictional dating scenarios covering short replies, plan changes, control, repair, boundaries and mixed signals.
- cnsenti / DUTIR, MIT: local emotion and modifier lexicon used by the analysis engine.

The published `public/knowledge/cases.json` currently contains 95 unique records:

- 79 anonymized CPED-derived records.
- 16 synthetic dating scenarios.
- 9 deterministic clusters.

Raw CPED dialogue is deliberately excluded because samples can contain names, family details and other sensitive context. Source and license fields remain visible in the report.

## Pipeline

```text
licensed sources
      |
clean + remove identifiers
      |
derived emotion/scene/pattern summaries
      |
hashed TF-IDF vectors
      |
deterministic k-means
      |
representative cases + schema validation
      |
public/knowledge/cases.json
```

Build the library from the repository root:

```bash
python3 data-pipeline/build_knowledge.py
```

The current build uses Python's standard library and is deterministic. It does not call a model provider.

## Retrieval

`src/lib/knowledge.ts` scores cases using:

- Chinese character, bigram and trigram overlap.
- Current DUTIR emotion categories.
- Closeness, flirtation, reassurance, withdrawal, control, repair, boundary and future signals.
- A dating-scene bonus for synthetic product scenarios.
- A control penalty when the current material contains no control cue.

The top cases are sent to the synthesis stage as `retrieved_cases`, together with an explicit caveat. The model may use them to broaden possible explanations or suggest a safe next action. It may not add them to `evidence`, treat similarity as proof, or diagnose attachment.

## Known limitations

- CPED is not a dating-specific dataset; most records contribute emotional context rather than romantic intent.
- Lexical retrieval can miss sarcasm, dialects, irony and indirect implications.
- The synthetic cases cover common scenarios, not the full range of relationships.
- Case similarity is a prompt aid, not a calibrated probability.
- More data requires a provenance review, consent/license check and bias evaluation before inclusion.

## Product direction

The next useful step is not indiscriminate scraping. It is building a consented, provenance-tracked evaluation set with dating-specific examples, counterexamples and outcome annotations, then measuring whether retrieval improves human-rated usefulness and calibration.
