Add-Type -AssemblyName System.Drawing

function Create-LogoBitmap([float]$size) {
    $bmp = New-Object System.Drawing.Bitmap([int]$size, [int]$size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)

    [float]$scale = $size / 32.0

    # Colors
    $outerBg = [System.Drawing.ColorTranslator]::FromHtml("#14151c")
    $outerBorder = [System.Drawing.ColorTranslator]::FromHtml("#282a38")
    $archFill = [System.Drawing.ColorTranslator]::FromHtml("#1b1d28")
    $amberBrand = [System.Drawing.ColorTranslator]::FromHtml("#f59e0b")
    $amberGlow = [System.Drawing.ColorTranslator]::FromHtml("#fbbf24")
    $bronze = [System.Drawing.ColorTranslator]::FromHtml("#d97706")
    $lightGold = [System.Drawing.ColorTranslator]::FromHtml("#fde68a")

    # 1. Outer rounded tile
    [float]$radius = 8.0 * $scale
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0.0, 0.0, ($radius * 2), ($radius * 2), 180.0, 90.0)
    $path.AddArc(($size - $radius * 2 - 1), 0.0, ($radius * 2), ($radius * 2), 270.0, 90.0)
    $path.AddArc(($size - $radius * 2 - 1), ($size - $radius * 2 - 1), ($radius * 2), ($radius * 2), 0.0, 90.0)
    $path.AddArc(0.0, ($size - $radius * 2 - 1), ($radius * 2), ($radius * 2), 90.0, 90.0)
    $path.CloseFigure()

    $brushOuter = New-Object System.Drawing.SolidBrush($outerBg)
    $g.FillPath($brushOuter, $path)
    $penOuter = New-Object System.Drawing.Pen($outerBorder, [Math]::Max(1.0, 1.5 * $scale))
    $g.DrawPath($penOuter, $path)

    # 2. Vault arch
    $archPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $archPath.AddArc((8.0 * $scale), (4.0 * $scale), (16.0 * $scale), (16.0 * $scale), 180.0, 180.0)
    $archPath.AddLine((24.0 * $scale), (12.0 * $scale), (24.0 * $scale), (24.0 * $scale))
    $archPath.AddArc((20.0 * $scale), (24.0 * $scale), (4.0 * $scale), (4.0 * $scale), 0.0, 90.0)
    $archPath.AddLine((22.0 * $scale), (28.0 * $scale), (12.0 * $scale), (28.0 * $scale))
    $archPath.AddArc((8.0 * $scale), (24.0 * $scale), (4.0 * $scale), (4.0 * $scale), 90.0, 90.0)
    $archPath.AddLine((8.0 * $scale), (26.0 * $scale), (8.0 * $scale), (12.0 * $scale))
    $archPath.CloseFigure()

    $brushArch = New-Object System.Drawing.SolidBrush($archFill)
    $g.FillPath($brushArch, $archPath)
    $penArch = New-Object System.Drawing.Pen($amberBrand, [Math]::Max(1.0, 1.25 * $scale))
    $g.DrawPath($penArch, $archPath)

    # 3. Stem forming '1'
    $penStem = New-Object System.Drawing.Pen($amberGlow, [Math]::Max(1.5, 2.2 * $scale))
    $penStem.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penStem.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($penStem, (13.0 * $scale), (11.0 * $scale), (16.0 * $scale), (8.0 * $scale))
    $g.DrawLine($penStem, (16.0 * $scale), (8.0 * $scale), (16.0 * $scale), (24.0 * $scale))

    # 4. Right branch arc
    $penBranch = New-Object System.Drawing.Pen($bronze, [Math]::Max(1.2, 1.75 * $scale))
    $penBranch.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penBranch.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawArc($penBranch, (11.5 * $scale), (15.0 * $scale), (9.0 * $scale), (9.0 * $scale), 270.0, 90.0)

    # 5. Nodes
    [float]$r = 1.8 * $scale
    $b1 = New-Object System.Drawing.SolidBrush($lightGold)
    $g.FillEllipse($b1, (16.0 * $scale - $r), (8.0 * $scale - $r), ($r * 2), ($r * 2))

    $b2 = New-Object System.Drawing.SolidBrush($amberBrand)
    $g.FillEllipse($b2, (16.0 * $scale - $r), (24.0 * $scale - $r), ($r * 2), ($r * 2))

    $b3 = New-Object System.Drawing.SolidBrush($amberGlow)
    $g.FillEllipse($b3, (20.5 * $scale - $r), (19.5 * $scale - $r), ($r * 2), ($r * 2))

    $g.Dispose()
    return $bmp
}

$outDir = "C:\Users\javku\Desktop\gemini\OneGitVault\assets\icons"
$bmp256 = Create-LogoBitmap 256.0
$bmp256.Save("$outDir\onegitvault.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp128 = Create-LogoBitmap 128.0
$bmp64 = Create-LogoBitmap 64.0
$bmp48 = Create-LogoBitmap 48.0
$bmp32 = Create-LogoBitmap 32.0
$bmp16 = Create-LogoBitmap 16.0

# Build multi-resolution ICO file
$images = @($bmp256, $bmp128, $bmp64, $bmp48, $bmp32, $bmp16)
$pngBytesList = @()

foreach ($img in $images) {
    $ms = New-Object System.IO.MemoryStream
    $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytesList += ,$ms.ToArray()
    $ms.Dispose()
}

$icoPath = "$outDir\onegitvault.ico"
$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICONDIR header: idReserved (0), idType (1 for ICO), idCount
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$images.Count)

$offset = 6 + (16 * $images.Count)

for ($i = 0; $i -lt $images.Count; $i++) {
    $img = $images[$i]
    $bytes = $pngBytesList[$i]
    $w = if ($img.Width -ge 256) { 0 } else { $img.Width }
    $h = if ($img.Height -ge 256) { 0 } else { $img.Height }

    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0)   # color count
    $bw.Write([byte]0)   # reserved
    $bw.Write([uint16]1) # color planes
    $bw.Write([uint16]32)# bpp
    $bw.Write([uint32]$bytes.Length)
    $bw.Write([uint32]$offset)

    $offset += $bytes.Length
}

for ($i = 0; $i -lt $images.Count; $i++) {
    $bw.Write($pngBytesList[$i])
}

$bw.Flush()
$bw.Dispose()
$fs.Dispose()

Write-Host "SUCCESS: Generated $outDir\onegitvault.ico and $outDir\onegitvault.png"
