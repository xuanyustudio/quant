// 主配置文件
export default {
  // 交易所配置
  exchanges: {
    binance: {
      id: 'binance',
      enabled: false,  // 国内建议禁用或使用代理
      apiKey: process.env.BINANCE_API_KEY || '',
      secret: process.env.BINANCE_SECRET || '',
      defaultType: 'spot',
      options: {
        adjustForTimeDifference: true,
        // 国内用户可以尝试使用代理
        // proxy: process.env.PROXY_URL || '',
        // 或使用其他可访问的域名（如果有）
        // hostname: 'api.binance.com'
      }
    },
    okx: {
      id: 'okx',
      enabled: true,
      apiKey: process.env.OKX_API_KEY || '',
      secret: process.env.OKX_SECRET || '',
      password: process.env.OKX_PASSWORD || '',
      defaultType: 'spot'
    },
    huobi: {
      id: 'huobi',
      enabled: true,
      apiKey: process.env.HUOBI_API_KEY || '',
      secret: process.env.HUOBI_SECRET || '',
      defaultType: 'spot'
    },
    gate: {
      id: 'gate',
      enabled: true,
      apiKey: process.env.GATE_API_KEY || '',
      secret: process.env.GATE_SECRET || '',
      defaultType: 'spot'
    }
  },

  // 监控的交易对
  tradingPairs: [
    'BTC/USDT',
    'ETH/USDT',
    'BNB/USDT',
    'SOL/USDT',
    'XRP/USDT',
    // 添加更多交易对...
  ],

  // 套利配置
  arbitrage: {
    minProfitPercent: 0.5,  // 最小利润率 0.5%
    includeFees: true,       // 是否计入手续费
    fees: {
      binance: 0.001,  // 0.1%
      okx: 0.001,
      huobi: 0.002,
      gate: 0.002
    }
  },

  // 交易执行配置
  execution: {
    autoTrade: false,        // 自动交易开关（建议先用false测试）
    tradeAmount: 100,        // 每次交易金额（USDT）
    minOrderAmount: 10,      // 最小订单金额
    maxOrderAmount: 1000,    // 最大订单金额
    orderType: 'limit',      // 订单类型: limit 或 market
    slippageTolerance: 0.001 // 滑点容忍度 0.1%
  },

  // 风险管理配置
  risk: {
    maxDailyLoss: 100,       // 最大每日亏损（USDT）
    maxPositionSize: 1000,   // 最大持仓（USDT）
    maxSlippage: 0.005,      // 最大滑点 0.5%
    minLiquidity: 10000,     // 最小流动性（USDT）
    maxTradesPerHour: 10     // 每小时最大交易次数
  },

  // 扫描间隔（毫秒）
  scanInterval: 3000,        // 每3秒扫描一次

  // 通知配置（可选）
  notifications: {
    telegram: {
      enabled: false,
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || ''
    },
    email: {
      enabled: false,
      // 邮件配置...
    }
  }
};

