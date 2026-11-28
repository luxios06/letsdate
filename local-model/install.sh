#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODEL_DIR="${ROOT}/models"
MODEL_FILE="${MODEL_DIR}/Qwen3-0.6B-Q8_0.gguf"
MODEL_URL="https://modelscope.cn/models/Qwen/Qwen3-0.6B-GGUF/resolve/master/Qwen3-0.6B-Q8_0.gguf"
MODEL_SHA256="9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031"
MODEL_NAME="letsdate-qwen3:0.6b"

if ! command -v ollama >/dev/null 2>&1; then
  printf '%s\n' "未找到 ollama。请先安装 Ollama，再重新运行本脚本。"
  exit 1
fi

mkdir -p "${MODEL_DIR}"
if [[ ! -f "${MODEL_FILE}" ]]; then
  part="${MODEL_FILE}.part"
  printf '%s\n' "从 ModelScope 下载 Qwen3-0.6B-Q8_0.gguf（约 610MB）..."
  curl -fL --retry 5 --retry-delay 2 -C - "${MODEL_URL}" -o "${part}"
  actual_size="$(wc -c < "${part}" | tr -d ' ')"
  if [[ "${actual_size}" != "639446688" ]]; then
    printf '模型大小不匹配：%s bytes\n' "${actual_size}"
    exit 1
  fi
  if command -v shasum >/dev/null 2>&1; then
    actual_sha="$(shasum -a 256 "${part}" | awk '{print $1}')"
  else
    actual_sha="$(sha256sum "${part}" | awk '{print $1}')"
  fi
  if [[ "${actual_sha}" != "${MODEL_SHA256}" ]]; then
    printf '模型校验失败：%s\n' "${actual_sha}"
    exit 1
  fi
  mv "${part}" "${MODEL_FILE}"
fi

if ! curl -fsS --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null; then
  printf '%s\n' "Ollama 服务尚未运行。先执行 ollama serve，或启动 Ollama 桌面应用，再重新运行。"
  exit 1
fi

(
  cd "${ROOT}"
  ollama create "${MODEL_NAME}" -f Modelfile
)

printf '\n%s\n' "本机模型已创建：${MODEL_NAME}"
printf '%s\n' "为允许线上 letsdate 调用，请用以下来源启动 Ollama："
printf '%s\n' 'OLLAMA_ORIGINS="https://luxios06.github.io,http://localhost:*,http://127.0.0.1:*" ollama serve'
printf '%s\n' "然后运行：pnpm model:check"
