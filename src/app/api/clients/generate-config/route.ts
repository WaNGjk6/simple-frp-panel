import { NextResponse } from 'next/server';

// ==========================================
// 全局配置：在这里修改版本和下载源
// ==========================================
const FRPC_VERSION = "0.61.1"; 
const GITHUB_PROXY = "https://ghfast.top/"; // GitHub 加速前缀

interface GenerateConfigRequest {
  serverAddr: string;
  serverPort: number;
  authToken: string;
  adminPort: number;
  adminUser: string;
  adminPwd: string;
  exposePort: number;
  nodeName: string;
}

// 随机密码生成器
function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// 生成 TOML 配置文件
function generateConfigToml(config: GenerateConfigRequest): string {
  return `serverAddr = "${config.serverAddr}"
serverPort = ${config.serverPort}
auth.token = "${config.authToken}"

[webServer]
addr = "127.0.0.1"
port = ${config.adminPort}
user = "${config.adminUser}"
password = "${config.adminPwd}"

[[proxies]]
name = "admin_api_${config.nodeName || 'remote'}"
type = "tcp"
localIP = "127.0.0.1"
localPort = ${config.adminPort}
remotePort = ${config.exposePort}
`;
}

// 生成 Linux 一键脚本（含架构自适应 + Systemd）
function generateLinuxScript(config: GenerateConfigRequest, configToml: string): string {
  const timestamp = new Date().toLocaleString();
  return `#!/bin/bash
# FrpUi 自动化接入脚本 (Linux)
# 生成时间: ${timestamp}

set -e

echo "=========================================="
echo "  🚀 FrpUi 正在为 [${config.nodeName}] 配置接入..."
echo "=========================================="

# 1. 架构检测
ARCH=$(uname -m)
case $ARCH in
    x86_64) FRPC_ARCH="amd64" ;;
    aarch64) FRPC_ARCH="arm64" ;;
    armv7l) FRPC_ARCH="arm" ;;
    *) echo "❌ 不支持的架构: $ARCH"; exit 1 ;;
esac

# 2. 准备目录
FRPC_DIR="/opt/frp"
mkdir -p $FRPC_DIR
cd $FRPC_DIR

# 3. 下载与安装 (带加速)
FRPC_URL="${GITHUB_PROXY}https://github.com/fatedier/frp/releases/download/v${FRPC_VERSION}/frp_${FRPC_VERSION}_linux_\${FRPC_ARCH}.tar.gz"

echo "正在从加速源下载 frpc v${FRPC_VERSION}..."
wget -q --show-progress -O frp.tar.gz $FRPC_URL
tar -xzf frp.tar.gz --strip-components=1
rm frp.tar.gz
chmod +x frpc

# 4. 写入配置
cat > frpc.toml << 'EOF'
${configToml}
EOF

# 5. 配置 Systemd 服务 (实现开机自启)
cat > /etc/systemd/system/frpc.service << EOF
[Unit]
Description=Frp Client Service (Managed by FrpUi)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$FRPC_DIR
ExecStart=$FRPC_DIR/frpc -c $FRPC_DIR/frpc.toml
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 6. 启动服务
echo "正在启动服务并设置开机自启..."
systemctl daemon-reload
systemctl enable frpc
systemctl restart frpc

echo "=========================================="
echo "  ✅ 接入成功！"
echo "  管理地址: http://${config.serverAddr}:${config.exposePort}"
echo "  查看状态: systemctl status frpc"
echo "=========================================="
`;
}

// 生成 Windows 脚本 (PowerShell)
function generateWindowsScript(config: GenerateConfigRequest, configToml: string): string {
  return `# FrpUi Windows 接入脚本
$FRPC_VERSION = "${FRPC_VERSION}"
$BASE_URL = "${GITHUB_PROXY}https://github.com/fatedier/frp/releases/download/v$FRPC_VERSION/frp_$FRPC_VERSION"
$DEST_DIR = "$env:USERPROFILE\\Documents\\frp"

Write-Host "🚀 开始自动化安装 frpc..." -ForegroundColor Cyan

if (!(Test-Path $DEST_DIR)) { New-Item -ItemType Directory -Path $DEST_DIR }

Write-Host "正在下载 Windows 版本..."
Invoke-WebRequest -Uri "$BASE_URL" + "_windows_amd64.zip" -OutFile "$DEST_DIR\\frp.zip"
Expand-Archive -Path "$DEST_DIR\\frp.zip" -DestinationPath "$DEST_DIR" -Force
$subDir = Get-ChildItem -Path "$DEST_DIR" -Directory | Filter { $_.Name -like "frp_*" }
Move-Item -Path "$($subDir.FullName)\\*" -Destination "$DEST_DIR" -Force

# 写入配置
$configContent = @"
${configToml}
"@
$configContent | Out-File -FilePath "$DEST_DIR\\frpc.toml" -Encoding UTF8

Write-Host "✅ 安装完成！请在当前目录下运行: .\\frpc.exe -c frpc.toml" -ForegroundColor Green
`;
}

// 后端 API 主函数
export async function POST(request: Request) {
  try {
    const body: GenerateConfigRequest = await request.json();

    // 默认值填充
    const config: GenerateConfigRequest = {
      ...body,
      adminPort: body.adminPort || 7400,
      adminUser: body.adminUser || 'admin',
      adminPwd: body.adminPwd || generateRandomPassword(),
      exposePort: body.exposePort || 17400,
      nodeName: body.nodeName || 'remote-node'
    };

    const configToml = generateConfigToml(config);
    
    return NextResponse.json({
      success: true,
      data: {
        configToml,
        startupScript: generateLinuxScript(config, configToml),
        windowsScript: generateWindowsScript(config, configToml),
        adminUser: config.adminUser,
        adminPwd: config.adminPwd,
        exposePort: config.exposePort
      }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: '生成失败', details: error.message },
      { status: 500 }
    );
  }
}