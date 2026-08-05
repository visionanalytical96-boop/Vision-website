<#
    Deploy.ps1

    Deploys a ZIP or HTML file to the matching Windows sync folder.

    Usage:
        Deploy.ps1 "C:\Users\visha\Downloads\website.zip"
        Deploy.ps1 "C:\Users\visha\Downloads\index.html"
#>

param(
    [Parameter(Position = 0)]
    [string]$SourcePath
)

$ErrorActionPreference = 'Stop'

$VisionAnalyticalDestination = 'D:\Vision-Analytical'
$BharatStayDestination = 'D:\BharatStay'

if (-not $SourcePath) {
    Write-Host 'Usage: Deploy.ps1 <path-to-zip-or-html>'
    exit 1
}

if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
    Write-Error "Source file not found: $SourcePath"
    exit 1
}

$SourcePath = (Resolve-Path -LiteralPath $SourcePath).Path
$fileName = Split-Path -Path $SourcePath -Leaf
$extension = [System.IO.Path]::GetExtension($fileName).ToLowerInvariant()

if ($extension -notin @('.zip', '.html')) {
    Write-Error "Unsupported file type '$extension'. Only .zip and .html files are supported."
    exit 1
}

# Route by filename so any file with "vision" in its name lands in the
# Vision Analytical folder; everything else goes to BharatStay.
$Destination = if ($fileName -match 'vision') { $VisionAnalyticalDestination } else { $BharatStayDestination }

Write-Host "Source: $SourcePath"
Write-Host "Destination: $Destination"

if (-not (Test-Path -LiteralPath $Destination -PathType Container)) {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

try {
    if ($extension -eq '.zip') {
        # Clear old content but keep the root folder and hidden sync
        # metadata (e.g. Syncthing's .stfolder) intact.
        Get-ChildItem -LiteralPath $Destination -Force | Where-Object {
            $_.Name -notlike '.*' -and -not ($_.Attributes -band [System.IO.FileAttributes]::Hidden)
        } | ForEach-Object {
            Remove-Item -LiteralPath $_.FullName -Recurse -Force
        }

        Expand-Archive -LiteralPath $SourcePath -DestinationPath $Destination -Force
    }
    else {
        Copy-Item -LiteralPath $SourcePath -Destination $Destination -Force
    }
}
catch {
    Write-Error "Deployment failed: $_"
    exit 1
}

Write-Host "Success: '$fileName' deployed to $Destination"
