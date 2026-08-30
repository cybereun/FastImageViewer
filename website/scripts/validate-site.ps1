[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$siteRoot = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $siteRoot "index.html"
$cssPath = Join-Path $siteRoot "styles.css"
$scriptPath = Join-Path $siteRoot "script.js"

function Assert-Condition {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw "FAIL: $Message"
    }

    Write-Host "PASS: $Message" -ForegroundColor Green
}

Assert-Condition (Test-Path -LiteralPath $htmlPath) "index.html exists"
Assert-Condition (Test-Path -LiteralPath $cssPath) "styles.css exists"
Assert-Condition (Test-Path -LiteralPath $scriptPath) "script.js exists"

$html = Get-Content -LiteralPath $htmlPath -Raw
$css = Get-Content -LiteralPath $cssPath -Raw
$script = Get-Content -LiteralPath $scriptPath -Raw

$requiredFragments = @(
    @{ Pattern = '<html lang="ko">'; Message = "Korean document language is declared" },
    @{ Pattern = 'href="#main-content"'; Message = "skip link is present" },
    @{ Pattern = '<header'; Message = "header landmark is present" },
    @{ Pattern = '<nav[^>]+id="primary-nav"'; Message = "primary navigation is present" },
    @{ Pattern = '<main id="main-content"'; Message = "main landmark is present" },
    @{ Pattern = 'id="features"'; Message = "features section is present" },
    @{ Pattern = 'id="experience"'; Message = "local-first section is present" },
    @{ Pattern = 'id="releases"'; Message = "release section is present" },
    @{ Pattern = 'id="faq"'; Message = "FAQ section is present" },
    @{ Pattern = '<footer'; Message = "footer landmark is present" },
    @{ Pattern = 'Lebi_Cybereun'; Message = "developer credit is present" },
    @{ Pattern = '© 2026 Lebi_Cybereun'; Message = "copyright notice is present" },
    @{ Pattern = 'MIT License'; Message = "MIT license notice is present" },
    @{ Pattern = 'mailto:cybereunny@gmail.com'; Message = "contact email is present" },
    @{ Pattern = 'prefers-reduced-motion'; Message = "reduced-motion support is present" },
    @{ Pattern = 'aria-live="polite"'; Message = "release filter status is announced" },
    @{ Pattern = 'data-filter-button'; Message = "release filter enhancement is present" },
    @{ Pattern = 'details'; Message = "native FAQ disclosure markup is present" }
)

foreach ($fragment in $requiredFragments) {
    Assert-Condition ($html -match $fragment.Pattern -or $css -match $fragment.Pattern -or $script -match $fragment.Pattern) $fragment.Message
}

Assert-Condition ($html -notmatch 'GitHub에서 전체 릴리즈 보기|소스 코드와 전체 문서 보기|GitHub 소스 코드') "GitHub overview/source labels are removed"
Assert-Condition ($html -notmatch 'href="https://github.com/cybereun/FastImageViewer/releases"') "GitHub full-release link is removed"
Assert-Condition ($html -notmatch 'href="https://github.com/cybereun/FastImageViewer"') "GitHub source link is removed"

foreach ($asset in @(
    "FastImage-2.0.6-Windows-Setup.exe",
    "FastImage-2.0.6-Windows-Portable.exe",
    "FastImage-2.0.5-Windows-Portable.exe",
    "FastImage-2.0.4-Windows-Portable.exe",
    "FastImage-2.0.3-Windows-Portable.exe",
    "FastImage-2.0.2-Windows-Portable.exe",
    "FastImage-2.0.1-Windows-Portable.exe",
    "FastImage-2.0.0-Windows-Portable.exe"
)) {
    Assert-Condition ($html.Contains($asset)) "public asset filename is present: $asset"
}

foreach ($tag in @("v2.0.6", "v2.0.5", "v2.0.4", "v2.0.3", "v2.0.2", "v2.0.1", "v2.0.0")) {
    Assert-Condition ($html.Contains("releases/tag/$tag")) "release notes link is present: $tag"
    Assert-Condition ($html.Contains("releases/download/$tag/")) "download link is present: $tag"
}

$releaseCards = [regex]::Matches($html, 'data-release-card').Count
Assert-Condition ($releaseCards -eq 7) "exactly seven release cards are present"

$releaseTags = [regex]::Matches($html, 'data-release-types="[^"]*"').Count
Assert-Condition ($releaseTags -eq 7) "each release card declares filter types"

$remoteUrls = [regex]::Matches($html, 'https?://[^"''\s<]+') | ForEach-Object { $_.Value }
foreach ($url in $remoteUrls) {
    $isApprovedProjectUrl = $url.StartsWith("https://github.com/cybereun/FastImageViewer")
    $isSvgNamespace = $url -eq "http://www.w3.org/2000/svg"
    Assert-Condition ($isApprovedProjectUrl -or $isSvgNamespace) "external URL is an approved project or SVG namespace URL: $url"
}

Assert-Condition ($html -notmatch 'src="https?://|href="https?://fonts') "no remote runtime assets or web fonts are referenced"
Assert-Condition ($html -notmatch 'NEEDS CLARIFICATION|TODO\(') "no unresolved planning placeholders are in the page"
Assert-Condition ($script -match 'IntersectionObserver') "reveal behavior has a lightweight observer path"
Assert-Condition ($script -match 'prefers-reduced-motion') "JavaScript checks reduced-motion preference"

Write-Host "Site validation complete." -ForegroundColor Cyan
