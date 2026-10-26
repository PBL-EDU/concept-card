#requires -Version 5.1
<#
  打包 main.js。
  - 优先直接用 node_modules 里的 esbuild 原生二进制（不经过 node 子进程，沙箱环境也能跑）
  - 没有原生二进制时退回 esbuild.config.mjs
#>
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Push-Location $root
try {
  $platformBins = Get-ChildItem -Path "node_modules/@esbuild" -Directory -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName "esbuild.exe"; Join-Path $_.FullName "bin/esbuild" } |
    Where-Object { Test-Path $_ }
  $bin = $platformBins | Select-Object -First 1

  if ($bin) {
    & $bin "src/main.ts" --bundle --external:obsidian --format=cjs --target=es2018 --outfile=main.js --log-level=info
    if ($LASTEXITCODE -ne 0) { throw "esbuild 打包失败（exit $LASTEXITCODE）" }
  } else {
    node "esbuild.config.mjs" production
    if ($LASTEXITCODE -ne 0) { throw "esbuild 打包失败（exit $LASTEXITCODE）" }
  }

  $size = (Get-Item "main.js").Length
  Write-Host "✅ main.js 已生成（$([math]::Round($size / 1kb, 1)) KB）"
} finally {
  Pop-Location
}
