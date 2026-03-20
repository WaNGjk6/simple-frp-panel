#!/bin/bash
# FrpUi Linux 一键部署脚本
# 使用方式: bash frpc-quick.sh <服务端地址> <服务端端口> <认证令牌> <映射端口> [节点名称]
# 示例: bash frpc-quick.sh frp.example.com 7000 mytoken 17400 my-server

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 默认配置
FRPC_VERSION="0.61.1"
GITHUB_PROXY="https://ghfast.top/"
ADMIN_PORT=7400
ADMIN_USER="admin"

# 参数解析
if [ $# -lt 4 ]; then
    echo -e "${RED}参数不足！${NC}"
    echo "使用方式: $0 <服务端地址> <服务端端口> <认证令牌> <映射端口> [节点名称]"
    echo "示例: $0 frp.example.com 7000 mytoken 17400 my-server"
    exit 1
fi

SERVER_ADDR="$1"
SERVER_PORT="$2"
AUTH_TOKEN="$3"
EXPOSE_PORT="$4"
NODE_NAME="${5:-frpc-node}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  FrpUi Linux 一键部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo "服务端: $SERVER_ADDR:$SERVER_PORT"
echo "节点名: $NODE_NAME"
echo "映射端口: $EXPOSE_PORT"

# 生成随机密码
ADMIN_PWD=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 12)
echo "Admin 密码: $ADMIN_PWD"

# 架构检测
ARCH=$(uname -m)
case $ARCH in
    x86_64) FRPC_ARCH="amd64" ;;
    aarch64) FRPC_ARCH="arm64" ;;
    armv7l) FRPC_ARCH="arm" ;;
    *) echo -e "${RED}不支持的架构: $ARCH${NC}"; exit 1 ;;
esac

# 安装目录
FRPC_DIR="/opt/frp"

# 1. 创建目录
echo -e "\n${YELLOW}[1/5] 准备安装目录...${NC}"
mkdir -p $FRPC_DIR
cd $FRPC_DIR

# 2. 下载 frpc
echo -e "${YELLOW}[2/5] 下载 frpc v${FRPC_VERSION}...${NC}"
FRPC_URL="${GITHUB_PROXY}https://github.com/fatedier/frp/releases/download/v${FRPC_VERSION}/frp_${FRPC_VERSION}_linux_${FRPC_ARCH}.tar.gz"

if command -v wget &> /dev/null; then
    wget -q --show-progress -O frp.tar.gz $FRPC_URL
elif command -v curl &> /dev/null; then
    curl -L --progress-bar -o frp.tar.gz $FRPC_URL
else
    echo -e "${RED}错误: 需要 wget 或 curl${NC}"
    exit 1
fi

# 3. 解压安装
echo -e "${YELLOW}[3/5] 解压安装...${NC}"
tar -xzf frp.tar.gz --strip-components=1
rm -f frp.tar.gz
chmod +x frpc

# 4. 写入配置
echo -e "${YELLOW}[4/5] 写入配置文件...${NC}"
cat > frpc.toml << EOF
serverAddr = "$SERVER_ADDR"
serverPort = $SERVER_PORT
auth.token = "$AUTH_TOKEN"

[webServer]
addr = "127.0.0.1"
port = $ADMIN_PORT
user = "$ADMIN_USER"
password = "$ADMIN_PWD"

[[proxies]]
name = "admin_api_$NODE_NAME"
type = "tcp"
localIP = "127.0.0.1"
localPort = $ADMIN_PORT
remotePort = $EXPOSE_PORT
EOF

# 5. 启动服务
echo -e "${YELLOW}[5/5] 启动服务...${NC}"

# 检查是否已运行
if pgrep -x "frpc" > /dev/null; then
    echo "检测到 frpc 已在运行，正在重启..."
    pkill -x frpc
    sleep 1
fi

# 启动 frpc
nohup ./frpc -c ./frpc.toml > /var/log/frpc.log 2>&1 &
sleep 2

# 检查是否成功
if pgrep -x "frpc" > /dev/null; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  部署成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo "PID: $(pgrep -x frpc)"
    echo "Admin API: http://127.0.0.1:$ADMIN_PORT"
    echo "远程管理: http://$SERVER_ADDR:$EXPOSE_PORT"
    echo ""
    echo -e "${YELLOW}后续命令:${NC}"
    echo "  查看日志: tail -f /var/log/frpc.log"
    echo "  停止服务: pkill -x frpc"
else
    echo -e "${RED}启动失败，请查看日志: /var/log/frpc.log${NC}"
    exit 1
fi
