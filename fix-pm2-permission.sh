#!/bin/bash
# PM2 权限问题一键修复脚本

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🔧 PM2 权限问题修复工具${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""

# 检查当前用户
echo -e "${YELLOW}当前用户:${NC} $(whoami)"
echo ""

# 检查 .pm2 目录
if [ -d "/root/.pm2" ]; then
  echo -e "${YELLOW}.pm2 目录状态:${NC}"
  ls -la /root/.pm2 | head -5
  echo ""
fi

# 询问用户
echo -e "${YELLOW}选择修复方案:${NC}"
echo "1) 修复权限（保留数据）"
echo "2) 删除重建（清空数据）"
echo "3) 仅检查状态"
echo ""
read -p "请选择 (1-3): " choice

case $choice in
  1)
    echo ""
    echo -e "${YELLOW}修复 .pm2 目录权限...${NC}"
    
    # 备份配置
    if [ -f /root/.pm2/dump.pm2 ]; then
      cp /root/.pm2/dump.pm2 /tmp/pm2_backup_$(date +%Y%m%d_%H%M%S).pm2
      echo -e "${GREEN}✅ 配置已备份${NC}"
    fi
    
    # 修复权限
    sudo chown -R $(whoami):$(whoami) /root/.pm2 2>/dev/null
    sudo chmod -R 755 /root/.pm2 2>/dev/null
    
    # 删除锁文件
    rm -f /root/.pm2/pm2.pid 2>/dev/null
    rm -f /root/.pm2/rpc.sock 2>/dev/null
    rm -f /root/.pm2/pub.sock 2>/dev/null
    
    echo -e "${GREEN}✅ 权限修复完成${NC}"
    echo ""
    echo -e "${YELLOW}重启 PM2...${NC}"
    pm2 resurrect
    pm2 restart all
    ;;
    
  2)
    echo ""
    echo -e "${RED}⚠️  警告：此操作将删除所有 PM2 数据！${NC}"
    read -p "确认继续？(y/n) " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
      echo "已取消"
      exit 0
    fi
    
    echo -e "${YELLOW}停止 PM2...${NC}"
    pm2 kill
    
    echo -e "${YELLOW}删除 .pm2 目录...${NC}"
    sudo rm -rf /root/.pm2
    
    echo -e "${GREEN}✅ 清理完成${NC}"
    echo ""
    echo -e "${YELLOW}重新启动 PM2...${NC}"
    
    # 获取项目目录
    if [ -f "ecosystem.config.cjs" ]; then
      pm2 start ecosystem.config.cjs
      pm2 save
      echo -e "${GREEN}✅ PM2 已重启${NC}"
    else
      echo -e "${RED}❌ 未找到 ecosystem.config.cjs，请手动启动${NC}"
    fi
    ;;
    
  3)
    echo ""
    echo -e "${YELLOW}PM2 状态:${NC}"
    pm2 status
    echo ""
    echo -e "${YELLOW}.pm2 目录权限:${NC}"
    ls -la /root/.pm2 2>/dev/null || echo "目录不存在"
    echo ""
    echo -e "${YELLOW}当前进程:${NC}"
    ps aux | grep -E "PM2|stat-arb" | grep -v grep
    ;;
    
  *)
    echo -e "${RED}无效选项${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}查看状态:${NC}"
pm2 status
echo ""
echo -e "${YELLOW}如果还有问题，请尝试:${NC}"
echo "  sudo -i  # 切换到 root 用户"
echo "  pm2 restart stat-arb"
echo ""

