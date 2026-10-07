# ============================================================
#  学习手帐 · 网页版 启动器（与桌面组件共用同一浏览器配置）
#  用途：用同一个专属 Edge 配置目录 (.edge-profile) 打开网页版，
#        这样网页版和桌面小组件读写的是同一份本地数据，能实时同步。
#  注意：以后请用这个启动器打开网页版，不要直接双击 index.html，
#        否则会进入另一个浏览器配置，数据就和小组件不同步了。
# ============================================================
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path -LiteralPath $edge)) { $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path -LiteralPath $edge)) { Write-Output "找不到 msedge.exe"; exit 1 }

$profile = "D:\mywork\study\.edge-profile"
if (-not (Test-Path -LiteralPath $profile)) { New-Item -ItemType Directory -Path $profile -Force | Out-Null }

$appUrl = "file:///D:/mywork/study/index.html"
try {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $edge
  $psi.Arguments = "--user-data-dir=$profile $appUrl"
  $psi.UseShellExecute = $true
  [System.Diagnostics.Process]::Start($psi) | Out-Null
  Write-Output "已用共享配置打开网页版：$appUrl"
} catch {
  Write-Output ("打开网页版出错：" + $_.Exception.Message)
}
