#!/bin/bash

# 测试支持 CONNECT 的代理服务器

PROXY_URL="http://localhost:3000"

echo "🧪 测试代理服务器 (CONNECT 模式)"
echo "═══════════════════════════════════════════════"
echo ""

# 测试1: 健康检查
echo "测试 1: 健康检查..."
curl -s "$PROXY_URL/health" | jq . 2>/dev/null || curl -s "$PROXY_URL/health"
echo ""

# 测试2: URL转发模式
echo "测试 2: URL转发模式..."
curl -s "$PROXY_URL/api/v3/ping"
echo ""

# 测试3: HTTP CONNECT 代理模式
echo "测试 3: HTTP CONNECT 代理模式..."
export HTTPS_PROXY=$PROXY_URL
curl -s https://api.binance.com/api/v3/ping
echo ""

echo "测试 4: 通过代理获取币安服务器时间..."
curl -s https://api.binance.com/api/v3/time | jq . 2>/dev/null || curl -s https://api.binance.com/api/v3/time
echo ""

echo "═══════════════════════════════════════════════"
echo "✅ 测试完成！"
echo ""
echo "如果测试 3 和 4 返回 {}，说明 CONNECT 模式工作正常"
echo ""

