/**
 * 统计套利配置文件
 */

export default {
  // 交易所配置
  // 使用Gate.io（国内直连，无需代理）
  // exchange: {
  //   id: 'gate',  // 使用Gate.io
  //   apiKey: process.env.GATE_API_KEY || '',
  //   secret: process.env.GATE_SECRET || '',
  //   enableRateLimit: true,
  //   timeout: 15000,
  //   options: {
  //     defaultType: 'spot'
  //   }
  // },
  
  // 如果本地代理可用，可以使用币安：
  exchange: {
    id: 'binance',
    apiKey: process.env.BINANCE_API_KEY || '',
    secret: process.env.BINANCE_SECRET || '',
    httpsProxy: 'http://localhost:7897',  // 本地代理
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'spot'
    }
  },
  
  // 其他交易所配置（如果你的网络环境支持）：
  // 
  // OKX（部分地区可能无法访问）：
  // exchange: {
  //   id: 'okx',
  //   apiKey: process.env.OKX_API_KEY || '',
  //   secret: process.env.OKX_SECRET || '',
  //   password: process.env.OKX_PASSWORD || '',  // OKX 需要 password
  //   enableRateLimit: true,
  //   options: { defaultType: 'spot' }
  // },
  //
  // 币安（需要代理，代理服务器也需要能访问币安）：
  // exchange: {
  //   id: 'binance',
  //   apiKey: process.env.BINANCE_API_KEY || '',
  //   secret: process.env.BINANCE_SECRET || '',
  //   httpsProxy: 'http://image.h4yx.com:3000',
  //   enableRateLimit: true,
  //   options: { defaultType: 'spot' }
  // },

  // 策略配置
  strategy: {
    // ========== 交易对选择 ==========
    // 包含 USDT、BTC、ETH 三种计价货币，提供更多配对可能性
    symbols: [
      // USDT 计价（主流）
      
        'BTC/USDT',   // 比特币，市值排名第1位，首个去中心化加密货币，数字黄金
        'ETH/USDT',   // 以太坊，市值排名第2位，智能合约平台，支持去中心化应用
        'BNB/USDT',   // 币安币，市值排名第4位，Binance生态代币，用于交易手续费减免等
        'SOL/USDT',   // Solana，市值排名第5位，高性能Layer 1公链，支持高并发
        'XRP/USDT',   // 瑞波币，市值排名第6位，跨境支付协议，面向金融机构
        'ADA/USDT',   // 卡尔达诺，市值排名第7位，学术驱动的Layer 1公链，强调安全性
        'DOGE/USDT',  // 狗狗币，市值排名第8位， meme币，社区驱动的去中心化货币
        'DOT/USDT',   // Polkadot，市值排名第9位，跨链基础设施，连接多条平行链
        'AVAX/USDT',  // Avalanche，市值排名第10位，Layer 1公链，支持子网定制
        'LINK/USDT',  // Chainlink，市值排名第11位，去中心化预言机，连接链下数据
        'UNI/USDT',   // Uniswap，市值排名第13位，以太坊生态去中心化交易所（DEX）
        'BCH/USDT',   // 比特币现金，市值排名第14位，比特币分叉币，强调扩容性
        'ATOM/USDT',  // Cosmos，市值排名第15位，跨链生态系统，支持链间互操作
        'TRX/USDT',   // 波场，市值排名第16位，公链平台，专注于娱乐和去中心化应用
        'SHIB/USDT',  // 柴犬币，市值排名第17位， meme币，以太坊生态ERC-20代币
        'NEAR/USDT',  // Near Protocol，市值排名第18位，Layer 1公链，注重开发者体验
        'FIL/USDT',   // Filecoin，市值排名第19位，去中心化存储网络，基于IPFS
        'APT/USDT',   // Aptos，市值排名第20位，Layer 1公链，由原Diem团队开发
        'ARB/USDT',   // Arbitrum，市值排名第21位，以太坊Layer 2扩容方案（Optimistic Rollup）
        'SUI/USDT',   // Sui Network，市值排名第22位，Layer 1公链，专注于低延迟和高吞吐量
        'XLM/USDT',   // Stellar Lumens，市值排名第23位，跨境支付协议，支持资产发行
        'DAI/USDT',   // Dai，市值排名第24位，去中心化稳定币，锚定美元（由MakerDAO发行）
        'HBAR/USDT',  // Hedera，市值排名第25位，企业级分布式账本，由理事会治理
        'XMR/USDT',   // 门罗币，市值排名第26位，隐私保护加密货币，支持匿名交易
        'CRO/USDT',   // Cronos，市值排名第28位，Binance生态链代币，支持EVM兼容
        'ZEC/USDT',   // 大零币，市值排名第30位，隐私保护公链，采用零知识证明
        'ALGO/USDT',  // Algorand，市值排名第31位，纯权益证明公链，支持即时交易确认
        'MKR/USDT',   // Maker，市值排名第32位，去中心化借贷协议，发行稳定币DAI
        'LDO/USDT',   // Lido DAO，市值排名第34位，流动性质押平台，支持以太坊等资产质押
        'CRV/USDT',   // Curve DAO，市值排名第35位，去中心化交易所，专注于稳定币兑换
        'GRT/USDT',   // The Graph，市值排名第36位，区块链数据索引协议，支持DApp高效查询
        'FET/USDT',   // Fetch.AI，市值排名第37位，人工智能协作网络，连接数字经济参与者
        'XTZ/USDT',   // Tezos，市值排名第39位，自我修正区块链，支持链上治理
        'CAKE/USDT',  // PancakeSwap，市值排名第40位，BSC生态去中心化交易所（DEX）
        'KAS/USDT',   // Kaspa，市值排名第41位，新型工作量证明公链，支持并行区块
        'VET/USDT',   // 唯链，市值排名第44位，供应链区块链，专注于企业级数据溯源
        'MATIC/USDT', // Polygon，市值排名第45位，以太坊扩容方案，支持Layer 2和侧链
        'WLD/USDT',   // Worldcoin，市值排名第46位，去中心化身份协议，基于生物识别
        'QNT/USDT',   // Quant，市值排名第47位，跨链通信协议，连接不同区块链网络
        'INJ/USDT',   // Injective，市值排名第48位，去中心化衍生品交易所，支持跨链交易
        'IMX/USDT',   // Immutable X，市值排名第50位，NFT Layer 2解决方案，基于以太坊
        'OP/USDT',    // Optimism，市值排名第51位，以太坊二层扩容方案（Optimistic Rollup）
        'STX/USDT',   // Stacks，市值排名第52位，比特币智能合约层，支持BTC生态DApp
        'NEXO/USDT',  // Nexo，市值排名第53位，加密借贷平台，支持加密资产质押借贷
        'TIA/USDT',   // Celestia，市值排名第54位，模块化区块链先锋，专注于数据可用性层
        'SEI/USDT',   // Sei，市值排名第55位，高性能Layer 1公链，专注于交易和DeFi
        'XDC/USDT',   // XDC Network，市值排名第56位，企业级区块链，支持跨境贸易金融
        'RNDR/USDT',  // Render Token，市值排名第58位，分布式GPU渲染网络，连接创作者与算力
        'PAXG/USDT',  // PAX Gold，市值排名第59位，黄金锚定代币，1:1锚定实物黄金
        'BONK/USDT',  // Bonk，市值排名第60位，Solana生态Memecoin，社区驱动的去中心化代币
        'TRUMP/USDT', // OFFICIAL TRUMP，市值排名第61位，政治主题代币，基于区块链的社区代币
        'LTC/USDT',   // 莱特币，市值排名第29位，比特币分叉币，注重快速交易和低手续费
        'AR/USDT',     // Arweave，市值排名第62位，去中心化存储网络，专注于持久性和不可变性
        'TON/USDT',   // TON，市值排名第63位，高性能Layer 1公链，专注于交易和DeFi
        'ENS/USDT',   // Ethereum Name Service，去中心化域名协议
        'AAVE/USDT',  // Aave，去中心化借贷协议
        'SAND/USDT',  // The Sandbox，元宇宙生态
        'PEPE/USDT',  // meme币，流行青蛙主题
        'CHZ/USDT',   // Chiliz，体育与娱乐区块链
        'AKT/USDT',   // Akash Network，去中心化云服务
        'SSV/USDT',   // SSV Network，ETH质押协议
        'TWT/USDT',   // Trust Wallet，去中心化钱包代币
        'AGIX/USDT',  // SingularityNET，人工智能生态
        'MINA/USDT',  // Mina Protocol，极轻区块链
        'BAND/USDT',  // Band Protocol，预言机项目
        'YFI/USDT',   // yearn.finance，DeFi收益聚合器
        'FLR/USDT',   // Flare Networks，跨链智能合约平台
        'GMX/USDT',   // GMX，去中心化永续合约交易所
        '1INCH/USDT', // 1inch，去中心化聚合交易平台
        'DYDX/USDT',  // dYdX，去中心化衍生品交易所
        'BIT/USDT',   // BitDAO，DAO治理代币
        'ID/USDT',    // SPACE ID，Web3域名和身份协议
        'GAL/USDT',   // Project Galaxy，Web3凭证数据网络
        'OCEAN/USDT', // Ocean Protocol，数据资产市场
        'SFP/USDT',   // SafePal，硬件钱包及生态
        'BAT/USDT',   // Basic Attention Token，广告与浏览器奖励
        'JASMY/USDT', // JasmyCoin，物联网与数据隐私
        'ORDI/USDT',  // Ordinals，比特币NFT生态
        'BICO/USDT',  // Biconomy，多链中继服务
        'CFX/USDT',   // Conflux，公有链项目
        'LUNA/USDT',  // Terra，算法稳定币生态（注意风险）
        'GLMR/USDT',  // Moonbeam，波卡并行链，EVM兼容
        'OM/USDT',    // MANTRA，去中心化治理协议
        'ICX/USDT',   // ICON，韩国区块链互操作平台
        'ACA/USDT',   // Acala，波卡DeFi中心
        'MOVR/USDT',  // Moonriver，Kusama平行链，EVM兼容
        'XEM/USDT',   // NEM，智能资产平台
        'STORJ/USDT', // Storj，去中心化云存储
        'SKL/USDT',   // SKALE，ETH扩容网络
        'BUSD/USDT',  // Binance USD，稳定币（部分平台支持）
        'RSR/USDT',   // Reserve Rights，稳定币协议
        'LOOM/USDT',  // Loom Network，可扩展DApp平台
        'CVC/USDT',   // Civic，去中心化身份认证
        'POLYX/USDT', // Polymesh，证券型代币区块链
        'SXP/USDT',   // Solar/SXP，支付生态
        'IOTA/USDT',  // IOTA，物联网区块链
        'DASH/USDT',  // Dash，支付型加密货币
        'FLOKI/USDT', // Floki Inu，meme币
        'ELF/USDT',   // aelf，高性能云计算公链
        'TOMI/USDT',  // tomiNet，去中心化互联网
        'RAD/USDT',   // Radicle，去中心化代码协作
        'HOOK/USDT',  // Hooked Protocol，Web3教育生态
        'SUPER/USDT', // SuperVerse，NFT与游戏生态
        'USTC/USDT',  // TerraClassicUSD，曾经算法稳定币（高风险）
        'EM/USDT',    // Eminer，BTC挖矿服务平台
        'GALA/USDT',  // Gala Games，链游和元宇宙
      
    
      
      // // BTC 计价（相对稳定的配对）
      // 'ETH/BTC',
      // 'BNB/BTC',
      // 'XRP/BTC',
      // 'ADA/BTC',
      // 'DOGE/BTC',
      // 'DOT/BTC',
      // 'LTC/BTC',
      // 'ATOM/BTC',
      
      // // ETH 计价（DeFi 相关）
      // 'AVAX/ETH',
      // 'LINK/ETH',
      // 'NEAR/ETH',
      // 'FIL/ETH',
      // 'APT/ETH'
    ],

    // ========== 相关性分析 ==========
    minCorrelation: 0.6,         // 最小相关系数（0.6 = 中等偏强相关，适合回测）
    maxStability: 0.05,          // 最大标准差（σ < 0.05 = 非常稳定，优质配对）
    maxPairs: 300,               // 回测300个相关配对，然后选收益最好的前3个
    enforceCorrelation: true,    // ✅ 已启用相关性检查（更安全）

    // ========== 时间参数 ==========
    timeframe: '1h',             // 相关性分析K线周期：'1m', '5m', '15m', '1h', '4h', '1d'
    backtestTimeframe: '15m',    // 回测K线周期（更细粒度，捕捉更多交易机会）
    correlationPeriod: 720,      // 相关性分析周期（小时）：720h = 30天（已弃用，改用多月分析）
    correlationAnalysisMonths: 6, // 相关性分析月份数：默认3个月，计算平均相关性以提高可靠性
    
    // ========== 历史回测时间范围（可选，不设置则使用最近的数据）==========
    // 格式: 'YYYY-MM-DD' 或 留空使用最近数据
    backtestStartDate: '2025-08-01',  // 回测开始日期
    backtestEndDate: '2025-08-30',    // 回测结束日期
    
    // ========== 交易信号（全局默认参数）==========
    // ✨ 策略已启用价格归一化，解决初始价差大导致Z-Score失效的问题
    // 两个价格序列都会归一化到起始值为1，然后计算相对价差
    // 
    // 这些是全局默认参数，如果某个币对没有单独配置，则使用这些值
    lookbackPeriod: 120,         // 回看周期（K线数量）- 默认值
    entryThreshold: 2.5,         // 开仓Z-score阈值（标准差倍数）- 精细化优化后
    exitThreshold: 0.5,          // 平仓Z-score阈值 - 精细化优化后
    stopLossThreshold: 5,     // 止损Z-score阈值 - 精细化优化后
    
    // ========== 币对级别参数（覆盖全局默认值）==========
    // 格式：'SYMBOL1/SYMBOL2': { lookbackPeriod, entryThreshold, exitThreshold, stopLossThreshold }
    // 例如：经过 optimize-params.js 优化后，为每个币对设置最优参数
    pairSpecificParams: {
      // 示例：
      // 'HOOK/USDT_MINA/USDT': {
      //   lookbackPeriod: 120,
      //   entryThreshold: 3.5,
      //   exitThreshold: 0.8,
      //   stopLossThreshold: 5.0
      // },
      // 'POLYX/USDT_ID/USDT': {
      //   lookbackPeriod: 80,
      //   entryThreshold: 2.8,
      //   exitThreshold: 0.5,
      //   stopLossThreshold: 4.5
      // }
      'ID/USDT_HOOK/USDT': {
        lookbackPeriod: 120,
        entryThreshold: 2.5,
        exitThreshold: 0.5,
        stopLossThreshold: 5
      },
      'MINA/USDT_POLYX/USDT': {
        lookbackPeriod: 140,
        entryThreshold: 3.5,
        exitThreshold: 0.5,
        stopLossThreshold: 5
      }
    },
    
    // ========== 资金管理（新手测试模式）==========
    initialCapital: 1000,        // 初始资金（USDT）- 测试资金
    tradeAmount: 200,            // 每次交易金额（USDT）- 小额测试
    positionSize: 0.5,           // 仓位比例（50%）- 保守
    maxPositions: 2,             // 最大同时持仓数 - 新手建议最多2个
    
    // ========== 交易策略类型 ==========
    strategyType: 'futures',     // ⭐ 策略类型：'spot'(现货) 或 'futures'(合约) - 默认使用合约
    useContractForShort: true,   // ⭐ 使用合约真正做空（推荐）
    leverage: 1,                 // ⭐ 杠杆倍数（1x = 不加杠杆，安全）
    marginType: 'cross',         // ⭐ 保证金模式：'cross'(全仓) 或 'isolated'(逐仓)
    
    // ========== 交易执行 ==========
    enableLiveTrading: false,    // 是否启用实盘交易（建议先回测）
    autoTrade: false,            // 是否自动交易
    commission: 0.001,           // 手续费率（0.1%）
    slippage: 0.0005,            // 滑点（0.05%）
    
    // ========== 扫描设置 ==========
    scanInterval: 60000,         // 扫描间隔（毫秒），60000 = 1分钟
    
    // ========== 风险控制（新手保守模式）==========
    maxDrawdown: 10,             // 最大回撤百分比 - 超过10%暂停
    maxDailyLoss: 50,            // 最大每日亏损（USDT）- 5%资金
    dailyTradeLimit: 5,          // 每日最大交易次数 - 防止过度交易
    maxHoldingHours: 48          // 最大持仓时间（小时）- 超时强制平仓
  }
};

