#!/bin/bash
# 日志查看工具 - 提供多种美观的日志查看方式

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📊 统计套利日志查看工具${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""

# 显示菜单
echo -e "${BLUE}请选择查看方式：${NC}"
echo "1) 实时日志（带颜色）"
echo "2) 实时日志（无颜色，纯净输出）"
echo "3) 查看最近50行日志"
echo "4) 查看交易记录"
echo "5) 查看错误日志"
echo "6) 查看持仓信息"
echo "7) 查看盈亏统计"
echo "8) 清理 ANSI 颜色代码（查看历史日志）"
echo "9) PM2 原始日志"
echo "0) 退出"
echo ""

read -p "请输入选项 (0-9): " choice

case $choice in
  1)
    echo -e "${YELLOW}显示实时日志（Ctrl+C 退出）...${NC}"
    pm2 logs stat-arb --raw --nostream=false
    ;;
  2)
    echo -e "${YELLOW}显示实时日志（无颜色）...${NC}"
    pm2 logs stat-arb --raw --nostream=false | sed 's/\x1b\[[0-9;]*m//g'
    ;;
  3)
    echo -e "${YELLOW}最近50行日志：${NC}"
    pm2 logs stat-arb --lines 50 --raw | sed 's/\x1b\[[0-9;]*m//g'
    ;;
  4)
    echo -e "${YELLOW}交易记录：${NC}"
    echo ""
    grep "开仓\|平仓" logs/combined.log | tail -20 | sed 's/\x1b\[[0-9;]*m//g'
    ;;
  5)
    echo -e "${RED}错误日志：${NC}"
    echo ""
    tail -50 logs/error.log | sed 's/\x1b\[[0-9;]*m//g'
    ;;
  6)
    echo -e "${YELLOW}持仓信息：${NC}"
    echo ""
    pm2 logs stat-arb --lines 100 --raw | grep "持仓状态" | tail -10 | sed 's/\x1b\[[0-9;]*m//g'
    ;;
  7)
    echo -e "${YELLOW}盈亏统计：${NC}"
    echo ""
    pm2 logs stat-arb --lines 100 --raw | grep "累计统计\|盈亏" | tail -20 | sed 's/\x1b\[[0-9;]*m//g'
    ;;
  8)
    echo -e "${YELLOW}查看历史日志（无颜色代码）：${NC}"
    echo ""
    cat logs/pm2-out.log | sed 's/\x1b\[[0-9;]*m//g' | tail -50
    ;;
  9)
    echo -e "${YELLOW}PM2 原始日志：${NC}"
    pm2 logs stat-arb
    ;;
  0)
    echo -e "${GREEN}退出${NC}"
    exit 0
    ;;
  *)
    echo -e "${RED}无效选项${NC}"
    ;;
esac

