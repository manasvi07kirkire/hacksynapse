# Sync .env to Vercel (production + preview). Run from Search-Ops root.
param(
  [string]$EnvFile = ".env",
  [string]$AppUrl = "https://searchops-vert.vercel.app"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot/..

if (-not (Test-Path $EnvFile)) { throw "Missing $EnvFile" }

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $idx = $_.IndexOf('=')
  $key = $_.Substring(0, $idx).Trim()
  $val = $_.Substring($idx + 1).Trim().Trim('"')
  if ($key) { $vars[$key] = $val }
}

# Production-safe overrides
$vars["NEXT_PUBLIC_APP_URL"] = $AppUrl
$vars["SEARCHOPS_ALLOW_PAT"] = "false"
$vars["SEARCHOPS_LOCAL_DEMO"] = "false"
$vars["SEARCHOPS_ALLOW_PRIVATE_CRAWL"] = "false"
$vars["NODE_ENV"] = "production"

# Supabase: transaction pooler for serverless
if ($vars["DATABASE_URL"] -match ':5432/') {
  $vars["DATABASE_URL"] = $vars["DATABASE_URL"] -replace ':5432/', ':6543/'
}

$skip = @("NODE_ENV")
foreach ($target in @("production", "preview")) {
  foreach ($entry in $vars.GetEnumerator()) {
    if ($skip -contains $entry.Key) { continue }
    if ([string]::IsNullOrWhiteSpace($entry.Value)) { continue }
    Write-Host "Setting $($entry.Key) ($target)..."
    $entry.Value | npx vercel env add $entry.Key $target --force --yes 2>&1 | Out-Null
  }
}

Write-Host "Done. Redeploy with: npx vercel deploy --prod --yes"
