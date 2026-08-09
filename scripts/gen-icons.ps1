# Sinh icon PWA (icon-512.png, icon-192.png, apple-touch-icon 180.png) từ đúng logo trong app
# (icons.notebookT trong src/App.tsx: sổ tay gáy lò xo + chữ T), thay cho ảnh clipart "My Notes" cũ
# không liên quan gì tới thương hiệu. Không có sẵn công cụ raster SVG trên máy này nên vẽ thẳng
# bằng GDI+ (System.Drawing) theo đúng toạ độ của bản SVG gốc (viewBox 0 0 32 32), quy về pixel.
Add-Type -AssemblyName System.Drawing

function New-IconBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # Nền: indigo thương hiệu hiện tại (--c-primary bản sáng, xem DESIGN.md) — full-bleed, không bo
  # góc (hệ điều hành tự cắt góc/mask maskable, ảnh nguồn phải là hình vuông đặc).
  $bg = [System.Drawing.Color]::FromArgb(255, 0x2d, 0x3a, 0x94)
  $g.Clear($bg)

  # Quy đổi toạ độ SVG (viewBox 0 0 32 32, tâm nội dung ~(16.35,16.0)) sang pixel, co về vùng an
  # toàn giữa khung (safe zone icon maskable: bán kính 80% nằm giữa) rồi canh giữa khung ảnh.
  $s = $size * (11.2 / 512.0)
  $cx = $size / 2.0
  $cy = $size / 2.0
  $svgCx = 16.35
  $svgCy = 16.0
  function Px([double]$x, [double]$y) {
    return New-Object System.Drawing.PointF (($cx + ($x - $svgCx) * $s), ($cy + ($y - $svgCy) * $s))
  }

  $white = [System.Drawing.Color]::White
  $penCover = New-Object System.Drawing.Pen $white, (2.0 * $s)
  $penCover.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $penRing = New-Object System.Drawing.Pen $white, (2.0 * $s)
  $penRing.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penRing.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penT = New-Object System.Drawing.Pen $white, (2.4 * $s)
  $penT.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penT.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  # Bìa sổ: rect x=8.5 y=3.5 w=20 h=25 rx=3.2 (bo góc), chỉ viền không tô.
  $rx = 3.2 * $s
  $rectPt = Px 8.5 3.5
  $rectW = 20.0 * $s
  $rectH = 25.0 * $s
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $rx * 2
  $path.AddArc($rectPt.X, $rectPt.Y, $d, $d, 180, 90)
  $path.AddArc($rectPt.X + $rectW - $d, $rectPt.Y, $d, $d, 270, 90)
  $path.AddArc($rectPt.X + $rectW - $d, $rectPt.Y + $rectH - $d, $d, $d, 0, 90)
  $path.AddArc($rectPt.X, $rectPt.Y + $rectH - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.DrawPath($penCover, $path)

  # Gáy lò xo: 3 vòng xoắn nằm ngang tại y = 8.5 / 16 / 23.5
  foreach ($y in @(8.5, 16.0, 23.5)) {
    $p1 = Px 8.5 $y
    $p2 = Px 4.2 $y
    $g.DrawLine($penRing, $p1, $p2)
  }

  # Chữ T trên mặt sổ
  $th1 = Px 13.4 11.2
  $th2 = Px 23.6 11.2
  $g.DrawLine($penT, $th1, $th2)
  $tv1 = Px 18.5 11.2
  $tv2 = Px 18.5 21.6
  $g.DrawLine($penT, $tv1, $tv2)

  $g.Dispose()
  return $bmp
}

$outDir = "C:\Users\LENOVO\Downloads\drtrong\public"

$bmp512 = New-IconBitmap 512
$bmp512.Save("$outDir\icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp192 = New-IconBitmap 192
$bmp192.Save("$outDir\icon-192.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp180 = New-IconBitmap 180
$bmp180.Save("$outDir\apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp512.Dispose(); $bmp192.Dispose(); $bmp180.Dispose()
Write-Host "OK: icon-512.png, icon-192.png, apple-touch-icon.png"
