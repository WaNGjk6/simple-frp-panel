#!/bin/bash
# FrpUi 服务端一键部署脚本
# 自动下载 frp + FrpUi 项目 + 配置守护进程
# frp 文件会放到 FrpUi 项目目录中

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

echo -e "${BLUE}[1/8] 安装系统依赖 (含解压工具)...${NC}"
if command -v apt-get &> /dev/null; then
    apt-get update -qq
    apt-get install -y -qq curl wget git systemd tar gzip
else
    yum install -y -q curl wget git systemd tar gzip
fi

# 验证解压工具
if ! command -v tar &> /dev/null; then
    echo -e "${RED}错误: tar 命令未找到，请手动安装${NC}"
    exit 1
fi

echo -e "${BLUE}[2/8] 安装 Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "$NODE_VERSION" ]; then
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

echo -e "${BLUE}[3/8] 下载 FrpUi 项目...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}目录已存在，更新代码...${NC}"
    cd $INSTALL_DIR
    git pull origin main 2>/dev/null || echo "使用本地版本"
else
    git clone --depth 1 $PROJECT_URL $INSTALL_DIR
fi

echo -e "${BLUE}[4/8] 下载并安装 frp 到项目目录...${NC}"
cd $INSTALL_DIR

if [ ! -f "$INSTALL_DIR/frps" ]; then
    echo "下载 frp ${FRP_VERSION}..."
    wget -q --show-progress -O frp.tar.gz $FRP_URL
    
    # 验证下载成功
    if [ ! -f "frp.tar.gz" ]; then
        echo -e "${RED}错误: frp 下载失败${NC}"
        exit 1
    fi
    
    echo "解压 frp..."
    tar -xzf frp.tar.gz --strip-components=1
    rm -f frp.tar.gz
    chmod +x frps frpc
    
    # 验证解压成功
    if [ ! -f "$INSTALL_DIR/frps" ]; then
        echo -e "${RED}错误: frp 解压失败，frps 文件未找到${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}frp 安装完成${NC}"
else
    echo -e "${YELLOW}frp 已存在，跳过下载${NC}"
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

# frps 服务 (使用项目目录中的 frps)
cat > /etc/systemd/system/frps.service << EOF
[Unit]
Description=FRP Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/frps -c $INSTALL_DIR/frps.toml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd
systemctl daemon-reload

echo -e "${BLUE}[8/8] 启动服务并验证...${NC}"

# 启动 frps
systemctl enable frps
systemctl start frps
sleep 3

# 检查 frps 是否真正启动
FRPS_STATUS=$(systemctl is-active frps)
if [ "$FRPS_STATUS" != "active" ]; then
    echo -e "${RED}警告: frps 服务启动失败${NC}"
    echo "查看日志: journalctl -u frps -n 20"
    systemctl status frps --no-pager
else
    echo -e "${GREEN}✓ frps 服务运行正常${NC}"
fi

# 启动 FrpUi
systemctl enable frpui
systemctl start frpui
sleep 3

# 检查 FrpUi 是否真正启动
FRPUI_STATUS=$(systemctl is-active frpui)
if [ "$FRPUI_STATUS" != "active" ]; then
    echo -e "${RED}警告: FrpUi 服务启动失败${NC}"
    echo "查看日志: journalctl -u frpui -n 20"
    systemctl status frpui --no-pager
else
    echo -e "${GREEN}✓ FrpUi 服务运行正常${NC}"
fi

# 检查端口监听
echo ""
echo -e "${BLUE}检查端口监听状态...${NC}"
if command -v ss &> /dev/null; then
    echo "frps (7000端口):"
    ss -tlnp | grep :7000 || echo "  未监听"
    echo "FrpUi (3000端口):"
    ss -tlnp | grep :3000 || echo "  未监听"
elif command -v netstat &> /dev/null; then
    echo "frps (7000端口):"
    netstat -tlnp 2>/dev/null | grep :7000 || echo "  未监听"
    echo "FrpUi (3000端口):"
    netstat -tlnp 2>/dev/null | grep :3000 || echo "  未监听"
fi

# 最终状态报告
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}服务状态:${NC}"
echo "  frps:  $FRPS_STATUS"
echo "  frpui: $FRPUI_STATUS"
echo ""

if [ "$FRPS_STATUS" = "active" ] && [ "$FRPUI_STATUS" = "active" ]; then
    echo -e "${GREEN}✓ 所有服务运行正常！${NC}"
    echo ""
    echo -e "${YELLOW}访问地址:${NC}"
    echo "  FrpUi: http://$(curl -s icanhazip.com):3000"
else
    echo -e "${RED}✗ 部分服务启动失败，请查看上方日志${NC}"
fi

echo ""
echo -e "${YELLOW}重要文件 (都在 $INSTALL_DIR 目录):${NC}"
echo "  frps 程序: $INSTALL_DIR/frps"
echo "  frpc 程序: $INSTALL_DIR/frpc"
echo "  配置文件: $INSTALL_DIR/frps.toml"
echo "  项目目录: $INSTALL_DIR"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  查看日志: journalctl -u frpui -f"
echo "  查看 frps 日志: journalctl -u frps -f"
echo "  重启服务: systemctl restart frpui"
echo "  停止服务: systemctl stop frpui frps"
echo ""
echo -e "${RED}注意: 请修改 frps.toml 中的 auth.token 为强密码！${NC}"
