#!/bin/bash
# 清理日志输出 - 去除所有 ANSI 颜色代码和特殊字符

# 实时查看干净的日志
pm2 logs stat-arb --raw | sed -r 's/\x1b\[[0-9;]*m//g' | sed 's/\\n/\n/g'

