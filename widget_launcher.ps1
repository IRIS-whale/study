# ============================================================
#  学习手账 · 桌面小组件 启动 + 置顶（静默运行 v7）
#  v7 改进：彻底消除“先大后小”的闪屏
#   1) 不再依赖预编译 DLL，直接内联 Add-Type，并放在脚本最顶部，
#      使 C# 编译（约1秒）与系统启动并行，而非等 Edge 先弹大窗口。
#   2) 100ms 高频轮询，窗口一出现立刻定成 210x380、右上角、置顶。
#   3) 自愈：先用 pid 文件清理上一个残留启动器，再接管。
# ============================================================

$log      = "D:\mywork\study\widget.log"
$pidFile  = "D:\mywork\study\widget.pid"

function Log($msg) {
  try { Add-Content -LiteralPath $log -Encoding UTF8 -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg) } catch {}
}

# ---- Win32 助手：放在最顶部，编译期间不影响后续流程 ----
try {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int nIndex);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr hWnd);
  [DllImport("gdi32.dll")] public static extern int GetDeviceCaps(IntPtr hdc, int nIndex);
  [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
}
"@
} catch {
  Log ("错误：无法加载 Win32 助手（" + $_.Exception.Message + "）")
  exit 1
}

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path -LiteralPath $edge)) {
  $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
if (-not (Test-Path -LiteralPath $edge)) {
  Log "错误：找不到 msedge.exe"
  exit 1
}

function Get-WidgetWindow {
  Get-Process msedge -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match '学习手' } |
    Select-Object -First 1
}

# ---- 0) 自愈：清理上一个残留的启动器 ----
$prevPid = $null
if (Test-Path -LiteralPath $pidFile) {
  try { $prevPid = (Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1) -as [int] } catch {}
}
if ($prevPid -and $prevPid -ne $PID) {
  $prev = Get-Process -Id $prevPid -ErrorAction SilentlyContinue
  if ($prev -and $prev.ProcessName -eq 'powershell') {
    Log ("清理上一个残留启动器 PID=$prevPid")
    try { Stop-Process -Id $prevPid -Force -ErrorAction SilentlyContinue } catch {}
    Start-Sleep -Milliseconds 400
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

try { Set-Content -LiteralPath $pidFile -Value $PID -Encoding ASCII } catch {}
Log "启动器已开始运行 (PID=$PID)"

$mutex = New-Object System.Threading.Mutex($false, "Global\StudyWidgetTopmost")
$obtained = $false
try {
  try { $obtained = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $obtained = $true; Log "接管废弃锁" }
  if (-not $obtained) {
    try { $obtained = $mutex.WaitOne(2000) } catch [System.Threading.AbandonedMutexException] { $obtained = $true }
  }
  if (-not $obtained) { Log "另一启动器正在运行，本实例退出"; exit }

  # ---- 计算目标尺寸/位置（DPI 自适应） ----
  try { [void][Win32]::SetProcessDPIAware() } catch {}
  $hwndDC = [Win32]::GetDC([IntPtr]::Zero)
  $dpi    = [Win32]::GetDeviceCaps($hwndDC, 88)
  if ($dpi -le 0) { $dpi = 96 }
  [void][Win32]::ReleaseDC([IntPtr]::Zero, $hwndDC)
  $scale    = $dpi / 96.0
  $screenW  = [Win32]::GetSystemMetrics(0)
  $TARGET_W = [int](210 * $scale)
  $TARGET_H = [int](380 * $scale)
  $margin   = [int](14 * $scale)
  $posX = $screenW - $TARGET_W - $margin
  $posY = $margin

  # ---- 确保窗口打开 ----
  $win = Get-WidgetWindow
  if ($win) {
    Log "检测到已有小组件窗口，直接定尺寸置顶"
  } else {
    $appUrl = "file:///D:/mywork/study/index.html#widget"
    try {
      $psi = New-Object System.Diagnostics.ProcessStartInfo
      $psi.FileName = $edge
      $psi.Arguments = "--app=$appUrl --window-size=210,380 --user-data-dir=D:\mywork\study\.edge-profile"
      $psi.UseShellExecute = $true
      [System.Diagnostics.Process]::Start($psi) | Out-Null
      Log ("已调用 Edge 启动：--app=$appUrl --window-size=210,380 --user-data-dir=D:\mywork\study\.edge-profile")
    } catch {
      Log ("启动 Edge 出错：" + $_.Exception.Message)
    }
  }

  $HWND_TOPMOST   = [IntPtr](-1)
  $SWP_NOACTIVATE = 0x0010
  $SWP_SHOWWINDOW = 0x0040
  $flags = $SWP_NOACTIVATE -bor $SWP_SHOWWINDOW

  Log ("目标尺寸 {0}x{1}（DPI={2}），位置 {3},{4}" -f $TARGET_W, $TARGET_H, $dpi, $posX, $posY)

  # ---- 高频监控：100ms 轮询，窗口一出现立刻定尺寸置顶 ----
  $seen   = $false
  $missed = 0
  while ($true) {
    $win = Get-WidgetWindow
    if ($win) {
      if (-not $seen) { Log "已找到小组件窗口，立即定尺寸置顶" }
      $seen   = $true
      $missed = 0
      [Win32]::SetWindowPos($win.MainWindowHandle, $HWND_TOPMOST, $posX, $posY, $TARGET_W, $TARGET_H, $flags) | Out-Null
    } else {
      $missed++
      if ($seen -and $missed -ge 40)        { Log "窗口已关闭，启动器退出"; break }        # 约4秒
      if (-not $seen -and $missed -ge 100)  { Log "窗口一直未出现，启动器退出"; break }     # 约10秒
    }
    Start-Sleep -Milliseconds 100
  }
} finally {
  if ($obtained) { try { $mutex.ReleaseMutex() } catch {} }
  $mutex.Close()
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  Log "启动器已退出"
}