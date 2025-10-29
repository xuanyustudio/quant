/**
 * PM2 配置文件 - 统计套利实盘交易
 * 
 * 使用方法：
 *   启动: pm2 start ecosystem.config.cjs
 *   停止: pm2 stop stat-arb
 *   重启: pm2 restart stat-arb
 *   查看: pm2 logs stat-arb
 *   监控: pm2 monit
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'stat-arb',
      
      // 启动脚本
      script: 'src/statistical-arbitrage/live-trading.js',
      
      // 启动参数（指定配置文件）
      args: '--config=./output/live_trading_config_1761638276782.json',
      
      // Node.js参数
      node_args: '',
      
      // 实例数量（统计套利建议只运行1个实例）
      instances: 1,
      
      // 执行模式：fork（单进程）或 cluster（多进程）
      exec_mode: 'fork',
      
      // 自动重启配置
      autorestart: true,           // 崩溃后自动重启
      watch: false,                // 不监听文件变化（生产环境建议关闭）
      max_memory_restart: '500M',  // 内存超过500M自动重启
      
      // 环境变量（会覆盖 .env 文件）
      env: {
        NODE_ENV: 'production',
        USE_PROXY: 'false',        // 服务器环境不需要代理
      },
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      
      // 日志轮转（防止日志文件过大）
      // log_type: 'json',  // ⚠️ 改为注释，使用普通格式输出
      max_size: '10M',
      retain: 7,  // 保留7天
      
      // 重启策略
      min_uptime: '10s',           // 运行至少10秒才算启动成功
      max_restarts: 10,            // 1分钟内最多重启10次
      restart_delay: 5000,         // 重启延迟5秒
      
      // 异常退出时的重启策略
      exp_backoff_restart_delay: 100,
      
      // 优雅退出配置
      kill_timeout: 5000,          // 5秒后强制退出
      listen_timeout: 3000,
      
      // 时间戳
      time: true,
    }
  ]
};

