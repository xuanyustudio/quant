# GitHub 一键上传脚本 (Windows PowerShell)
# 使用方法：.\upload-to-github.ps1

$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$RED = "`e[31m"
$NC = "`e[0m"

Write-Host "${GREEN}════════════════════════════════════════════════════════${NC}"
Write-Host "${GREEN}🚀 GitHub 上传工具${NC}"
Write-Host "${GREEN}════════════════════════════════════════════════════════${NC}"
Write-Host ""

# 检查 Git 是否安装
try {
    $gitVersion = git --version
    Write-Host "${GREEN}✅ Git 已安装: $gitVersion${NC}"
} catch {
    Write-Host "${RED}❌ 未检测到 Git，请先安装: https://git-scm.com/download/win${NC}"
    exit 1
}

Write-Host ""

# 检查当前目录
Write-Host "${YELLOW}当前目录:${NC} $PWD"
Write-Host ""

# 检查是否已经初始化
if (Test-Path ".git") {
    Write-Host "${YELLOW}⚠️  Git 仓库已存在${NC}"
    $continue = Read-Host "是否继续？这将推送到远程仓库 (y/n)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        Write-Host "已取消"
        exit 0
    }
} else {
    Write-Host "${YELLOW}步骤 1/6: 初始化 Git 仓库...${NC}"
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${RED}❌ 初始化失败${NC}"
        exit 1
    }
    Write-Host "${GREEN}✅ 完成${NC}"
    Write-Host ""
    
    Write-Host "${YELLOW}步骤 2/6: 添加远程仓库...${NC}"
    git remote add origin https://github.com/xuanyustudio/quant.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${YELLOW}⚠️  远程仓库可能已存在，继续...${NC}"
    } else {
        Write-Host "${GREEN}✅ 完成${NC}"
    }
    Write-Host ""
}

Write-Host "${YELLOW}步骤 3/6: 检查将要上传的文件...${NC}"
git status
Write-Host ""

# 确认
Write-Host "${YELLOW}⚠️  重要提醒：${NC}"
Write-Host "  - 请确认没有敏感信息（API keys、密码等）"
Write-Host "  - logs/、data/、output/ 等目录不会被上传"
Write-Host "  - .gitignore 已配置好，会自动过滤敏感文件"
Write-Host ""

$confirm = Read-Host "确认要上传这些文件到 GitHub？(y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "已取消"
    exit 0
}

Write-Host ""
Write-Host "${YELLOW}步骤 4/6: 添加所有文件...${NC}"
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "${RED}❌ 添加文件失败${NC}"
    exit 1
}
Write-Host "${GREEN}✅ 完成${NC}"
Write-Host ""

Write-Host "${YELLOW}步骤 5/6: 提交到本地仓库...${NC}"
$commitMessage = Read-Host "请输入提交说明（留空使用默认）"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "更新: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

git commit -m "$commitMessage"
if ($LASTEXITCODE -ne 0) {
    Write-Host "${YELLOW}⚠️  提交失败，可能没有变更${NC}"
}
Write-Host "${GREEN}✅ 完成${NC}"
Write-Host ""

Write-Host "${YELLOW}步骤 6/6: 推送到 GitHub...${NC}"
Write-Host "${YELLOW}提示: 如果需要输入密码，请使用 GitHub Personal Access Token${NC}"
Write-Host "${YELLOW}获取 Token: https://github.com/settings/tokens${NC}"
Write-Host ""

# 尝试推送
git branch -M main
git push -u origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "${RED}❌ 推送失败${NC}"
    Write-Host ""
    Write-Host "${YELLOW}可能的原因：${NC}"
    Write-Host "  1. 需要身份验证（使用 Personal Access Token）"
    Write-Host "  2. 远程仓库有更新"
    Write-Host "  3. 网络问题"
    Write-Host ""
    Write-Host "${YELLOW}解决方案：${NC}"
    Write-Host "  # 使用 Token 推送"
    Write-Host "  git push https://YOUR_TOKEN@github.com/xuanyustudio/quant.git main"
    Write-Host ""
    Write-Host "  # 或先拉取远程更新"
    Write-Host "  git pull origin main --allow-unrelated-histories"
    Write-Host "  git push origin main"
    exit 1
}

Write-Host ""
Write-Host "${GREEN}════════════════════════════════════════════════════════${NC}"
Write-Host "${GREEN}🎉 上传成功！${NC}"
Write-Host "${GREEN}════════════════════════════════════════════════════════${NC}"
Write-Host ""
Write-Host "${YELLOW}查看您的仓库：${NC}"
Write-Host "  https://github.com/xuanyustudio/quant"
Write-Host ""

