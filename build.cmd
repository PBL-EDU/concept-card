@echo off
setlocal
cd /d "%~dp0"
if exist "node_modules\@esbuild\win32-x64\esbuild.exe" (
  "node_modules\@esbuild\win32-x64\esbuild.exe" src\main.ts --bundle --external:obsidian --format=cjs --target=es2018 --outfile=main.js --log-level=info
) else (
  node esbuild.config.mjs production
)
if errorlevel 1 (
  echo.
  echo 构建失败。
  exit /b 1
)
echo.
echo 构建完成：main.js
