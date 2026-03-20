# FrpUi Windows 一键部署脚本
# 使用方式: powershell -ExecutionPolicy Bypass -File frpc-quick.ps1 <服务端地址> <服务端端口> <认证令牌> <映射端口> [节点名称]
# 示例: powershell -ExecutionPolicy Bypass -File frpc-quick.ps1 frp.example.com 7000 mytoken 17400 my-server

param(
    [Parameter(Mandatory=$true)][string]$ServerAddr,
    [Parameter(Mandatory=$true)][int]$ServerPort,
    [Parameter(Mandatory=$true)][string]$AuthToken,
    [Parameter(Mandatory=$true)][int]$ExposePort,
    [string]$NodeName = "frpc-node"
)

$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-ColorOutput($Message, $Color = "White") {
    $colors = @{
        "Red" = [System.ConsoleColor]::Red
        "Green" = [System.ConsoleColor]::Green
        "Yellow" = [System.ConsoleColor]::Yellow
        "White" = [System.ConsoleColor]::White
    }
    Write-Host $Message -ForegroundColor $colors[$Color]
}

Write-ColorOutput "========================================" "Green"
Write-ColorOutput "  FrpUi Windows 一键部署脚本" "Green"
Write-ColorOutput "========================================" "Green"
Write-Host "服务端: $ServerAddr`:$ServerPort"
Write-Host "节点名: $NodeName"
Write-Host "映射端口: $ExposePort"

# 生成随机密码
$chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
$adminPwd = -join (1..12 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
Write-Host "Admin 密码: $adminPwd"

# 配置
$FRPC_VERSION = "0.61.1"
$GITHUB_PROXY = "https://ghfast.top/"
$ADMIN_PORT = 7400
$ADMIN_USER = "admin"

# 安装目录
$DEST_DIR = "$env:USERPROFILE\Documents\frp"

Write-ColorOutput "[1/4] 创建安装目录..." "Yellow"
if (-not (Test-Path $DEST_DIR)) {
    New-Item -ItemType Directory -Path $DEST_DIR -Force | Out-Null
}

Write-ColorOutput "[2/4] 下载 frpc v$FRPC_VERSION..." "Yellow"
$FRPC_URL = "${GITHUB_PROXY}https://github.com/fatedier/frp/releases/download/v${FRPC_VERSION}/frp_${FRPC_VERSION}_windows_amd64.zip"
$FRPC_ZIP = "$DEST_DIR\frp.zip"

try {
    Invoke-WebRequest -Uri $FRPC_URL -OutFile $FRPC_ZIP -UseBasicParsing
} catch {
    Write-ColorOutput "下载失败: $_" "Red"
    exit 1
}

Write-ColorOutput "[3/4] 解压安装..." "Yellow"
Expand-Archive -Path $FRPC_ZIP -DestinationPath $DEST_DIR -Force
Remove-Item $FRPC_ZIP -Force

# 移动文件到目标目录
$subDir = Get-ChildItem -Path $DEST_DIR -Directory | Where-Object { $_.Name -like "frp_*" }
if ($subDir) {
    Move-Item -Path "$($subDir.FullName)\*" -Destination $DEST_DIR -Force
    Remove-Item $subDir.FullName -Force -Recurse
}

# 写入配置
Write-ColorOutput "[4/4] 写入配置文件..." "Yellow"
$configContent = @"
serverAddr = "$ServerAddr"
serverPort = $ServerPort
auth.token = "$AuthToken"

[webServer]
addr = "127.0.0.1"
port = $ADMIN_PORT
user = "$ADMIN_USER"
password = "$adminPwd"

[[proxies]]
name = "admin_api_$NodeName"
type = "tcp"
localIP = "127.0.0.1"
localPort = $ADMIN_PORT
remotePort = $ExposePort
"@

$configContent | Out-File -FilePath "$DEST_DIR\frpc.toml" -Encoding UTF8

# 启动 frpc
Write-ColorOutput "[启动] 正在启动 frpc..." "Yellow"

# 停止现有 frpc 进程
$existingProc = Get-Process -Name "frpc" -ErrorAction SilentlyContinue
if ($existingProc) {
    Write-ColorOutput "检测到 frpc 已在运行，正在停止..." "Yellow"
    Stop-Process -Name "frpc" -Force
    Start-Sleep -Seconds 1
}

# 启动 frpc
$frpcPath = "$DEST_DIR\frpc.exe"
if (-not (Test-Path $frpcPath)) {
    Write-ColorOutput "错误: frpc.exe 未找到" "Red"
    exit 1
}

Start-Process -FilePath $frpcPath -ArgumentList "-c", "$DEST_DIR\frpc.toml" -WindowStyle Hidden
Start-Sleep -Seconds 2

$runningProc = Get-Process -Name "frpc" -ErrorAction SilentlyContinue
if ($runningProc) {
    Write-ColorOutput "" "Green"
    Write-ColorOutput "========================================" "Green"
    Write-ColorOutput "  部署成功！" "Green"
    Write-ColorOutput "========================================" "Green"
    Write-Host "PID: $($runningProc.Id)"
    Write-Host "Admin API: http://127.0.0.1:$ADMIN_PORT"
    Write-Host "远程管理: http://$ServerAddr`:$ExposePort"
    Write-ColorOutput "" "Green"
    Write-ColorOutput "后续命令:" "Yellow"
    Write-Host "  查看日志: Get-Content $DEST_DIR\frpc.log"
    Write-Host "  停止服务: Stop-Process -Name frpc"
} else {
    Write-ColorOutput "启动失败" "Red"
    exit 1
}
