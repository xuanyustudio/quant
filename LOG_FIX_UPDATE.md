# 日志输出优化更新 🎨

## ❌ 问题描述

阿里云 PM2 日志输出为 JSON 格式，难以阅读：

```json
{"message":"[2025-10-29 10:53:35] \u001b[32MINFO\u001b[39M: 📊 MINA/USDT...","timestamp":"2025-10-29T10:53:35","type":"out"}
```

## ✅ 已修复

### 修改的文件

1. **`ecosystem.config.cjs`**
   - 注释掉 `log_type: 'json'`（第51行）
   - 改为普通文本输出

2. **`src/utils/logger.js`**
   - 生产环境自动禁用颜色代码
   - 开发环境保留彩色输出

3. **新增工具文件**
   - `view-logs.sh` - 交互式日志查看工具
   - `clean-logs.sh` - 快速查看干净日志
   - `SERVER_LOGS_GUIDE.md` - 完整日志查看指南

---

## 🚀 快速部署

### 方法1：一键自动部署（Linux/Mac）⭐ 推荐

```bash
chmod +x update-logs-config.sh

# 使用方法
./update-logs-config.sh root@your-server:/root/web3
```

### 方法2：一键自动部署（Windows PowerShell）⭐ 推荐

```powershell
# 使用方法
.\update-logs-config.ps1 -Server "123.456.789.0" -RemotePath "/root/web3" -User "root"
```

### 方法3：手动部署

#### 步骤1：上传文件到服务器

**Windows PowerShell:**
```powershell
# 上传配置文件
scp ecosystem.config.cjs root@your-server:/root/web3/
scp src/utils/logger.js root@your-server:/root/web3/src/utils/

# 上传日志工具
scp view-logs.sh root@your-server:/root/web3/
scp clean-logs.sh root@your-server:/root/web3/
```

**Linux/Mac:**
```bash
scp ecosystem.config.cjs root@your-server:/root/web3/
scp src/utils/logger.js root@your-server:/root/web3/src/utils/
scp view-logs.sh clean-logs.sh root@your-server:/root/web3/
```

#### 步骤2：在服务器上重启

```bash
# SSH 登录
ssh root@your-server

# 进入项目目录
cd /root/web3

# 设置脚本权限
chmod +x view-logs.sh clean-logs.sh

# 重启 PM2
pm2 delete stat-arb
pm2 start ecosystem.config.cjs
pm2 save
```

#### 步骤3：验证

```bash
# 查看日志（应该是干净的文本格式）
pm2 logs stat-arb
```

---

## 📊 使用日志工具

### 交互式菜单 ⭐ 推荐

```bash
./view-logs.sh
```

**菜单选项**：
1. 实时日志（带颜色）
2. 实时日志（无颜色）
3. 最近50行日志
4. 查看交易记录
5. 查看错误日志
6. 查看持仓信息
7. 查看盈亏统计

### 快速查看干净日志

```bash
./clean-logs.sh
```

### 常用命令

```bash
# 实时日志
pm2 logs stat-arb

# 最近50行
pm2 logs stat-arb --lines 50

# 查看交易
grep "开仓\|平仓" logs/combined.log | tail -20

# 查看持仓
pm2 logs stat-arb --lines 50 | grep "持仓状态"

# 查看盈亏
grep "盈亏" logs/combined.log | tail -10

# 去除颜色代码
pm2 logs stat-arb --raw | sed 's/\x1b\[[0-9;]*m//g'
```

---

## 📋 现在的日志格式

**优化前（JSON 格式）**：
```json
0|stat-arb | {"message":"[2025-10-29 10:53:35] \u001b[32MINFO\u001b[39M: 📊 MINA/USDT / POLYX/USDT","timestamp":"2025-10-29T10:53:35","type":"out","process_id":0,"app_name":"stat-arb"}
```

**优化后（纯文本）**：
```
[2025-10-29 10:53:35] INFO: ════════════════════════════════════════════════════════════
[2025-10-29 10:53:35] INFO: 📊 MINA/USDT / POLYX/USDT [2025/10/29 10:53:35]
[2025-10-29 10:53:35] INFO:    💰 当前价格: MINA/USDT=$0.10140000 | POLYX/USDT=$0.08460000
[2025-10-29 10:53:35] INFO:    📈 价格比率: 1.1986
[2025-10-29 10:53:35] INFO:    📊 相关系数: 0.977 ✨
[2025-10-29 10:53:35] INFO:    📉 价差统计: 当前=0.985275 | 均值=1.005103 | 标准差=0.008454
[2025-10-29 10:53:35] INFO:    🎯 Z-Score: -2.44 🔥
[2025-10-29 10:53:35] INFO:    📏 阈值: 开仓=3.1 | 平仓=0.6 | 止损=4.75
[2025-10-29 10:53:35] INFO:    ⏸️ 信号: HOLD - 观望: Z=-2.44
[2025-10-29 10:53:35] INFO:    💼 持仓状态: 无持仓
```

**如果还有颜色代码，使用**：
```bash
./clean-logs.sh
# 或
pm2 logs stat-arb --raw | sed 's/\x1b\[[0-9;]*m//g'
```

---

## 🔍 高级日志分析

### 查看今日交易

```bash
# 今日交易次数
grep "$(date +%Y-%m-%d)" logs/combined.log | grep "开仓" | wc -l

# 今日盈亏
grep "$(date +%Y-%m-%d)" logs/combined.log | grep "平仓" | grep "盈亏"
```

### 实时监控脚本

创建 `monitor.sh`：
```bash
#!/bin/bash
while true; do
  clear
  echo "════════════════════════════════════════"
  echo "统计套利实时监控 - $(date '+%Y-%m-%d %H:%M:%S')"
  echo "════════════════════════════════════════"
  
  pm2 status stat-arb
  echo ""
  
  echo "最新信号:"
  pm2 logs stat-arb --lines 20 --raw | grep "信号:" | tail -3
  echo ""
  
  echo "持仓状态:"
  pm2 logs stat-arb --lines 20 --raw | grep "持仓状态" | tail -1
  
  sleep 30
done
```

```bash
chmod +x monitor.sh
./monitor.sh
```

---

## ✅ 验证检查

部署后确认以下内容：

- [ ] PM2 日志不再是 JSON 格式
- [ ] 能正常查看实时日志
- [ ] `./view-logs.sh` 脚本正常工作
- [ ] 日志文件正常写入 `logs/` 目录
- [ ] 能搜索和过滤日志

---

## 🎯 推荐使用

**日常监控**：
```bash
# 使用交互式工具
./view-logs.sh

# 选择 "1) 实时日志（带颜色）" 或 "2) 实时日志（无颜色）"
```

**快速检查**：
```bash
# 查看最新状态
pm2 logs stat-arb --lines 20

# 查看交易
grep "开仓\|平仓" logs/combined.log | tail -10
```

**定期维护**：
```bash
# 每周清理日志
pm2 flush stat-arb
```

---

## 📚 更多信息

详细文档：`SERVER_LOGS_GUIDE.md`

---

**🎉 现在日志应该清晰美观了！**

