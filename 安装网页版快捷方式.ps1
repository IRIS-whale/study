# 学习手帐 · 网页版 快捷方式 安装脚本
# 在桌面创建「学习手账 网页版」快捷方式（打开与小组件同配置的网页版）
$ErrorActionPreference = "Stop"
$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$lnk = $ws.CreateShortcut((Join-Path $desktop "学习手账 网页版.lnk"))
$lnk.TargetPath       = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$lnk.Arguments        = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "D:\mywork\study\main_launcher.ps1"'
$lnk.WorkingDirectory = "D:\mywork\study"
$lnk.Description      = "学习手账 · 网页版（与桌面小组件同步数据）"
$lnk.WindowStyle      = 7
$lnk.Save()
Write-Output "已创建桌面快捷方式：学习手账 网页版"
