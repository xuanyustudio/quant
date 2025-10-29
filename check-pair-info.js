/**
 * 查询交易对的市场信息
 * 包括：24h交易量、价格、流动性评估等
 */

import ccxt from 'ccxt';

async function checkPairInfo(symbol1, symbol2) {
  // 代理配置 - 常见代理端口
  const proxyUrls = [
    process.env.HTTP_PROXY,
    process.env.HTTPS_PROXY,
    'http://127.0.0.1:7897',  // Clash for Windows 默认端口
    'http://127.0.0.1:7891',
    'http://127.0.0.1:1087',  // ClashX 默认端口
    'http://127.0.0.1:10809', // v2rayN 默认端口
  ].filter(Boolean);
  
  const exchangeConfig = {
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'spot',
    }
  };
  
  // 如果有代理配置，添加到配置中（只使用httpsProxy，币安API使用HTTPS）
  if (proxyUrls.length > 0) {
    exchangeConfig.httpsProxy = proxyUrls[0];
    console.log(`🔗 检测到代理: ${proxyUrls[0]}\n`);
  } else {
    console.log(`⚠️  未检测到代理配置，尝试直连...\n`);
  }
  
  const exchange = new ccxt.binance(exchangeConfig);

  console.log('\n' + '='.repeat(70));
  console.log(`📊 查询交易对市场信息`);
  console.log('='.repeat(70) + '\n');
  console.log('⏳ 正在连接币安API...\n');

  try {
    // 逐个获取币种信息（避免fetchTickers需要先加载市场信息）
    console.log(`正在查询 ${symbol1}...`);
    const ticker1 = await exchange.fetchTicker(symbol1);
    console.log(`✅ 已获取 ${symbol1} 数据\n`);
    
    console.log(`正在查询 ${symbol2}...`);
    const ticker2 = await exchange.fetchTicker(symbol2);
    console.log(`✅ 已获取 ${symbol2} 数据\n`);
    
    const tickers = {
      [symbol1]: ticker1,
      [symbol2]: ticker2
    };
    
    const results = {};
    
    for (const symbol of [symbol1, symbol2]) {
      const ticker = tickers[symbol];
      
      if (!ticker) {
        console.log(`❌ 未找到 ${symbol} 的市场数据\n`);
        continue;
      }

      console.log(`\n━━━ ${symbol} ━━━\n`);
      
      // 基本价格信息
      console.log('💰 价格信息:');
      console.log(`   当前价格: $${ticker.last?.toFixed(6) || 'N/A'}`);
      console.log(`   24h 最高: $${ticker.high?.toFixed(6) || 'N/A'}`);
      console.log(`   24h 最低: $${ticker.low?.toFixed(6) || 'N/A'}`);
      console.log(`   24h 涨跌: ${ticker.percentage >= 0 ? '+' : ''}${ticker.percentage?.toFixed(2) || 'N/A'}%`);
      
      // 交易量信息
      console.log('\n📊 交易量信息:');
      const baseVol = ticker.baseVolume || 0;
      const quoteVol = ticker.quoteVolume || 0;
      console.log(`   24h 交易量 (币): ${baseVol.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
      console.log(`   24h 交易额 (USDT): $${quoteVol.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
      
      // 买卖盘深度
      console.log('\n📈 盘口信息:');
      console.log(`   最佳买价: $${ticker.bid?.toFixed(6) || 'N/A'}`);
      console.log(`   最佳卖价: $${ticker.ask?.toFixed(6) || 'N/A'}`);
      const spread = ticker.bid && ticker.ask ? ((ticker.ask - ticker.bid) / ticker.bid * 100).toFixed(4) : 'N/A';
      console.log(`   买卖价差: ${spread}%`);
      
      // 流动性评估
      console.log('\n💧 流动性评估:');
      const volume24h = quoteVol;
      let liquidityRating = '';
      let liquidityWarning = '';
      let liquidityScore = 0;
      
      if (volume24h >= 10000000) {
        liquidityRating = '★★★★★ 极佳';
        liquidityScore = 5;
      } else if (volume24h >= 5000000) {
        liquidityRating = '★★★★☆ 很好';
        liquidityScore = 4;
      } else if (volume24h >= 1000000) {
        liquidityRating = '★★★☆☆ 良好';
        liquidityScore = 3;
      } else if (volume24h >= 500000) {
        liquidityRating = '★★☆☆☆ 一般';
        liquidityWarning = '⚠️  流动性偏低，可能存在滑点';
        liquidityScore = 2;
      } else if (volume24h >= 100000) {
        liquidityRating = '★☆☆☆☆ 较差';
        liquidityWarning = '⚠️  流动性低，交易需谨慎';
        liquidityScore = 1;
      } else {
        liquidityRating = '☆☆☆☆☆ 极差';
        liquidityWarning = '🚨 流动性极低，不建议交易！';
        liquidityScore = 0;
      }
      
      console.log(`   流动性等级: ${liquidityRating}`);
      if (liquidityWarning) {
        console.log(`   ${liquidityWarning}`);
      }
      
      results[symbol] = {
        ticker,
        volume24h,
        liquidityScore,
        spread: parseFloat(spread) || 0
      };
    }
    
    // 配对分析
    console.log('\n' + '━'.repeat(70));
    console.log(`📌 配对分析: ${symbol1} / ${symbol2}`);
    console.log('━'.repeat(70) + '\n');
    
    const tick1 = tickers[symbol1];
    const tick2 = tickers[symbol2];
    
    if (tick1 && tick2) {
      const volume1 = tick1.quoteVolume || 0;
      const volume2 = tick2.quoteVolume || 0;
      const avgVolume = (volume1 + volume2) / 2;
      
      console.log('💰 综合交易量:');
      console.log(`   ${symbol1} 日交易额: $${volume1.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
      console.log(`   ${symbol2} 日交易额: $${volume2.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
      console.log(`   平均交易额: $${avgVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
      
      // 建议的交易金额
      const minTradeAmount = Math.max(avgVolume * 0.0001, 10);
      const safeTradeAmount = avgVolume * 0.0005;
      const maxTradeAmount = avgVolume * 0.001;
      
      console.log('\n💡 交易建议:');
      console.log(`   建议单笔最小: $${minTradeAmount.toFixed(0)}`);
      console.log(`   安全单笔金额: $${safeTradeAmount.toFixed(0)}`);
      console.log(`   建议单笔最大: $${maxTradeAmount.toFixed(0)}`);
      
      // 与您的$200交易金额对比
      const yourTradeAmount = 200;
      const impactPct = (yourTradeAmount / avgVolume * 100).toFixed(4);
      console.log(`\n📊 您的$${yourTradeAmount}交易影响:`);
      console.log(`   占日交易额比例: ${impactPct}%`);
      if (parseFloat(impactPct) > 0.1) {
        console.log(`   ⚠️  影响较大，可能产生滑点`);
      } else if (parseFloat(impactPct) > 0.05) {
        console.log(`   ⚠️  有一定影响，建议谨慎`);
      } else {
        console.log(`   ✅ 影响很小，可以交易`);
      }
      
      // 风险评估
      console.log('\n⚠️  风险评估:');
      
      const risks = [];
      let riskLevel = '低';
      
      if (avgVolume < 1000000) {
        risks.push('• 平均交易量低于 $1M，流动性风险较高');
        riskLevel = '高';
      }
      if (volume1 < 500000 || volume2 < 500000) {
        risks.push('• 其中一个币种交易量过低，可能出现较大滑点');
        riskLevel = '高';
      }
      if (Math.abs(volume1 - volume2) / Math.max(volume1, volume2) > 0.5) {
        risks.push('• 两个币种交易量差异较大，配对稳定性可能受影响');
        if (riskLevel !== '高') riskLevel = '中';
      }
      
      const spread1 = results[symbol1]?.spread || 0;
      const spread2 = results[symbol2]?.spread || 0;
      if (spread1 > 0.1 || spread2 > 0.1) {
        risks.push('• 买卖价差较大，交易成本较高');
        if (riskLevel !== '高') riskLevel = '中';
      }
      
      if (risks.length === 0) {
        console.log('   ✅ 该配对流动性充足，风险较低');
      } else {
        risks.forEach(risk => console.log(`   ${risk}`));
      }
      
      console.log(`\n   风险等级: ${riskLevel === '高' ? '🔴' : riskLevel === '中' ? '🟡' : '🟢'} ${riskLevel}`);
      
      // 新手友好度评分
      console.log('\n🎯 新手友好度评估:');
      let score = 100;
      
      if (avgVolume < 500000) score -= 30;
      else if (avgVolume < 1000000) score -= 20;
      else if (avgVolume < 5000000) score -= 10;
      
      if (volume1 < 500000 || volume2 < 500000) score -= 25;
      
      if (spread1 > 0.1 || spread2 > 0.1) score -= 15;
      
      if (parseFloat(impactPct) > 0.1) score -= 20;
      else if (parseFloat(impactPct) > 0.05) score -= 10;
      
      let scoreText = '';
      let recommendation = '';
      if (score >= 80) {
        scoreText = `${score}分 - ✅ 非常适合新手`;
        recommendation = '✅ 推荐交易此配对';
      } else if (score >= 60) {
        scoreText = `${score}分 - ⚠️ 谨慎交易`;
        recommendation = '⚠️  可以尝试，但需严格控制仓位';
      } else if (score >= 40) {
        scoreText = `${score}分 - ❌ 不太适合`;
        recommendation = '❌ 不建议新手交易，风险较高';
      } else {
        scoreText = `${score}分 - 🚨 强烈不建议`;
        recommendation = '🚨 强烈不建议交易！寻找更好的配对';
      }
      
      console.log(`   ${scoreText}`);
      console.log(`\n💡 最终建议:`);
      console.log(`   ${recommendation}`);
      
      // 流动性筛选建议
      console.log('\n📋 流动性筛选标准建议:');
      if (avgVolume < 5000000) {
        console.log('   ⚠️  当前配对流动性不足 $5M');
        console.log('   建议在配置中添加最小流动性阈值:');
        console.log('   minDailyVolume: 5000000  // $5M');
      } else {
        console.log('   ✅ 流动性满足建议标准（≥ $5M）');
      }
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n❌ 获取市场信息失败:', error.message);
    console.error('\n💡 提示:');
    console.error('   1. 请确保代理已正确配置并启动');
    console.error('   2. 检查币种代码是否正确（如 BTC/USDT, ETH/USDT）');
    console.error('   3. 如果仍然失败，请访问 https://www.coingecko.com 手动查询\n');
  }
}

// 主程序
const symbol1 = process.argv[2] || 'ID/USDT';
const symbol2 = process.argv[3] || 'HOOK/USDT';

checkPairInfo(symbol1, symbol2);

