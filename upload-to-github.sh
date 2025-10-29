#!/bin/bash
# GitHub 一键上传脚本 (Git Bash / Linux)
# 使用方法：./upload-to-github.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 GitHub 上传工具${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""

# 检查 Git 是否安装
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ 未检测到 Git，请先安装: https://git-scm.com/download${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git 已安装: $(git --version)${NC}"
echo ""

# 检查当前目录
echo -e "${YELLOW}当前目录:${NC} $(pwd)"
echo ""

# 检查是否已经初始化
if [ -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git 仓库已存在${NC}"
    read -p "是否继续？这将推送到远程仓库 (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
else
    echo -e "${YELLOW}步骤 1/6: 初始化 Git 仓库...${NC}"
    git init
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 初始化失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ 完成${NC}"
    echo ""
    
    echo -e "${YELLOW}步骤 2/6: 添加远程仓库...${NC}"
    git remote add origin https://github.com/xuanyustudio/quant.git
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️  远程仓库可能已存在，继续...${NC}"
    else
        echo -e "${GREEN}✅ 完成${NC}"
    fi
    echo ""
fi

echo -e "${YELLOW}步骤 3/6: 检查将要上传的文件...${NC}"
git status
echo ""

# 确认
echo -e "${YELLOW}⚠️  重要提醒：${NC}"
echo "  - 请确认没有敏感信息（API keys、密码等）"
echo "  - logs/、data/、output/ 等目录不会被上传"
echo "  - .gitignore 已配置好，会自动过滤敏感文件"
echo ""

read -p "确认要上传这些文件到 GitHub？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

echo ""
echo -e "${YELLOW}步骤 4/6: 添加所有文件...${NC}"
git add .
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 添加文件失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 完成${NC}"
echo ""

echo -e "${YELLOW}步骤 5/6: 提交到本地仓库...${NC}"
read -p "请输入提交说明（留空使用默认）: " commitMessage
if [ -z "$commitMessage" ]; then
    commitMessage="更新: $(date '+%Y-%m-%d %H:%M:%S')"
fi

git commit -m "$commitMessage"
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  提交失败，可能没有变更${NC}"
fi
echo -e "${GREEN}✅ 完成${NC}"
echo ""

echo -e "${YELLOW}步骤 6/6: 推送到 GitHub...${NC}"
echo -e "${YELLOW}提示: 如果需要输入密码，请使用 GitHub Personal Access Token${NC}"
echo -e "${YELLOW}获取 Token: https://github.com/settings/tokens${NC}"
echo ""

# 尝试推送
git branch -M main
git push -u origin main

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ 推送失败${NC}"
    echo ""
    echo -e "${YELLOW}可能的原因：${NC}"
    echo "  1. 需要身份验证（使用 Personal Access Token）"
    echo "  2. 远程仓库有更新"
    echo "  3. 网络问题"
    echo ""
    echo -e "${YELLOW}解决方案：${NC}"
    echo "  # 使用 Token 推送"
    echo "  git push https://YOUR_TOKEN@github.com/xuanyustudio/quant.git main"
    echo ""
    echo "  # 或先拉取远程更新"
    echo "  git pull origin main --allow-unrelated-histories"
    echo "  git push origin main"
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 上传成功！${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}查看您的仓库：${NC}"
echo "  https://github.com/xuanyustudio/quant"
echo ""

