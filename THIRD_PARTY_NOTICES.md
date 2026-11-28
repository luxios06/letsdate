# Third-Party Notices

## PaddleOCR.js

- Package: `@paddleocr/paddleocr-js` 0.4.2
- License: Apache-2.0
- Project: https://github.com/PaddlePaddle/PaddleOCR/tree/main/paddleocr-js

The browser OCR pipeline uses PaddleOCR PP-OCRv6 detection and recognition models. Model archives are downloaded from the official PaddlePaddle model host on first use.

## ONNX Runtime Web

- Package: `onnxruntime-web` 1.31.1
- License: MIT
- Project: https://github.com/microsoft/onnxruntime

## OpenCV.js

- Package: `@techstark/opencv-js` 4.10.0-release.1
- License: Apache-2.0
- Project: https://github.com/TechStark/opencv-js

## Tesseract.js

- Package: `tesseract.js` 6.0.1
- License: Apache-2.0
- Project: https://github.com/naptha/tesseract.js

Tesseract is retained only as a fallback when PaddleOCR cannot initialize or recognize an image.

## Other OCR support dependencies

- `clipper-lib` 6.4.2: Boost Software License
- `js-yaml` 4.3.2: MIT

## cnsenti / DUTIR emotion lexicon

- Project: https://github.com/hiDaDeng/cnsenti
- License: MIT
- Included data: converted DUTIR seven-emotion sets and HowNet negation/intensity modifiers.

The lexicon is loaded locally as `public/emotion/cnsenti-lexicon.json`.

## CPED

- Dataset: Chinese Personalized and Emotional Dialogue Corpus (CPED)
- Project: https://github.com/scutcyr/CPED
- License: Apache-2.0
- Included data: anonymized aggregate scenario, emotion, pattern and takeaway records derived from `valid_split.csv`.

Raw CPED dialogue is not redistributed because source samples can contain names and sensitive family details.

## letsdate synthetic relationship cases

- File: `data-pipeline/synthetic_cases.json`
- License: CC0-1.0

These dialogues are fully fictional and created for product testing.

## OpenJung Core

- Project: https://github.com/openjung/core
- License: MIT for code; questionnaire content is CC BY-NC-SA 4.0.
- Used: confidence-level and clarity concepts for bipolar Jungian dimensions.

The OEJTS questionnaire text is not included in letsdate because its noncommercial/share-alike license is not appropriate for directly bundling here.

## KnowMe

- Project: https://github.com/AIPMAndy/KnowMe
- License: Apache-2.0

Used as a reference for Chinese behavioral signal categories, sample-adjusted confidence and directional MBTI reporting. letsdate uses an original TypeScript implementation over dating profiles and chat messages.

## MbtiBench

- Project: https://github.com/Personality-NLP/MbtiBench
- Role: research reference for per-dimension soft labels and evaluation.

No dataset or model artifact is bundled.

## Personality Prediction from Text

- Project: https://github.com/jkwieser/personality-prediction-from-text
- License: MIT

Reviewed for Big Five text-signal structure. No English-language model artifact or third-party training dataset is bundled.
