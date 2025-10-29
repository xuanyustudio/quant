# PM2 权限错误修复指南

## ❌ 错误信息

```
Error: EACCES: permission denied, mkdir '/root/.pm2/logs'
Error: EACCES: permission denied, mkdir '/root/.pm2/pids'
Error: EACCES: permission denied, open '/root/.pm2/module_conf.json'
```

## ✅ 快速解决方案

### 方法1：修复 PM2 目录权限 ⭐ 推荐

```bash
# 检查当前用户
whoami

# 检查 .pm2 目录权限
ls -la /root/.pm2

# 修复权限（如果目录已存在）
sudo chown -R $(whoami):$(whoami) /root/.pm2
sudo chmod -R 755 /root/.pm2

# 重启 PM2
pm2 restart stat-arb
```

### 方法2：删除并重建 PM2 目录

```bash
# 停止所有 PM2 进程
pm2 kill

# 删除 PM2 目录
sudo rm -rf /root/.pm2

# 重新启动
pm2 start ecosystem.config.cjs
pm2 save
```

### 方法3：使用 sudo 运行

```bash
# 如果当前用户不是 root
sudo pm2 restart stat-arb

# 或切换到 root
su root
pm2 restart stat-arb
```

---

## 🔍 详细排查步骤

### 步骤1：检查当前用户和目录权限

```bash
# 当前用户
whoami

# 查看 .pm2 目录
ls -la /root/ | grep pm2

# 查看 .pm2 目录详情
ls -la /root/.pm2/
```

**预期输出**：
```
drwxr-xr-x  5 root root 4096 Oct 29 10:00 .pm2
```

如果所有者不是 `root`，需要修复。

### 步骤2：修复权限

```bash
# 修复所有者
sudo chown -R root:root /root/.pm2

# 修复权限
sudo chmod -R 755 /root/.pm2

# 验证
ls -la /root/.pm2/
```

### 步骤3：清理并重启

```bash
# 清理 PM2
pm2 kill

# 删除锁文件
sudo rm -f /root/.pm2/pm2.pid
sudo rm -f /root/.pm2/rpc.sock
sudo rm -f /root/.pm2/pub.sock

# 重新启动
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs stat-arb
```

---

## 🎯 最可能的原因

### 原因1：目录被其他用户创建

如果之前使用了 `sudo` 或其他用户运行 PM2，`.pm2` 目录的所有者可能不对。

**解决**：
```bash
sudo chown -R $(whoami):$(whoami) /root/.pm2
```

### 原因2：宝塔面板权限冲突

从错误路径 `/www/server/nvm/` 看出您使用了宝塔面板。宝塔可能用不同的用户管理 Node.js。

**解决**：
```bash
# 检查当前 Node.js 用户
ps aux | grep node

# 使用正确的用户运行
su - root  # 切换到 root
pm2 restart stat-arb
```

### 原因3：SELinux 或 AppArmor 限制

**检查**：
```bash
# 检查 SELinux 状态
sestatus

# 如果启用，临时禁用
sudo setenforce 0
```

---

## 🚀 推荐完整重启流程

```bash
# 1. 停止所有 PM2 进程
pm2 kill

# 2. 删除 PM2 目录（备份重要数据）
sudo rm -rf /root/.pm2

# 3. 确认在正确的目录
cd /root/lianghua  # 或您的项目路径

# 4. 重新启动
pm2 start ecosystem.config.cjs

# 5. 保存配置
pm2 save

# 6. 设置开机自启
pm2 startup

# 7. 查看日志
pm2 logs stat-arb
```

---

## 📋 宝塔面板特殊处理

### 如果使用宝塔面板的 Node.js

```bash
# 1. 在宝塔面板中找到 Node.js 项目管理

# 2. 或使用宝塔的命令行工具
bt

# 3. 或确保使用 root 用户
su root
cd /root/lianghua

# 4. 重启
pm2 kill
pm2 start ecosystem.config.cjs
pm2 save
```

---

## ✅ 验证修复

```bash
# 1. 检查 PM2 状态
pm2 status

# 2. 检查日志
pm2 logs stat-arb --lines 20

# 3. 查看进程
ps aux | grep stat-arb

# 4. 检查目录权限
ls -la /root/.pm2
```

**预期输出**：
```
┌────┬─────────────┬─────────┬─────────┬──────┬────────┐
│ id │ name        │ status  │ restart │ cpu  │ memory │
├────┼─────────────┼─────────┼─────────┼──────┼────────┤
│ 0  │ stat-arb    │ online  │ 0       │ 0%   │ 50 MB  │
└────┴─────────────┴─────────┴─────────┴──────┴────────┘
```

---

## 🛠️ 一键修复脚本

创建 `fix-pm2-permission.sh`：

```bash
#!/bin/bash

echo "🔧 修复 PM2 权限问题..."
echo ""

# 检查当前用户
echo "当前用户: $(whoami)"
echo ""

# 停止 PM2
echo "停止 PM2..."
pm2 kill

# 备份配置
if [ -f /root/.pm2/dump.pm2 ]; then
  echo "备份 PM2 配置..."
  cp /root/.pm2/dump.pm2 /tmp/pm2_dump_backup.pm2
fi

# 删除 PM2 目录
echo "删除旧的 PM2 目录..."
sudo rm -rf /root/.pm2

# 重新启动
echo "重新启动 PM2..."
cd /root/lianghua
pm2 start ecosystem.config.cjs
pm2 save

# 设置开机自启
echo "设置开机自启..."
pm2 startup

echo ""
echo "✅ 修复完成！"
echo ""
echo "查看状态:"
pm2 status
```

使用：
```bash
chmod +x fix-pm2-permission.sh
./fix-pm2-permission.sh
```

---

## ⚠️ 注意事项

1. **备份重要数据**
   ```bash
   # 备份 PM2 配置
   pm2 save
   cp /root/.pm2/dump.pm2 /tmp/backup/
   ```

2. **确认当前路径**
   ```bash
   pwd  # 应该在项目目录
   ```

3. **使用正确的用户**
   ```bash
   # 如果不是 root，切换到 root
   su root
   ```

4. **宝塔面板用户**
   - 建议在宝塔面板中管理 Node.js 项目
   - 或确保使用相同的用户运行

---

## 🎯 最简单的解决方案

```bash
# 一行命令解决
pm2 kill && sudo rm -rf /root/.pm2 && cd /root/lianghua && pm2 start ecosystem.config.cjs && pm2 save
```

---

**现在可以重试了！** 🚀

