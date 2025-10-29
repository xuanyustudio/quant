#!/bin/bash

###############################################################################
# 统计套利 - 服务器部署和启动脚本
###############################################################################

echo "🚀 统计套利实盘交易 - 服务器部署"
echo "═══════════════════════════════════════════════════════"
echo ""

# 1. 检查Node.js环境
echo "📦 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ 未安装 Node.js，请先安装"
    exit 1
fi
echo "✅ Node.js: $(node -v)"

# 2. 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  未安装 PM2，正在安装..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "❌ PM2 安装失败"
        exit 1
    fi
fi
echo "✅ PM2: $(pm2 -v)"
echo ""

# 3. 检查依赖
echo "📥 检查项目依赖..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  未安装依赖，正在安装..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi
echo "✅ 依赖已安装"
echo ""

# 4. 检查 .env 文件
echo "🔧 检查配置文件..."
if [ ! -f ".env" ]; then
    echo "❌ 未找到 .env 文件"
    echo "   请从 env.example 复制并配置："
    echo "   cp env.example .env"
    echo "   然后编辑 .env 文件填入您的API密钥"
    exit 1
fi
echo "✅ .env 文件存在"
echo ""

# 5. 检查配置文件
CONFIG_FILE=""
if [ "$1" != "" ]; then
    CONFIG_FILE=$1
else
    # 查找最新的配置文件
    CONFIG_FILE=$(ls -t output/live_trading_config_*.json 2>/dev/null | head -1)
fi

if [ "$CONFIG_FILE" == "" ]; then
    echo "❌ 未找到配置文件"
    echo "   请先运行组合优化生成配置："
    echo "   npm run stat-arb:portfolio"
    exit 1
fi

echo "✅ 配置文件: $CONFIG_FILE"
echo ""

# 6. 创建日志目录
mkdir -p logs
echo "✅ 日志目录已创建"
echo ""

# 7. 停止旧进程（如果存在）
echo "🔄 检查现有进程..."
if pm2 describe stat-arb &> /dev/null; then
    echo "⚠️  发现运行中的实例，正在停止..."
    pm2 stop stat-arb
    pm2 delete stat-arb
fi
echo ""

# 8. 更新 PM2 配置文件中的配置路径
echo "📝 更新PM2配置..."
sed -i.bak "s|args: '--config=.*'|args: '--config=$CONFIG_FILE'|g" ecosystem.config.cjs
echo "✅ 配置已更新"
echo ""

# 9. 启动PM2
echo "🚀 启动实盘交易..."
pm2 start ecosystem.config.cjs

if [ $? -ne 0 ]; then
    echo "❌ 启动失败"
    exit 1
fi
echo ""

# 10. 保存PM2配置（用于开机自启）
echo "💾 保存PM2配置..."
pm2 save

# 11. 设置开机自启（可选）
echo ""
echo "❓ 是否设置开机自启动？(y/n)"
read -r answer
if [ "$answer" == "y" ] || [ "$answer" == "Y" ]; then
    pm2 startup
    echo "✅ 请复制上面的命令并以root身份执行"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ 部署完成！"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 常用命令："
echo "   pm2 list              - 查看所有进程"
echo "   pm2 logs stat-arb     - 查看日志（Ctrl+C退出）"
echo "   pm2 monit             - 实时监控"
echo "   pm2 stop stat-arb     - 停止交易"
echo "   pm2 restart stat-arb  - 重启交易"
echo "   pm2 delete stat-arb   - 删除进程"
echo ""
echo "📊 查看实时日志："
echo "   pm2 logs stat-arb --lines 100"
echo ""

