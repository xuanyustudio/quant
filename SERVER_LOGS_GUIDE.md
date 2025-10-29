# 服务器日志查看指南

## 🎯 问题解决

之前的 JSON 格式日志已经优化！

### 已修改的文件

**`ecosystem.config.cjs`**
- ✅ 注释掉了 `log_type: 'json'`
- ✅ 现在使用普通文本格式输出

---

## 📊 日志查看方式

### 方法1：使用日志查看工具 ⭐ 推荐

```bash
# 上传脚本到服务器
chmod +x view-logs.sh

# 运行
./view-logs.sh
```

**功能菜单**：
1. 实时日志（带颜色）
2. 实时日志（无颜色，纯净输出）
3. 查看最近50行日志
4. 查看交易记录
5. 查看错误日志
6. 查看持仓信息
7. 查看盈亏统计
8. 清理 ANSI 颜色代码
9. PM2 原始日志

### 方法2：实时查看干净日志

```bash
# 使用脚本
chmod +x clean-logs.sh
./clean-logs.sh

# 或手动命令
pm2 logs stat-arb --raw | sed 's/\x1b\[[0-9;]*m//g'
```

### 方法3：查看特定内容

#### 查看交易记录
```bash
grep "开仓\|平仓" logs/combined.log | tail -20
```

#### 查看持仓状态
```bash
pm2 logs stat-arb --lines 50 --raw | grep "持仓状态"
```

#### 查看盈亏
```bash
pm2 logs stat-arb --lines 100 --raw | grep "盈亏"
```

#### 查看信号
```bash
pm2 logs stat-arb --lines 100 --raw | grep "信号:"
```

---

## 🔧 部署步骤

### 1. 上传修改后的配置

```bash
# 在本地
scp ecosystem.config.cjs user@your-server:/path/to/project/

# 在服务器上重启
pm2 delete stat-arb
pm2 start ecosystem.config.cjs
pm2 save
```

### 2. 上传日志脚本

```bash
# 上传脚本
scp view-logs.sh user@your-server:/path/to/project/
scp clean-logs.sh user@your-server:/path/to/project/

# 在服务器上
chmod +x view-logs.sh clean-logs.sh
```

### 3. 测试日志输出

```bash
# 查看实时日志
pm2 logs stat-arb

# 应该看到干净的输出，类似：
# [2025-10-29 10:53:35] INFO: ════════════════════════════════════════════════════════════
# [2025-10-29 10:53:35] INFO: 📊 MINA/USDT / POLYX/USDT
# [2025-10-29 10:53:35] INFO:    💰 当前价格: MINA/USDT=$0.10140000 | POLYX/USDT=$0.08460000
```

---

## 🎨 日志优化选项

### 选项1：完全禁用颜色（推荐服务器）

修改 `src/utils/logger.js`：

```javascript
// 在 format 配置中添加
format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.uncolorize(),  // ⭐ 添加这行，完全禁用颜色
  format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
)
```

### 选项2：条件性禁用颜色

```javascript
// 在生产环境自动禁用颜色
const shouldColorize = process.env.NODE_ENV !== 'production';

format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  shouldColorize ? format.colorize() : format.uncolorize(),
  format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
)
```

---

## 📋 常用命令

### PM2 日志管理

```bash
# 实时查看日志
pm2 logs stat-arb

# 查看最近N行
pm2 logs stat-arb --lines 100

# 只看错误
pm2 logs stat-arb --err

# 只看输出
pm2 logs stat-arb --out

# 清空日志
pm2 flush stat-arb

# 重载日志
pm2 reloadLogs
```

### 日志文件直接查看

```bash
# 实时查看
tail -f logs/combined.log

# 查看最近50行
tail -50 logs/combined.log

# 查看交易日志
tail -f logs/trades.log

# 查看错误日志
tail -50 logs/error.log

# 去除颜色代码
tail -f logs/combined.log | sed 's/\x1b\[[0-9;]*m//g'
```

### 日志搜索

```bash
# 搜索特定内容
grep "开仓" logs/combined.log | tail -20

# 搜索错误
grep "ERROR" logs/combined.log | tail -20

# 搜索今天的日志
grep "$(date +%Y-%m-%d)" logs/combined.log

# 统计交易次数
grep "开仓" logs/combined.log | wc -l
```

---

## 🔍 日志分析

### 查看关键指标

#### 今日交易次数
```bash
grep "$(date +%Y-%m-%d)" logs/combined.log | grep "开仓" | wc -l
```

#### 今日盈亏
```bash
grep "$(date +%Y-%m-%d)" logs/combined.log | grep "平仓" | grep "盈亏"
```

#### 当前持仓
```bash
pm2 logs stat-arb --lines 50 --raw | grep "持仓状态" | tail -1
```

#### 最新信号
```bash
pm2 logs stat-arb --lines 50 --raw | grep "信号:" | tail -5
```

---

## 🚨 问题排查

### 日志太乱？

**原因**：
- JSON 格式输出（已修复）
- ANSI 颜色代码

**解决**：
```bash
# 使用 sed 去除颜色
pm2 logs stat-arb --raw | sed 's/\x1b\[[0-9;]*m//g'

# 或使用提供的脚本
./clean-logs.sh
```

### 日志文件过大？

```bash
# 清空日志
pm2 flush stat-arb

# 或手动删除
rm logs/pm2-*.log
pm2 restart stat-arb
```

### 日志不更新？

```bash
# 重载日志
pm2 reloadLogs

# 或重启应用
pm2 restart stat-arb
```

---

## 📊 日志监控脚本

### 创建监控脚本

```bash
# monitor.sh
#!/bin/bash

while true; do
  clear
  echo "════════════════════════════════════════"
  echo "统计套利实时监控"
  echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "════════════════════════════════════════"
  echo ""
  
  echo "📊 程序状态:"
  pm2 status stat-arb
  echo ""
  
  echo "📈 最新信号:"
  pm2 logs stat-arb --lines 20 --raw | grep "信号:" | tail -3 | sed 's/\x1b\[[0-9;]*m//g'
  echo ""
  
  echo "💼 持仓状态:"
  pm2 logs stat-arb --lines 20 --raw | grep "持仓状态" | tail -1 | sed 's/\x1b\[[0-9;]*m//g'
  echo ""
  
  echo "💰 最近交易:"
  grep "平仓" logs/combined.log | tail -3 | sed 's/\x1b\[[0-9;]*m//g'
  echo ""
  
  echo "刷新中... (Ctrl+C 退出)"
  sleep 30
done
```

```bash
chmod +x monitor.sh
./monitor.sh
```

---

## ✅ 检查清单

部署后确认：

- [ ] PM2 重启后日志不再是 JSON 格式
- [ ] 能正常查看实时日志
- [ ] 日志脚本可以正常使用
- [ ] 日志文件在 `logs/` 目录正常写入
- [ ] 能搜索和过滤日志内容

---

## 🎯 最佳实践

1. **使用日志脚本**
   ```bash
   ./view-logs.sh  # 选择需要的查看方式
   ```

2. **定期清理日志**
   ```bash
   # 每周清理一次（PM2 会自动轮转）
   pm2 flush stat-arb
   ```

3. **重要日志备份**
   ```bash
   # 备份交易日志
   cp logs/trades.log logs/backup/trades_$(date +%Y%m%d).log
   ```

4. **监控关键指标**
   ```bash
   # 创建定时任务检查盈亏
   crontab -e
   # 添加：每天晚上发送盈亏统计
   0 20 * * * grep "平仓" /path/to/logs/combined.log | grep "$(date +%Y-%m-%d)" | mail -s "今日交易" your@email.com
   ```

---

**现在日志应该清晰美观了！** 🎉

