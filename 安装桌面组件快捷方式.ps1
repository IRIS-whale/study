# 学习手账 · 桌面小组件 安装脚本
# 功能：
#   1) 在桌面创建「学习手账 今日日程」快捷方式
#   2) 把同一快捷方式放进「启动」文件夹，开机自动弹出今日日程小组件并置顶
#
# 直接调用 powershell.exe 运行 widget_launcher.ps1（-WindowStyle Hidden）。
# 启动器自带「关窗自动释放锁」+「僵尸进程接管」逻辑，重开不会再黑框/打不开。
$ErrorActionPreference = "Stop"

$ps       = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$psArgs   = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "D:\mywork\study\widget_launcher.ps1"'

$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$startup = [Environment]::GetFolderPath("Startup")

function New-ComponentShortcut($dir) {
  $lnk = $ws.CreateShortcut((Join-Path $dir "学习手账 今日日程.lnk"))
  $lnk.TargetPath       = $ps
  $lnk.Arguments        = $psArgs
  $lnk.WorkingDirectory = "D:\mywork\study"
  $lnk.Description      = "学习手账 · 今日日程小组件（置顶）"
  $lnk.WindowStyle      = 7   # 最小化启动，避免双击闪过黑色控制台窗口
  $lnk.Save()
}

New-ComponentShortcut $desktop
New-ComponentShortcut $startup

Write-Output "完成：桌面 + 启动文件夹 均已创建「学习手账 今日日程」快捷方式（启动并置顶）。"