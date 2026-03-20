#!/bin/bash
# FrpUi 服务端一键部署脚本
# 自动下载 frp + FrpUi 项目 + 配置守护进程

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
FRP_VERSION="0.61.1"
FRP_URL="https://ghfast.top/https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/frp_${FRP_VERSION}_linux_amd64.tar.gz"
PROJECT_URL="https://github.com/WaNGjk6/simple-frp-panel.git"
INSTALL_DIR="/opt/frpui"
FRP_DIR="/opt/frp"
NODE_VERSION="20"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  FrpUi 服务端一键部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 权限运行此脚本${NC}"
    echo "sudo bash install-frpui.sh"
    exit 1
fi

# 检查系统
if ! command -v apt-get &> /dev/null && ! command -v yum &> /dev/null; then
    echo -e "${RED}不支持的系统，仅支持 Debian/Ubuntu/CentOS${NC}"
    exit 1
fi

echo -e "${BLUE}[1/8] 安装系统依赖...${NC}"
if command -v apt-get &> /dev/null; then
    apt-get update -qq
    apt-get install -y -qq curl wget git systemd
else
    yum install -y -q curl wget git systemd
fi

echo -e "${BLUE}[2/8] 安装 Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "$NODE_VERSION" ]; then
    # 使用 NodeSource 安装
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - 2>/dev/null || \
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
    
    if command -v apt-get &> /dev/null; then
        apt-get install -y -qq nodejs
    else
        yum install -y -q nodejs
    fi
fi

echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

echo -e "${BLUE}[3/8] 下载并安装 frp...${NC}"
mkdir -p $FRP_DIR
cd $FRP_DIR

if [ ! -f "$FRP_DIR/frps" ]; then
    echo "下载 frp ${FRP_VERSION}..."
    wget -q --show-progress -O frp.tar.gz $FRP_URL
    tar -xzf frp.tar.gz --strip-components=1
    rm -f frp.tar.gz
    chmod +x frps frpc
    echo -e "${GREEN}frp 安装完成${NC}"
else
    echo -e "${YELLOW}frp 已存在，跳过下载${NC}"
fi

echo -e "${BLUE}[4/8] 下载 FrpUi 项目...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}目录已存在，更新代码...${NC}"
    cd $INSTALL_DIR
    git pull origin main 2>/dev/null || echo "使用本地版本"
else
    git clone --depth 1 $PROJECT_URL $INSTALL_DIR
    cd $INSTALL_DIR
fi

echo -e "${BLUE}[5/8] 安装项目依赖...${NC}"
cd $INSTALL_DIR
npm install --production 2>&1 | tail -5

echo -e "${BLUE}[6/8] 创建 frps 配置文件...${NC}"
if [ ! -f "$INSTALL_DIR/frps.toml" ]; then
    cat > $INSTALL_DIR/frps.toml << 'EOF'
# FRP 服务端配置
bindPort = 7000
auth.token = "your-strong-token-here"

# Web 仪表盘 (可选)
webServer.addr = "127.0.0.1"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "admin"
EOF
    echo -e "${YELLOW}请编辑 $INSTALL_DIR/frps.toml 修改配置${NC}"
fi

echo -e "${BLUE}[7/8] 创建 systemd 服务...${NC}"

# FrpUi 服务
cat > /etc/systemd/system/frpui.service << EOF
[Unit]
Description=FrpUi Web Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# frps 服务
cat > /etc/systemd/system/frps.service << EOF
[Unit]
Description=FRP Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$FRP_DIR/frps -c $INSTALL_DIR/frps.toml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd
systemctl daemon-reload

echo -e "${BLUE}[8/8] 启动服务...${NC}"

# 启动 frps
systemctl enable frps
systemctl start frps
sleep 2

# 启动 FrpUi
systemctl enable frpui
systemctl start frpui
sleep 2

# 检查状态
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}服务状态:${NC}"
echo "  frps: $(systemctl is-active frps)"
echo "  frpui: $(systemctl is-active frpui)"
echo ""
echo -e "${YELLOW}访问地址:${NC}"
echo "  FrpUi: http://$(curl -s icanhazip.com):3000"
echo ""
echo -e "${YELLOW}重要文件:${NC}"
echo "  配置文件: $INSTALL_DIR/frps.toml"
echo "  项目目录: $INSTALL_DIR"
echo "  frp 目录: $FRP_DIR"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  查看日志: journalctl -u frpui -f"
echo "  重启服务: systemctl restart frpui"
echo "  停止服务: systemctl stop frpui frps"
echo ""
echo -e "${RED}注意: 请修改 frps.toml 中的 auth.token 为强密码！${NC}"
