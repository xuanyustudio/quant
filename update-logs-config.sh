#!/bin/bash
# 一键更新日志配置到服务器

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📊 日志配置一键更新工具${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""

# 检查参数
if [ $# -eq 0 ]; then
  echo -e "${YELLOW}使用方法：${NC}"
  echo "  ./update-logs-config.sh user@server:/path/to/web3"
  echo ""
  echo "示例："
  echo "  ./update-logs-config.sh root@123.456.789.0:/root/web3"
  exit 1
fi

SERVER_PATH=$1

echo -e "${BLUE}目标服务器：${NC}${SERVER_PATH}"
echo ""

# 确认
read -p "确认要更新到这个服务器？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}已取消${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}步骤1/5: 上传 PM2 配置文件...${NC}"
scp ecosystem.config.cjs ${SERVER_PATH}/
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 上传失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 完成${NC}"

echo ""
echo -e "${YELLOW}步骤2/5: 上传日志工具脚本...${NC}"
scp view-logs.sh clean-logs.sh ${SERVER_PATH}/
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 上传失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 完成${NC}"

echo ""
echo -e "${YELLOW}步骤3/5: 上传 logger.js...${NC}"
SERVER_NO_PATH=$(echo ${SERVER_PATH} | cut -d: -f1)
SERVER_DIR=$(echo ${SERVER_PATH} | cut -d: -f2)
scp src/utils/logger.js ${SERVER_NO_PATH}:${SERVER_DIR}/src/utils/
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 上传失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 完成${NC}"

echo ""
echo -e "${YELLOW}步骤4/5: 在服务器上设置权限...${NC}"
ssh ${SERVER_NO_PATH} "cd ${SERVER_DIR} && chmod +x view-logs.sh clean-logs.sh"
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 设置权限失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 完成${NC}"

echo ""
echo -e "${YELLOW}步骤5/5: 重启 PM2 应用...${NC}"
ssh ${SERVER_NO_PATH} "cd ${SERVER_DIR} && pm2 delete stat-arb; pm2 start ecosystem.config.cjs; pm2 save"
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 重启失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 完成${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 日志配置更新成功！${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}现在可以查看日志：${NC}"
echo "  ssh ${SERVER_NO_PATH}"
echo "  cd ${SERVER_DIR}"
echo "  ./view-logs.sh"
echo ""
echo -e "${BLUE}或直接查看：${NC}"
echo "  ssh ${SERVER_NO_PATH} 'cd ${SERVER_DIR} && pm2 logs stat-arb'"
echo ""

