# GitHub 上传快速指南 ⚡

## 🚀 最快方法（3步搞定）

### 方法1：使用一键脚本 ⭐ 推荐

**Windows PowerShell:**
```powershell
# 在项目目录 D:\work\web3 打开 PowerShell
.\upload-to-github.ps1
```

**Git Bash:**
```bash
chmod +x upload-to-github.sh
./upload-to-github.sh
```

### 方法2：手动命令

```bash
# 1. 初始化并添加远程仓库
git init
git remote add origin https://github.com/xuanyustudio/quant.git

# 2. 添加并提交
git add .
git commit -m "首次提交：量化交易系统"

# 3. 推送到 GitHub
git branch -M main
git push -u origin main
```

---

## 🔑 身份验证

### 如果提示需要用户名和密码

**不要使用 GitHub 密码！请使用 Personal Access Token：**

1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 复制生成的 token

**推送时使用 token：**
```bash
git push https://YOUR_TOKEN@github.com/xuanyustudio/quant.git main
```

**示例：**
```bash
git push https://ghp_xxxxxxxxxxxxxxxxxxxx@github.com/xuanyustudio/quant.git main
```

---

## ⚠️ 常见问题

### 问题1：推送失败 - 远程仓库有内容

```bash
# 先拉取合并
git pull origin main --allow-unrelated-histories

# 再推送
git push origin main
```

### 问题2：推送太慢

可能是网络问题，可以：
- 使用 VPN
- 使用 GitHub Desktop（图形界面）
- 分多次推送

### 问题3：忘记配置 Git

```bash
git config --global user.name "您的用户名"
git config --global user.email "您的邮箱"
```

---

## ✅ 上传前检查

```bash
# 查看将要上传的文件
git status

# 确保这些目录不会被上传：
# ❌ node_modules/
# ❌ logs/
# ❌ data/
# ❌ output/*.json
# ❌ .env
```

---

## 📝 后续更新

```bash
# 修改代码后
git add .
git commit -m "更新说明"
git push origin main
```

---

## 🌟 推荐使用 GitHub Desktop

如果命令行太复杂，建议使用图形界面：

1. 下载：https://desktop.github.com/
2. 登录 GitHub 账号
3. Add → Add existing repository → 选择 `D:\work\web3`
4. Publish repository

更简单直观！

---

**详细文档**：`UPLOAD_TO_GITHUB.md`

**🎉 现在就开始上传吧！**

