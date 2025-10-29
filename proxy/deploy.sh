#!/bin/bash

# 币安 API 代理服务器部署脚本
# 用于在海外服务器快速部署

echo "========================================"
echo "🚀 币安 API 代理服务器部署脚本"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js"
    echo "   Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "   CentOS/RHEL: curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - && sudo yum install -y nodejs"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"
echo ""

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装成功"
echo ""

# 创建配置文件
if [ ! -f .env ]; then
    echo "📝 创建配置文件..."
    cp .env.example .env
    echo "✅ 配置文件已创建: .env"
    echo "   请编辑 .env 文件修改配置"
    echo ""
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
    echo "✅ PM2 安装成功"
    echo ""
fi

# 配置防火墙
echo "🔥 配置防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 3000
    echo "✅ UFW 防火墙已配置（端口 3000）"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --add-port=3000/tcp --permanent
    sudo firewall-cmd --reload
    echo "✅ Firewalld 已配置（端口 3000）"
else
    echo "⚠️  未检测到防火墙，请手动配置端口 3000"
fi
echo ""

# 询问是否启动服务
read -p "是否立即启动服务？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 启动服务..."
    pm2 start server.js --name binance-proxy
    pm2 save
    pm2 startup
    echo ""
    echo "✅ 服务已启动！"
    echo ""
    echo "📊 查看状态: pm2 status"
    echo "📝 查看日志: pm2 logs binance-proxy"
    echo "🔄 重启服务: pm2 restart binance-proxy"
    echo ""
fi

# 运行测试
read -p "是否运行测试？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 运行测试..."
    sleep 2
    node test.js
fi

echo ""
echo "========================================"
echo "🎉 部署完成！"
echo "========================================"
echo ""
echo "📡 服务地址: http://$(hostname -I | awk '{print $1}'):3000"
echo "💡 测试命令: curl http://localhost:3000/health"
echo ""
echo "📚 更多信息请查看 README.md"
echo ""

