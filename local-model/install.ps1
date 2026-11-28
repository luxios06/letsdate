$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ModelDir = Join-Path $Root "models"
$ModelFile = Join-Path $ModelDir "Qwen3-0.6B-Q8_0.gguf"
$PartFile = "$ModelFile.part"
$ModelUrl = "https://modelscope.cn/models/Qwen/Qwen3-0.6B-GGUF/resolve/master/Qwen3-0.6B-Q8_0.gguf"
$ExpectedSha = "9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031"
$ModelName = "letsdate-qwen3:0.6b"

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  throw "未找到 ollama。请先安装 Ollama，再重新运行本脚本。"
}

New-Item -ItemType Directory -Force -Path $ModelDir | Out-Null
if (-not (Test-Path $ModelFile)) {
  Write-Host "从 ModelScope 下载 Qwen3-0.6B-Q8_0.gguf（约 610MB）..."
  curl.exe -fL --retry 5 --retry-delay 2 -C - $ModelUrl -o $PartFile
  if ((Get-Item $PartFile).Length -ne 639446688) {
    throw "模型大小不匹配。"
  }
  $ActualSha = (Get-FileHash -Algorithm SHA256 $PartFile).Hash.ToLowerInvariant()
  if ($ActualSha -ne $ExpectedSha) {
    throw "模型 SHA-256 校验失败。"
  }
  Move-Item -Force $PartFile $ModelFile
}

try {
  Invoke-RestMethod -TimeoutSec 3 http://127.0.0.1:11434/api/tags | Out-Null
} catch {
  throw "Ollama 服务尚未运行。先启动 Ollama 桌面应用，再重新运行。"
}

Push-Location $Root
try {
  ollama create $ModelName -f Modelfile
} finally {
  Pop-Location
}

[Environment]::SetEnvironmentVariable(
  "OLLAMA_ORIGINS",
  "https://luxios06.github.io,http://localhost:*,http://127.0.0.1:*",
  "User"
)

Write-Host "本机模型已创建：$ModelName"
Write-Host "请重启 Ollama，然后运行：pnpm model:check"
