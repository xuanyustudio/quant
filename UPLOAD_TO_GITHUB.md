# GitHub 上传指南 🚀

## 📋 准备工作

### 步骤1：检查 Git 安装

```bash
# Windows PowerShell 或 Git Bash
git --version
```

如果没有安装，下载安装：https://git-scm.com/download/win

### 步骤2：配置 Git（首次使用）

```bash
# 设置用户名和邮箱
git config --global user.name "您的用户名"
git config --global user.email "您的邮箱"

# 验证配置
git config --global --list
```

---

## 🚀 上传到 GitHub

### 方法1：Windows PowerShell（推荐）⭐

在项目目录 `D:\work\web3` 打开 PowerShell，执行：

```powershell
# 1. 初始化 Git 仓库
git init

# 2. 添加远程仓库
git remote add origin https://github.com/xuanyustudio/quant.git

# 3. 添加所有文件（.gitignore 会自动过滤敏感文件）
git add .

# 4. 提交到本地仓库
git commit -m "首次提交：量化交易统计套利系统"

# 5. 推送到 GitHub（首次推送）
git branch -M main
git push -u origin main
```

**如果需要输入 GitHub 账号密码**：
- 用户名：xuanyustudio
- 密码：使用 GitHub Personal Access Token（不是密码）

### 方法2：使用 GitHub Desktop（更简单）

1. 下载安装 GitHub Desktop：https://desktop.github.com/
2. 登录您的 GitHub 账号
3. 点击 "Add" → "Add existing repository"
4. 选择 `D:\work\web3` 目录
5. 点击 "Publish repository"
6. 勾选 "Keep this code private"（如果需要私密）
7. 点击 "Publish Repository"

---

## 🔑 GitHub Token 配置（如果需要）

### 创建 Personal Access Token

1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 勾选权限：
   - ✅ `repo` (完整仓库权限)
   - ✅ `workflow` (如果使用 GitHub Actions)
4. 点击 "Generate token"
5. **复制并保存 token**（只显示一次！）

### 使用 Token

```bash
# 方式1：在推送时使用
git push https://<TOKEN>@github.com/xuanyustudio/quant.git main

# 方式2：配置凭据（推荐）
git config --global credential.helper store
git push origin main
# 输入用户名：xuanyustudio
# 输入密码：粘贴您的 Token
```

---

## 📝 创建 README.md

在上传前，建议创建一个 README.md 文件：

```markdown
# 量化交易统计套利系统

基于 Node.js 的加密货币统计套利交易系统，支持现货和合约交易。

## 功能特性

- ✅ 统计套利策略（Pairs Trading）
- ✅ 现货和合约模式
- ✅ 实时交易和回测
- ✅ 风险管理和止损
- ✅ HTML 可视化报告

## 快速开始

\`\`\`bash
# 安装依赖
npm install

# 回测
npm run stat-arb:backtest-pair -- --symbol1=BTC/USDT --symbol2=ETH/USDT --start=2025-01-01 --end=2025-01-31

# 实盘
npm run stat-arb:live
\`\`\`

## 文档

- [新手快速入门](./docs/NEWBIE_QUICKSTART.md)
- [统计套利指南](./docs/STATISTICAL_ARBITRAGE_GUIDE.md)
- [合约策略指南](./docs/FUTURES_STRATEGY_GUIDE.md)
- [实盘交易指南](./docs/LIVE_TRADING_GUIDE.md)

## 注意

⚠️ 本项目仅供学习研究使用，实盘交易有风险，投资需谨慎！
\`\`\`

保存为 `README.md` 到项目根目录。

---

## ⚠️ 上传前检查清单

### 确保不上传敏感信息

```powershell
# 检查将要上传的文件
git status
git diff --cached

# 确认以下文件/目录不会被上传：
# ✅ .env（环境变量）
# ✅ logs/（日志文件）
# ✅ node_modules/（依赖）
# ✅ data/（历史数据）
# ✅ output/*.json（实盘配置，可能包含 API keys）
# ✅ proxy/config（代理配置）
```

### 如果发现敏感文件

```bash
# 从暂存区移除
git reset HEAD <文件名>

# 或添加到 .gitignore
echo "敏感文件名" >> .gitignore
git add .gitignore
```

---

## 🔄 后续更新

### 修改代码后推送

```bash
# 查看修改
git status

# 添加修改的文件
git add .

# 提交
git commit -m "更新说明"

# 推送到 GitHub
git push origin main
```

### 常用 Git 命令

```bash
# 查看状态
git status

# 查看历史
git log --oneline

# 撤销修改（未提交）
git checkout -- <文件名>

# 撤销提交（已提交但未推送）
git reset HEAD~1

# 拉取远程更新
git pull origin main

# 查看远程仓库
git remote -v

# 修改远程仓库地址
git remote set-url origin <新地址>
```

---

## 📂 项目结构说明

```
web3/
├── src/                          # 源代码
│   ├── statistical-arbitrage/   # 统计套利模块
│   │   ├── PairsStrategy.js     # 现货策略
│   │   ├── FuturesStrategy.js   # 合约策略
│   │   ├── Backtest.js          # 回测引擎
│   │   └── live-trading.js      # 实盘交易
│   ├── config/                   # 配置文件
│   └── utils/                    # 工具函数
├── docs/                         # 文档
├── output/                       # 回测输出（不上传）
├── logs/                         # 日志（不上传）
├── data/                         # 历史数据（不上传）
├── package.json                  # 项目配置
├── ecosystem.config.cjs          # PM2 配置
└── README.md                     # 项目说明
```

---

## 🌟 推荐设置

### 1. 设置仓库为私密（如果包含交易策略）

在 GitHub 仓库页面：
- Settings → Danger Zone → Change repository visibility
- 选择 "Private"

### 2. 添加 .github/workflows（CI/CD，可选）

创建 `.github/workflows/test.yml`：

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
```

### 3. 添加 License

在 GitHub 仓库页面：
- Add file → Create new file
- 文件名：`LICENSE`
- 选择 License 模板（如 MIT）

---

## 🐛 常见问题

### 问题1：推送失败 - 403 Forbidden

**原因**：没有权限或 token 过期

**解决**：
```bash
# 使用 token 推送
git push https://<YOUR_TOKEN>@github.com/xuanyustudio/quant.git main
```

### 问题2：推送失败 - 远程仓库有更新

**解决**：
```bash
# 先拉取远程更新
git pull origin main --allow-unrelated-histories

# 再推送
git push origin main
```

### 问题3：推送太慢

**解决**：
```bash
# 使用 SSH（需要配置 SSH key）
git remote set-url origin git@github.com:xuanyustudio/quant.git

# 或使用国内镜像
git config --global url."https://github.com.cnpmjs.org/".insteadOf https://github.com/
```

### 问题4：不小心上传了敏感文件

**解决**：
```bash
# 从 Git 历史中完全删除文件
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch <文件路径>" \
  --prune-empty --tag-name-filter cat -- --all

# 强制推送
git push origin main --force

# 更改所有 API keys！
```

---

## ✅ 验证上传

上传成功后，访问：
https://github.com/xuanyustudio/quant

应该看到：
- ✅ 项目代码
- ✅ README.md 显示
- ✅ 文件结构完整
- ❌ 没有 logs、data、output 等敏感目录

---

## 📚 更多资源

- [Git 官方文档](https://git-scm.com/doc)
- [GitHub 文档](https://docs.github.com/)
- [Git 简明指南](https://rogerdudler.github.io/git-guide/index.zh.html)

---

**🎉 现在可以开始上传了！**

