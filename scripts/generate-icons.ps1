Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $rootDir "assets"
$publicDir = Join-Path $rootDir "public"

New-Item -ItemType Directory -Force -Path $assetsDir, $publicDir | Out-Null

function Draw-MissionControlIcon([int]$size) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = [double]$size / 256.0

    # 1. Background Squircle
    $r = 48.0 * $scale
    $pad = 10.0 * $scale
    $rectSize = [double]$size - (2.0 * $pad)
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $d = $r * 2.0
    $path.AddArc([float]$pad, [float]$pad, [float]$d, [float]$d, 180, 90)
    $path.AddArc([float]($pad + $rectSize - $d), [float]$pad, [float]$d, [float]$d, 270, 90)
    $path.AddArc([float]($pad + $rectSize - $d), [float]($pad + $rectSize - $d), [float]$d, [float]$d, 0, 90)
    $path.AddArc([float]$pad, [float]($pad + $rectSize - $d), [float]$d, [float]$d, 90, 90)
    $path.CloseFigure()

    $bgBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 12, 12, 14))
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 45, 45, 52), [float](4.0 * $scale))
    $g.FillPath($bgBrush, $path)
    $g.DrawPath($borderPen, $path)

    # 2. Radar range rings
    $ringPen1 = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 35, 35, 42), [float](2.0 * $scale))
    $ringPen1.DashPattern = [float[]]@(4.0, 5.0)
    $r1 = 86.0 * $scale
    $cx = [double]$size / 2.0
    $cy = [double]$size / 2.0
    $g.DrawEllipse($ringPen1, [float]($cx - $r1), [float]($cy - $r1), [float]($r1 * 2), [float]($r1 * 2))

    $ringPen2 = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 50, 50, 60), [float](2.0 * $scale))
    $r2 = 54.0 * $scale
    $g.DrawEllipse($ringPen2, [float]($cx - $r2), [float]($cy - $r2), [float]($r2 * 2), [float]($r2 * 2))

    # 3. Precision tick marks
    $tickPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 160, 160, 175), [float](3.0 * $scale))
    $tickPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $tickPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($tickPen, [float]$cx, [float](20.0 * $scale), [float]$cx, [float](36.0 * $scale))
    $g.DrawLine($tickPen, [float]$cx, [float](220.0 * $scale), [float]$cx, [float](236.0 * $scale))
    $g.DrawLine($tickPen, [float](20.0 * $scale), [float]$cy, [float](36.0 * $scale), [float]$cy)
    $g.DrawLine($tickPen, [float](220.0 * $scale), [float]$cy, [float](236.0 * $scale), [float]$cy)

    # 4. Ascent Delta Chevron
    $deltaPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $p1 = [System.Drawing.PointF]::new([float](128.0 * $scale), [float](62.0 * $scale))
    $p2 = [System.Drawing.PointF]::new([float](184.0 * $scale), [float](180.0 * $scale))
    $p3 = [System.Drawing.PointF]::new([float](128.0 * $scale), [float](154.0 * $scale))
    $p4 = [System.Drawing.PointF]::new([float](72.0 * $scale), [float](180.0 * $scale))
    $deltaPath.AddPolygon([System.Drawing.PointF[]]@($p1, $p2, $p3, $p4))

    $deltaBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 245, 245, 247))
    $deltaPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255), [float](2.0 * $scale))
    $deltaPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.FillPath($deltaBrush, $deltaPath)
    $g.DrawPath($deltaPen, $deltaPath)

    # 5. Core Emerald Beacon
    $glowPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 16, 185, 129), [float](2.5 * $scale))
    $beaconR = 15.0 * $scale
    $beaconY = 122.0 * $scale
    $g.DrawEllipse($glowPen, [float]($cx - $beaconR), [float]($beaconY - $beaconR), [float]($beaconR * 2), [float]($beaconR * 2))

    $coreBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 16, 185, 129))
    $coreR = 9.0 * $scale
    $g.FillEllipse($coreBrush, [float]($cx - $coreR), [float]($beaconY - $coreR), [float]($coreR * 2), [float]($coreR * 2))

    $g.Dispose()
    return $bmp
}

$bmp256 = Draw-MissionControlIcon 256
$pngPath1 = Join-Path $assetsDir "icon.png"
$pngPath2 = Join-Path $publicDir "icon.png"
$bmp256.Save($pngPath1, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp256.Save($pngPath2, [System.Drawing.Imaging.ImageFormat]::Png)

$icon = [System.Drawing.Icon]::FromHandle($bmp256.GetHicon())
$icoPath1 = Join-Path $assetsDir "icon.ico"
$icoPath2 = Join-Path $publicDir "favicon.ico"

$fs1 = [System.IO.File]::Create($icoPath1)
$icon.Save($fs1)
$fs1.Close()

$fs2 = [System.IO.File]::Create($icoPath2)
$icon.Save($fs2)
$fs2.Close()

Write-Output "Successfully generated assets\icon.png, assets\icon.ico, public\icon.png, public\favicon.ico"
