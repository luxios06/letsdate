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
