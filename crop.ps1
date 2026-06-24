param(
    [string]$ImagePath,
    [string]$OutputDir,
    [string]$Prefix
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $ImagePath)) {
    Write-Error "Source image not found: $ImagePath"
    exit 1
}

$src = [System.Drawing.Image]::FromFile($ImagePath)
$w = $src.Width / 3
$h = $src.Height / 3

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
}

$count = 1
for ($y = 0; $y -lt 3; $y++) {
    for ($x = 0; $x -lt 3; $x++) {
        # Force integer dimensions
        $intW = [int][Math]::Floor($w)
        $intH = [int][Math]::Floor($h)
        
        $bmp = New-Object System.Drawing.Bitmap($intW, $intH)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        
        # High quality rendering parameters
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        
        $srcRect = New-Object System.Drawing.Rectangle([int][Math]::Floor($x * $w), [int][Math]::Floor($y * $h), $intW, $intH)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $intW, $intH)
        
        $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Dispose()
        
        $outPath = Join-Path $OutputDir "$Prefix`_$count.png"
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        $count++
    }
}
$src.Dispose()
Write-Output "Successfully sliced $ImagePath into 9 images under $OutputDir with prefix $Prefix"
