# letsdate Knowledge Pipeline

This directory builds a research and noncommercial test knowledge base from public, licensed dialogue data.

## Sources

- CPED Chinese personalized and emotional dialogue dataset, Apache-2.0.
- cnsenti DUTIR emotion lexicon, MIT.
- letsdate synthetic dating cases, CC0-1.0.

The pipeline removes speaker names, demographic fields, face positions, contact information, links and account handles.

## Build

1. Download CPED `valid_split.csv` into `work/cped/valid_split.csv`.
2. Run:

```bash
python3 data-pipeline/build_knowledge.py
```

Output:

```text
public/knowledge/cases.json
```

The current build performs unsupervised hashed TF-IDF vectorization, deterministic k-means clustering and representative-case selection. It does not fine-tune a foundation model.
