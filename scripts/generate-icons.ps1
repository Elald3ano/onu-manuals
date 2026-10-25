# Genera los iconos PWA (PNG) de onu-manuals usando GDI+ (solo Windows).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
param(
    [string]$OutDir = (Join-Path (Split-Path $PSScriptRoot -Parent) 'public')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$Background = [System.Drawing.ColorTranslator]::FromHtml('#0f172a')
$Accent     = [System.Drawing.ColorTranslator]::FromHtml('#2563eb')
$White      = [System.Drawing.Color]::White

function New-AppIcon {
    param(
        [int]$Size,
        [string]$FileName,
        [bool]$AccentBar = $true
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear($Background)

    $textOffsetY = 0.0

    if ($AccentBar) {
        $barHeight = [Math]::Max(4, [int]($Size * 0.06))
        $accentBrush = New-Object System.Drawing.SolidBrush($Accent)
        $graphics.FillRectangle($accentBrush, 0, 0, $Size, $barHeight)
        $accentBrush.Dispose()
        $textOffsetY = $barHeight
    }

    $font = New-Object System.Drawing.Font('Segoe UI', [single]($Size * 0.26), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush($White)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $layout = New-Object System.Drawing.RectangleF(0, $textOffsetY, [single]$Size, [single]$Size)
    $graphics.DrawString('ONU', $font, $textBrush, $layout, $format)

    $format.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    $graphics.Dispose()

    $target = Join-Path $OutDir $FileName
    $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Host "OK  $target"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

New-AppIcon -Size 180 -FileName 'apple-touch-icon.png' -AccentBar $false
New-AppIcon -Size 192 -FileName 'pwa-192x192.png'
New-AppIcon -Size 512 -FileName 'pwa-512x512.png'
New-AppIcon -Size 512 -FileName 'maskable-512x512.png' -AccentBar $false
