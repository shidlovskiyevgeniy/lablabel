# Публикация lablabel.ru в Yandex Object Storage.
# Требуется AWS CLI и профиль с ключами сервисного аккаунта:
#   aws configure --profile lablabel
param(
  [string]$Bucket   = "lablabel.ru",
  [string]$Profile  = "lablabel",
  [string]$Endpoint = "https://storage.yandexcloud.net",
  [string]$CdnResourceId = ""   # заполните, чтобы автоматически сбрасывать кэш через yc
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  Write-Host "AWS CLI не найден. Установите: https://aws.amazon.com/cli/" -ForegroundColor Red
  exit 1
}

$common = @(
  "--endpoint-url", $Endpoint,
  "--profile", $Profile,
  "--exclude", "functions/*",
  "--exclude", "serve.js",
  "--exclude", "deploy.ps1",
  "--exclude", "README.md",
  "--exclude", ".git/*",
  "--exclude", "*.ps1"
)

Write-Host "Загружаю статику (кэш на год)..." -ForegroundColor Cyan
aws s3 sync . "s3://$Bucket" @common --exclude "*.html" --exclude "robots.txt" --exclude "sitemap.xml" --cache-control "public, max-age=31536000, immutable" --delete
if ($LASTEXITCODE -ne 0) { throw "sync assets failed" }

Write-Host "Загружаю HTML (без кэша)..." -ForegroundColor Cyan
aws s3 sync . "s3://$Bucket" @common --exclude "*" --include "*.html" --include "robots.txt" --include "sitemap.xml" --cache-control "public, max-age=0, must-revalidate"
if ($LASTEXITCODE -ne 0) { throw "sync html failed" }

if ($CdnResourceId) {
  if (Get-Command yc -ErrorAction SilentlyContinue) {
    Write-Host "Сбрасываю кэш CDN..." -ForegroundColor Cyan
    yc cdn cache purge --resource-id $CdnResourceId --path "/*"
  } else {
    Write-Host "yc CLI не найден — кэш CDN не сброшен." -ForegroundColor Yellow
  }
}

Write-Host "Готово: https://$Bucket/" -ForegroundColor Green
