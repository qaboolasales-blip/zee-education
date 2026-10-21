<#
.SYNOPSIS
    Rebuilds the Zee Education Hostinger installer package from source.

.DESCRIPTION
    Reproducible build. Everything in the package comes from two places only:

      1. backend/            - the deployable application (app, public, composer files)
      2. release/package-assets/ - the static package furniture (root files,
                                   documentation/, database/README.md, tools/)

    Production dependencies are installed with `composer install --no-dev
    --optimize-autoloader` into a scratch directory, so the shipped vendor tree
    never contains phpunit/faker/vfsstream and the autoloader always knows
    about the current App\ classes.

    The package is verified twice: once on the build tree and once on the
    EXTRACTED zip, because that is what the buyer actually receives.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File release\build-package.ps1 `
        -Composer C:\path\to\composer.phar
#>
[CmdletBinding()]
param(
    [string] $Root = (Split-Path -Parent $PSScriptRoot),
    [string] $Composer = '',
    [switch] $SkipZip
)

$ErrorActionPreference = 'Stop'

$pkgName = 'Zee_Education_v0.1.0'
$stage   = Join-Path $Root "release\staging\$pkgName"
$assets  = Join-Path $Root 'release\package-assets'
$zip     = Join-Path $Root "release\${pkgName}_Hostinger_Installer.zip"
$scratch = Join-Path $env:TEMP 'zee_pkg_build'

function Say([string] $m) { Write-Host $m }

# Native tools (php, composer, git) write progress to stderr. PowerShell turns
# that into a terminating error when $ErrorActionPreference is Stop, so every
# native call runs with the preference relaxed and the exit code inspected.
function Invoke-Native([string] $exe, [string[]] $arguments, [string] $cwd = $null) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($cwd) { Push-Location -LiteralPath $cwd }
        $out = & $exe @arguments 2>&1
        $code = $LASTEXITCODE
        if ($cwd) { Pop-Location }
    } finally {
        $ErrorActionPreference = $previous
    }
    foreach ($line in $out) { Write-Host "    $line" }
    if ($code -ne 0) { Write-Host "    (exit code $code)"; throw "$exe exited with $code" }
}

function Copy-Tree([string] $from, [string] $to) {
    if (Test-Path -LiteralPath $to) { Remove-Item -LiteralPath $to -Recurse -Force }
    robocopy $from $to /E /NFL /NDL /NJH /NJS /NP /NC /NS | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $from -> $to" }
}

# ---------------------------------------------------------------- 0. preflight
foreach ($p in @("$Root\backend\app", "$Root\backend\public", $assets)) {
    if (-not (Test-Path -LiteralPath $p)) { throw "Missing source: $p" }
}
if ($Composer -eq '' -or -not (Test-Path -LiteralPath $Composer)) {
    throw 'Pass -Composer <path to composer.phar>. Composer is required to build the production vendor tree.'
}

Say '==> 1. Rebuilding staging tree'
if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null
New-Item -ItemType Directory -Path "$stage\application" -Force | Out-Null

Copy-Tree "$Root\backend\app"    "$stage\application\app"
Copy-Tree "$Root\backend\public" "$stage\application\public"

foreach ($f in @('composer.json', 'composer.lock', 'preload.php', 'spark')) {
    Copy-Item -LiteralPath "$Root\backend\$f" -Destination "$stage\application\$f" -Force
}
Copy-Item -LiteralPath "$assets\root\.env.example" -Destination "$stage\application\.env.example" -Force

Copy-Tree "$assets\documentation" "$stage\documentation"
# Provider-facing billing API reference: single source is backend/docs/api/,
# shipped to buyers as guide 11 so the billing feature is usable from the package.
Copy-Item -LiteralPath "$Root\backend\docs\api\billing-api.md" -Destination "$stage\documentation\11-billing-api.md" -Force
Copy-Tree "$assets\database"       "$stage\database"
Copy-Tree "$assets\tools"          "$stage\tools"
foreach ($f in @('README_FIRST.txt', 'LICENSE.txt', 'CHANGELOG.md', '.env.example')) {
    Copy-Item -LiteralPath "$assets\root\$f" -Destination "$stage\$f" -Force
}

Say '==> 2. Installing production dependencies (no dev)'

$useZip = $false
$loaded = php -r "echo in_array('zip', get_loaded_extensions()) ? 1 : 0;" 2>$null
if ($loaded -ne '1') { $useZip = $true }

if (Test-Path -LiteralPath $scratch) { Remove-Item -LiteralPath $scratch -Recurse -Force }
New-Item -ItemType Directory -Path $scratch -Force | Out-Null
Copy-Item -LiteralPath "$Root\backend\composer.json" -Destination $scratch -Force
Copy-Item -LiteralPath "$Root\backend\composer.lock" -Destination $scratch -Force
Copy-Tree "$Root\backend\app" "$scratch\app"
Copy-Tree "$Root\backend\public" "$scratch\public"

$phpArgs = @()
if ($useZip) { $phpArgs += @('-d', 'extension=php_zip') }

& Invoke-Native 'php' @($phpArgs + @($Composer, 'install', '--no-dev', '--optimize-autoloader', '--no-interaction', '--no-progress', '--working-dir', $scratch))

Copy-Tree "$scratch\vendor" "$stage\application\vendor"

# The framework ships its own test suite. It is not part of the product, it
# triggers the verifier's "test folder shipped" warning, and the previous
# release did not contain it.
$frameworkTests = "$stage\application\vendor\codeigniter4\framework\tests"
if (Test-Path -LiteralPath $frameworkTests) {
    Remove-Item -LiteralPath $frameworkTests -Recurse -Force
    Say '    removed vendor/codeigniter4/framework/tests (framework test suite)'
}

# endroid/qr-code ships two label fonts (16.6 MB). They are only read when a
# QR code carries a TEXT LABEL or a LOGO - see Label.php / Logo.php / NotoSans.php.
# app/Libraries/QrRenderer.php renders a bare SVG with no label and no logo, so
# nothing in the product ever opens them. Shipping 16 MB of unused font would
# bloat every buyer download for no benefit.
#   If a label is ever added, these files must come back with it.
$qrcAssets = "$stage\application\vendor\endroid\qr-code\assets"
if (Test-Path -LiteralPath $qrcAssets) {
    Get-ChildItem -LiteralPath $qrcAssets -Include *.otf, *.ttf -Recurse | Remove-Item -Force
    Say '    removed endroid/qr-code label fonts (unused: QrRenderer sets no label)'
}

Say '==> 3. Rebuilding writable skeleton'
$writable = "$stage\application\writable"
if (Test-Path -LiteralPath $writable) { Remove-Item -LiteralPath $writable -Recurse -Force }
foreach ($d in @('cache', 'debugbar', 'logs', 'session', 'uploads')) {
    New-Item -ItemType Directory -Path "$writable\$d" -Force | Out-Null
    Set-Content -LiteralPath "$writable\$d\index.html" -Value '' -NoNewline
}

function Write-Utf8NoBom([string] $path, [string] $text) {
    [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

$files    = Get-ChildItem -LiteralPath $stage -Recurse -File
$bytes    = ($files | Measure-Object -Property Length -Sum).Sum
$commit   = $null
try { $commit = (git -C $Root rev-parse HEAD 2>$null) } catch { $commit = $null }
if (-not $commit) { $commit = $null }

$manifest = [ordered]@{
    note         = 'Source manifest of the packaged tree. Paths are relative to Zee_Education_v0.1.0/. file_count and total_bytes include this file.'
    version      = '0.1.0'
    release_type = 'pre-release'
    build_date   = (Get-Date -Format 'yyyy-MM-dd')
    git_commit   = $commit
    git_tag      = $null
    file_count   = $files.Count
    total_bytes  = $bytes
    surfaces     = @('Super Admin portal (/portal)', 'School dashboard (/school)', 'Mobile PWA (/m)', 'Installer (/install)')
    api          = @(
        'GET /api/health', 'GET /api/school/students', 'POST /api/school/students',
        'GET /api/school/invoices', 'POST /api/school/staff', 'POST /api/school/attendance',
        'POST /api/school/fees/invoices', 'POST /api/school/fees/receipts',
        'GET /admin/schools', 'POST /admin/schools', 'POST /admin/schools/provision',
        'GET /api/admin/billing/summary', 'GET /api/admin/billing/upcomings',
        'GET /api/admin/billing/invoices/{school_id}',
        'POST /api/admin/billing/issue', 'POST /api/admin/billing/invoice',
        'POST /api/admin/billing/pay', 'POST /api/admin/billing/void',
        'POST /api/admin/billing/revoke', 'POST /api/admin/billing/renew'
    )
    pwa         = @('public/manifest.json', 'public/sw.js')
    top_level   = @('application/', 'database/', 'documentation/', 'tools/', 'README_FIRST.txt', 'LICENSE.txt', 'CHANGELOG.md', 'package-manifest.json', '.env.example')
}

# The manifest counts itself, so writing it changes what it should report. Loop
# until the numbers it holds are the numbers a file count of the finished tree
# actually returns (stable in two or three passes).
$manifestPath = "$stage\package-manifest.json"
for ($pass = 0; $pass -lt 5; $pass++) {
    $manifestJson = $manifest | ConvertTo-Json -Depth 5
    Write-Utf8NoBom $manifestPath $manifestJson

    $now      = Get-ChildItem -LiteralPath $stage -Recurse -File
    $nowBytes = ($now | Measure-Object -Property Length -Sum).Sum
    if ($manifest.file_count -eq $now.Count -and $manifest.total_bytes -eq $nowBytes) {
        break
    }
    $manifest.file_count  = $now.Count
    $manifest.total_bytes = $nowBytes
}
if ($manifest.file_count -ne (Get-ChildItem -LiteralPath $stage -Recurse -File).Count) {
    throw 'package-manifest.json counts did not converge'
}
Write-Utf8NoBom "$Root\release\source-manifest.json" ($manifest | ConvertTo-Json -Depth 5)
Say "    manifest: $($manifest.file_count) files, $($manifest.total_bytes) bytes (verified)"

Say '==> 5. Verifying build tree'
& Invoke-Native 'php' @("$stage\tools\verify-package.php")

if ($SkipZip) { Say 'Skipping zip ( -SkipZip ).'; return }

Say '==> 6. Building zip'
if (Test-Path -LiteralPath $zip) {
    $bak = "$zip.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Move-Item -LiteralPath $zip -Destination $bak
    Say "    previous package kept as $(Split-Path $bak -Leaf)"
}
if (Test-Path -LiteralPath $scratch) { Remove-Item -LiteralPath $scratch -Recurse -Force }
Compress-Archive -LiteralPath $stage -DestinationPath $zip -CompressionLevel Optimal -Force

Say '==> 7. Verifying the EXTRACTED package'
$extract = Join-Path $env:TEMP 'zee_pkg_verify'
if (Test-Path -LiteralPath $extract) { Remove-Item -LiteralPath $extract -Recurse -Force }
New-Item -ItemType Directory -Path $extract -Force | Out-Null
Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
& Invoke-Native 'php' @("$extract\$pkgName\tools\verify-package.php")

Say '==> 8. Checksums'
$zipHash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLower()
Write-Utf8NoBom "$Root\release\SHA256SUMS.txt" "$zipHash  $pkgName`_Hostinger_Installer.zip"
Say "    $zipHash"

$zippedFiles = (Get-ChildItem -LiteralPath $extract -Recurse -File).Count
Say "    package files: $zippedFiles"
Say 'BUILD OK'
