import { executeQuery } from './db';
import { sendTelegramNotification } from './binance';

export interface NarrativeItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  score: number; // 0 - 100 Momentum Score
  velocity: 'VERY HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
  velocity_pct: number;
  social_growth_24h: number;
  volume_growth_24h: number;
  onchain_growth_24h: number;
  news_count_24h: number;
  top_coins: string[];
  status: 'ACTIVE' | 'EMERGING' | 'COOLING';
  updated_at: string;
}

export interface CoinOpportunity {
  id: number;
  symbol: string;
  name: string;
  narrative_slug: string;
  narrative_name: string;
  chain: string;
  price: number;
  price_change_1h: number;
  price_change_24h: number;
  price_change_7d: number;
  price_change_30d: number;
  volume_24h: number;
  market_cap: number;
  fdv: number;
  circulating_pct: number;
  ath_distance_pct: number;
  
  // On-Chain Layer (30%)
  active_address_growth_7d: number;
  active_address_growth_30d: number;
  new_address_growth_30d: number;
  whale_net_flow_usd: number;
  whale_action: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  exchange_netflow_usd: number;
  exchange_flow_status: 'NET OUTFLOW' | 'NET INFLOW' | 'BALANCED';
  top10_concentration_pct: number;
  holder_growth_30d: number;
  tvl_usd: number;
  tvl_growth_30d: number;
  protocol_revenue_30d: number;
  revenue_growth_30d: number;
  
  // Derivatives Layer (10%)
  open_interest_usd: number;
  oi_change_24h: number;
  funding_rate: number;
  funding_percentile: number;
  funding_status: 'NORMAL' | 'CROWDED LONG' | 'NEGATIVE SQUEEZE';
  short_liquidation_24h: number;
  long_liquidation_24h: number;
  
  // Token Unlock & Tokenomics Layer (10%)
  next_unlock_date: string | null;
  unlock_amount_pct: number;
  unlock_usd_value: number;
  unlock_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  
  // Narrative & Social Layer (20%)
  social_growth_24h: number;
  narrative_velocity_pct: number;
  news_mentions_24h: number;
  search_trend_score: number;
  
  // Composite Scores (0 - 100)
  onchain_score: number;
  narrative_score: number;
  market_momentum_score: number;
  liquidity_score: number;
  derivatives_score: number;
  tokenomics_score: number;
  opportunity_score: number; // 0 to 100
  
  // Signal Classification
  signal_classification: 'EARLY_ACCUMULATION' | 'NARRATIVE_BREAKOUT' | 'CROWDED_RISK' | 'DISTRIBUTION_WARNING';
  catalyst_summary: string;
  updated_at: string;
}

export interface CatalystEvent {
  id: number;
  coin_symbol: string;
  title: string;
  event_type: 'Mainnet' | 'Listing' | 'Partnership' | 'Token Unlock' | 'Protocol Upgrade' | 'Airdrop' | 'Staking' | 'ETF';
  event_date: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  source: string;
  status: 'UPCOMING' | 'COMPLETED';
}

export interface OpportunityAlert {
  id: number;
  type: 'NEW_NARRATIVE' | 'COIN_OPPORTUNITY' | 'WHALE_ACCUMULATION' | 'UNLOCK_WARNING';
  title: string;
  symbol: string | null;
  narrative: string | null;
  score: number | null;
  content: string;
  sent_to_telegram: boolean;
  created_at: string;
}

/**
 * Initialize MySQL tables for Narrative & On-Chain Monitor
 */
export async function ensureNarrativeTables() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_narratives (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      category VARCHAR(50) DEFAULT 'Sector',
      score DECIMAL(5,2) DEFAULT 0.00,
      velocity VARCHAR(20) DEFAULT 'MODERATE',
      velocity_pct DECIMAL(6,2) DEFAULT 0.00,
      social_growth_24h DECIMAL(6,2) DEFAULT 0.00,
      volume_growth_24h DECIMAL(6,2) DEFAULT 0.00,
      onchain_growth_24h DECIMAL(6,2) DEFAULT 0.00,
      news_count_24h INT DEFAULT 0,
      top_coins_json TEXT,
      status VARCHAR(20) DEFAULT 'ACTIVE',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_narrative_coins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      narrative_slug VARCHAR(50) NOT NULL,
      narrative_name VARCHAR(100) NOT NULL,
      chain VARCHAR(50) DEFAULT 'Multi-Chain',
      price DECIMAL(18,6) DEFAULT 0.00,
      price_change_1h DECIMAL(8,2) DEFAULT 0.00,
      price_change_24h DECIMAL(8,2) DEFAULT 0.00,
      price_change_7d DECIMAL(8,2) DEFAULT 0.00,
      price_change_30d DECIMAL(8,2) DEFAULT 0.00,
      volume_24h DECIMAL(18,2) DEFAULT 0.00,
      market_cap DECIMAL(18,2) DEFAULT 0.00,
      fdv DECIMAL(18,2) DEFAULT 0.00,
      circulating_pct DECIMAL(5,2) DEFAULT 0.00,
      ath_distance_pct DECIMAL(6,2) DEFAULT 0.00,
      
      active_address_growth_7d DECIMAL(6,2) DEFAULT 0.00,
      active_address_growth_30d DECIMAL(6,2) DEFAULT 0.00,
      new_address_growth_30d DECIMAL(6,2) DEFAULT 0.00,
      whale_net_flow_usd DECIMAL(18,2) DEFAULT 0.00,
      whale_action VARCHAR(30) DEFAULT 'ACCUMULATION',
      exchange_netflow_usd DECIMAL(18,2) DEFAULT 0.00,
      exchange_flow_status VARCHAR(30) DEFAULT 'NET OUTFLOW',
      top10_concentration_pct DECIMAL(5,2) DEFAULT 0.00,
      holder_growth_30d DECIMAL(6,2) DEFAULT 0.00,
      tvl_usd DECIMAL(18,2) DEFAULT 0.00,
      tvl_growth_30d DECIMAL(6,2) DEFAULT 0.00,
      protocol_revenue_30d DECIMAL(18,2) DEFAULT 0.00,
      revenue_growth_30d DECIMAL(6,2) DEFAULT 0.00,
      
      open_interest_usd DECIMAL(18,2) DEFAULT 0.00,
      oi_change_24h DECIMAL(6,2) DEFAULT 0.00,
      funding_rate DECIMAL(8,6) DEFAULT 0.000100,
      funding_percentile DECIMAL(5,2) DEFAULT 50.00,
      funding_status VARCHAR(30) DEFAULT 'NORMAL',
      short_liquidation_24h DECIMAL(18,2) DEFAULT 0.00,
      long_liquidation_24h DECIMAL(18,2) DEFAULT 0.00,
      
      next_unlock_date VARCHAR(50) DEFAULT NULL,
      unlock_amount_pct DECIMAL(5,2) DEFAULT 0.00,
      unlock_usd_value DECIMAL(18,2) DEFAULT 0.00,
      unlock_risk VARCHAR(20) DEFAULT 'LOW',
      
      social_growth_24h DECIMAL(6,2) DEFAULT 0.00,
      narrative_velocity_pct DECIMAL(6,2) DEFAULT 0.00,
      news_mentions_24h INT DEFAULT 0,
      search_trend_score DECIMAL(5,2) DEFAULT 0.00,
      
      onchain_score DECIMAL(5,2) DEFAULT 0.00,
      narrative_score DECIMAL(5,2) DEFAULT 0.00,
      market_momentum_score DECIMAL(5,2) DEFAULT 0.00,
      liquidity_score DECIMAL(5,2) DEFAULT 0.00,
      derivatives_score DECIMAL(5,2) DEFAULT 0.00,
      tokenomics_score DECIMAL(5,2) DEFAULT 0.00,
      opportunity_score DECIMAL(5,2) DEFAULT 0.00,
      
      signal_classification VARCHAR(40) DEFAULT 'EARLY_ACCUMULATION',
      catalyst_summary TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_narrative_catalysts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      coin_symbol VARCHAR(20) NOT NULL,
      title VARCHAR(255) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      event_date VARCHAR(50) NOT NULL,
      importance VARCHAR(20) DEFAULT 'HIGH',
      source VARCHAR(255) DEFAULT 'Official / Protocol Roadmap',
      status VARCHAR(20) DEFAULT 'UPCOMING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_narrative_alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(30) NOT NULL,
      title VARCHAR(255) NOT NULL,
      symbol VARCHAR(20) DEFAULT NULL,
      narrative VARCHAR(100) DEFAULT NULL,
      score DECIMAL(5,2) DEFAULT NULL,
      content TEXT NOT NULL,
      sent_to_telegram BOOLEAN DEFAULT false,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default narratives and coins if table is empty
  const countRes: any = await executeQuery(`SELECT count(*) as count FROM crypto_narratives`);
  if (!countRes || countRes[0].count === 0) {
    await seedDefaultNarrativesAndCoins();
  }
}

/**
 * Seed Top 2026 Narratives, Benchmark Coins & Catalysts
 */
async function seedDefaultNarrativesAndCoins() {
  const defaultNarratives = [
    {
      slug: 'ai-agents',
      name: 'AI Agents & Autonomous Economy',
      description: 'Ekosistem AI otonom, inference terdesentralisasi, framework agen on-chain (Bittensor, Near, Virtuals).',
      category: 'Artificial Intelligence',
      score: 89.5,
      velocity: 'VERY HIGH',
      velocity_pct: 82.0,
      social_growth_24h: 72.5,
      volume_growth_24h: 48.2,
      onchain_growth_24h: 55.4,
      news_count_24h: 184,
      top_coins: JSON.stringify(['TAO', 'NEAR', 'RENDER', 'FET', 'VIRTUAL', 'GRASS'])
    },
    {
      slug: 'rwa',
      name: 'Real World Assets (RWA)',
      description: 'Tokenisasi aset dunia nyata, obligasi AS on-chain, kredit privat & yield institusional (Ondo, Mantle, Mantra, Pendle).',
      category: 'Institutional Finance',
      score: 84.2,
      velocity: 'HIGH',
      velocity_pct: 64.0,
      social_growth_24h: 41.0,
      volume_growth_24h: 35.5,
      onchain_growth_24h: 62.0,
      news_count_24h: 132,
      top_coins: JSON.stringify(['ONDO', 'MNT', 'OM', 'PENDLE', 'MKR', 'CFG'])
    },
    {
      slug: 'perp-dex',
      name: 'Perpetual DEX & High-Speed Derivatives',
      description: 'Platform derivatif on-chain ultra cepat, perp orderbook tanpa gas fee, migrasi likuiditas dari CEX ke DEX (Hyperliquid, dYdX, GMX, Drift).',
      category: 'Decentralized Finance',
      score: 79.8,
      velocity: 'HIGH',
      velocity_pct: 58.5,
      social_growth_24h: 49.0,
      volume_growth_24h: 68.0,
      onchain_growth_24h: 74.0,
      news_count_24h: 96,
      top_coins: JSON.stringify(['HYPE', 'DYDX', 'GMX', 'AERO', 'DRIFT', 'RAY'])
    },
    {
      slug: 'stablecoin-yield',
      name: 'Stablecoin Innovation & Real Yield',
      description: 'Stablecoin sintetis berbunga, delta-neutral yield, pasar pinjaman terdesentralisasi generasi baru (Ethena, Aave, Lido).',
      category: 'Yield & Liquidity',
      score: 77.2,
      velocity: 'HIGH',
      velocity_pct: 51.0,
      social_growth_24h: 34.0,
      volume_growth_24h: 42.0,
      onchain_growth_24h: 81.5,
      news_count_24h: 88,
      top_coins: JSON.stringify(['ENA', 'AAVE', 'CRV', 'LDO', 'USUAL'])
    },
    {
      slug: 'depin',
      name: 'DePIN (Physical Infrastructure Networks)',
      description: 'Jaringan komputasi GPU desentral, bandwidth nirkabel, sensor geolokasi dan penyimpanan terdistribusi (Helium, io.net, Filecoin, Render).',
      category: 'Infrastructure',
      score: 72.4,
      velocity: 'MODERATE',
      velocity_pct: 38.0,
      social_growth_24h: 28.0,
      volume_growth_24h: 31.0,
      onchain_growth_24h: 45.0,
      news_count_24h: 65,
      top_coins: JSON.stringify(['HNT', 'IO', 'FIL', 'AR', 'AKT'])
    },
    {
      slug: 'btcfi',
      name: 'BTCFi & Bitcoin Ecosystem L2',
      description: 'Pemberdayaan kapital Bitcoin untuk staking, restaking, peminjaman DeFi, dan skrip lapisan ke-2 (Stacks, Babylon, Ordinals, CKB).',
      category: 'Bitcoin Layer',
      score: 71.0,
      velocity: 'MODERATE',
      velocity_pct: 35.0,
      social_growth_24h: 32.5,
      volume_growth_24h: 29.0,
      onchain_growth_24h: 48.0,
      news_count_24h: 72,
      top_coins: JSON.stringify(['STX', 'ORDI', 'SATS', 'CKB'])
    },
    {
      slug: 'zk-privacy',
      name: 'ZK Tech & Modular Execution',
      description: 'Zero Knowledge proofs, modular data availability layer, dan arsitektur roll-up modular terisolasi (Celestia, LayerZero, Starknet).',
      category: 'Modular & Privacy',
      score: 64.5,
      velocity: 'MODERATE',
      velocity_pct: 22.0,
      social_growth_24h: 18.0,
      volume_growth_24h: 15.0,
      onchain_growth_24h: 31.0,
      news_count_24h: 44,
      top_coins: JSON.stringify(['TIA', 'ZRO', 'STRK', 'ROSE'])
    },
    {
      slug: 'meme-culture',
      name: 'Meme & Cultural Attention Economy',
      description: 'Likuiditas spekulatif berbasis atensi sosial viral, komunitas kultural, dan tokenisasi atensi internet murni.',
      category: 'Culture & Viral',
      score: 58.0,
      velocity: 'HIGH',
      velocity_pct: 44.0,
      social_growth_24h: 88.0,
      volume_growth_24h: 92.0,
      onchain_growth_24h: 42.0,
      news_count_24h: 210,
      top_coins: JSON.stringify(['PEPE', 'WIF', 'BONK', 'FLOKI', 'DOGE'])
    }
  ];

  for (const n of defaultNarratives) {
    await executeQuery(`
      INSERT INTO crypto_narratives 
        (slug, name, description, category, score, velocity, velocity_pct, social_growth_24h, volume_growth_24h, onchain_growth_24h, news_count_24h, top_coins_json, status)
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name), score = VALUES(score), velocity = VALUES(velocity), velocity_pct = VALUES(velocity_pct)
    `, [
      n.slug, n.name, n.description, n.category, n.score, n.velocity, n.velocity_pct,
      n.social_growth_24h, n.volume_growth_24h, n.onchain_growth_24h, n.news_count_24h, n.top_coins
    ]);
  }

  // Seed Initial Benchmark Coins
  const seedCoins = [
    // AI Agents
    {
      symbol: 'TAO',
      name: 'Bittensor',
      narrative_slug: 'ai-agents',
      narrative_name: 'AI Agents & Autonomous Economy',
      chain: 'Bittensor Subnets',
      price: 385.20,
      price_change_1h: 0.8,
      price_change_24h: 9.4,
      price_change_7d: 28.5,
      price_change_30d: 58.0,
      volume_24h: 185000000,
      market_cap: 2850000000,
      fdv: 8100000000,
      circulating_pct: 35.2,
      ath_distance_pct: -48.5,
      active_address_growth_7d: 54.2,
      active_address_growth_30d: 92.0,
      new_address_growth_30d: 78.5,
      whale_net_flow_usd: 18500000,
      whale_action: 'ACCUMULATION',
      exchange_netflow_usd: -24500000,
      exchange_flow_status: 'NET OUTFLOW',
      top10_concentration_pct: 38.5,
      holder_growth_30d: 44.0,
      tvl_usd: 0,
      tvl_growth_30d: 0,
      protocol_revenue_30d: 4200000,
      revenue_growth_30d: 65.0,
      open_interest_usd: 142000000,
      oi_change_24h: 24.5,
      funding_rate: 0.000100,
      funding_percentile: 45.0,
      funding_status: 'NORMAL',
      short_liquidation_24h: 3800000,
      long_liquidation_24h: 650000,
      next_unlock_date: '2026-11-15',
      unlock_amount_pct: 1.2,
      unlock_usd_value: 34000000,
      unlock_risk: 'LOW',
      social_growth_24h: 88.0,
      narrative_velocity_pct: 82.0,
      news_mentions_24h: 64,
      search_trend_score: 91.0,
      catalyst_summary: 'Peluncuran Subnet 45 & integrasi autonomous AI agent marketplace v2.'
    },
    {
      symbol: 'NEAR',
      name: 'NEAR Protocol',
      narrative_slug: 'ai-agents',
      narrative_name: 'AI Agents & Autonomous Economy',
      chain: 'NEAR L1',
      price: 4.82,
      price_change_1h: 0.4,
      price_change_24h: 7.2,
      price_change_7d: 22.4,
      price_change_30d: 44.0,
      volume_24h: 420000000,
      market_cap: 5800000000,
      fdv: 5950000000,
      circulating_pct: 97.5,
      ath_distance_pct: -76.0,
      active_address_growth_7d: 42.0,
      active_address_growth_30d: 87.0,
      new_address_growth_30d: 68.0,
      whale_net_flow_usd: 28400000,
      whale_action: 'ACCUMULATION',
      exchange_netflow_usd: -35000000,
      exchange_flow_status: 'NET OUTFLOW',
      top10_concentration_pct: 22.0,
      holder_growth_30d: 38.5,
      tvl_usd: 310000000,
      tvl_growth_30d: 52.0,
      protocol_revenue_30d: 2800000,
      revenue_growth_30d: 84.0,
      open_interest_usd: 215000000,
      oi_change_24h: 18.2,
      funding_rate: 0.000100,
      funding_percentile: 50.0,
      funding_status: 'NORMAL',
      short_liquidation_24h: 4200000,
      long_liquidation_24h: 900000,
      next_unlock_date: null,
      unlock_amount_pct: 0,
      unlock_usd_value: 0,
      unlock_risk: 'LOW',
      social_growth_24h: 76.0,
      narrative_velocity_pct: 78.0,
      news_mentions_24h: 88,
      search_trend_score: 84.0,
      catalyst_summary: 'User-Owned AI Hackathon & peluncuran 1.4B model on-chain assistant.'
    },
    // RWA
    {
      symbol: 'ONDO',
      name: 'Ondo Finance',
      narrative_slug: 'rwa',
      narrative_name: 'Real World Assets (RWA)',
      chain: 'Ethereum / Solana',
      price: 0.985,
      price_change_1h: 1.2,
      price_change_24h: 11.5,
      price_change_7d: 32.0,
      price_change_30d: 64.0,
      volume_24h: 290000000,
      market_cap: 1380000000,
      fdv: 9850000000,
      circulating_pct: 14.0,
      ath_distance_pct: -33.0,
      active_address_growth_7d: 48.0,
      active_address_growth_30d: 74.0,
      new_address_growth_30d: 82.0,
      whale_net_flow_usd: 19800000,
      whale_action: 'ACCUMULATION',
      exchange_netflow_usd: -18000000,
      exchange_flow_status: 'NET OUTFLOW',
      top10_concentration_pct: 64.0,
      holder_growth_30d: 55.0,
      tvl_usd: 640000000,
      tvl_growth_30d: 48.0,
      protocol_revenue_30d: 5100000,
      revenue_growth_30d: 72.0,
      open_interest_usd: 165000000,
      oi_change_24h: 31.0,
      funding_rate: 0.000140,
      funding_percentile: 65.0,
      funding_status: 'NORMAL',
      short_liquidation_24h: 5100000,
      long_liquidation_24h: 720000,
      next_unlock_date: '2026-10-18',
      unlock_amount_pct: 2.8,
      unlock_usd_value: 38000000,
      unlock_risk: 'MEDIUM',
      social_growth_24h: 62.0,
      narrative_velocity_pct: 64.0,
      news_mentions_24h: 52,
      search_trend_score: 79.0,
      catalyst_summary: 'Ekspansi USDY ke 3 rantai baru & kemitraan dana pasar uang institusi tier-1.'
    },
    // Perp DEX
    {
      symbol: 'HYPE',
      name: 'Hyperliquid',
      narrative_slug: 'perp-dex',
      narrative_name: 'Perpetual DEX & High-Speed Derivatives',
      chain: 'Hyperliquid L1',
      price: 24.50,
      price_change_1h: 0.9,
      price_change_24h: 14.2,
      price_change_7d: 48.0,
      price_change_30d: 110.0,
      volume_24h: 680000000,
      market_cap: 2450000000,
      fdv: 4900000000,
      circulating_pct: 50.0,
      ath_distance_pct: -12.0,
      active_address_growth_7d: 68.0,
      active_address_growth_30d: 142.0,
      new_address_growth_30d: 94.0,
      whale_net_flow_usd: 34000000,
      whale_action: 'ACCUMULATION',
      exchange_netflow_usd: -42000000,
      exchange_flow_status: 'NET OUTFLOW',
      top10_concentration_pct: 28.0,
      holder_growth_30d: 78.0,
      tvl_usd: 950000000,
      tvl_growth_30d: 88.0,
      protocol_revenue_30d: 18500000,
      revenue_growth_30d: 124.0,
      open_interest_usd: 340000000,
      oi_change_24h: 42.0,
      funding_rate: 0.000100,
      funding_percentile: 55.0,
      funding_status: 'NORMAL',
      short_liquidation_24h: 8500000,
      long_liquidation_24h: 1200000,
      next_unlock_date: null,
      unlock_amount_pct: 0,
      unlock_usd_value: 0,
      unlock_risk: 'LOW',
      social_growth_24h: 92.0,
      narrative_velocity_pct: 86.0,
      news_mentions_24h: 110,
      search_trend_score: 95.0,
      catalyst_summary: 'Peluncuran spot marketplace native EVM & distribusi fee trading 100% untuk staker.'
    },
    // Stablecoin
    {
      symbol: 'ENA',
      name: 'Ethena',
      narrative_slug: 'stablecoin-yield',
      narrative_name: 'Stablecoin Innovation & Real Yield',
      chain: 'Ethereum',
      price: 0.64,
      price_change_1h: -0.2,
      price_change_24h: 8.8,
      price_change_7d: 26.0,
      price_change_30d: 52.0,
      volume_24h: 310000000,
      market_cap: 1820000000,
      fdv: 9600000000,
      circulating_pct: 19.0,
      ath_distance_pct: -58.0,
      active_address_growth_7d: 38.0,
      active_address_growth_30d: 65.0,
      new_address_growth_30d: 52.0,
      whale_net_flow_usd: 16500000,
      whale_action: 'ACCUMULATION',
      exchange_netflow_usd: -22000000,
      exchange_flow_status: 'NET OUTFLOW',
      top10_concentration_pct: 42.0,
      holder_growth_30d: 46.0,
      tvl_usd: 3200000000,
      tvl_growth_30d: 38.0,
      protocol_revenue_30d: 14200000,
      revenue_growth_30d: 56.0,
      open_interest_usd: 280000000,
      oi_change_24h: 22.0,
      funding_rate: 0.000100,
      funding_percentile: 52.0,
      funding_status: 'NORMAL',
      short_liquidation_24h: 3400000,
      long_liquidation_24h: 800000,
      next_unlock_date: '2026-11-02',
      unlock_amount_pct: 3.5,
      unlock_usd_value: 63000000,
      unlock_risk: 'MEDIUM',
      social_growth_24h: 58.0,
      narrative_velocity_pct: 55.0,
      news_mentions_24h: 46,
      search_trend_score: 72.0,
      catalyst_summary: 'Integrasi USDe sebagai jaminan derivatif lintas platform terpusat dan terdesentralisasi.'
    },
    // DePIN
    {
      symbol: 'RENDER',
      name: 'Render Network',
      narrative_slug: 'depin',
      narrative_name: 'DePIN (Physical Infrastructure Networks)',
      chain: 'Solana',
      price: 5.92,
      price_change_1h: 0.3,
      price_change_24h: 6.5,
      price_change_7d: 18.0,
      price_change_30d: 34.0,
      volume_24h: 210000000,
      market_cap: 3100000000,
      fdv: 3180000000,
      circulating_pct: 97.5,
      ath_distance_pct: -56.0,
      active_address_growth_7d: 34.0,
      active_address_growth_30d: 52.0,
      new_address_growth_30d: 44.0,
      whale_net_flow_usd: 12400000,
      whale_action: 'ACCUMULATION',
      exchange_netflow_usd: -15000000,
      exchange_flow_status: 'NET OUTFLOW',
      top10_concentration_pct: 31.0,
      holder_growth_30d: 29.0,
      tvl_usd: 0,
      tvl_growth_30d: 0,
      protocol_revenue_30d: 3800000,
      revenue_growth_30d: 48.0,
      open_interest_usd: 128000000,
      oi_change_24h: 15.0,
      funding_rate: 0.000100,
      funding_percentile: 48.0,
      funding_status: 'NORMAL',
      short_liquidation_24h: 2200000,
      long_liquidation_24h: 450000,
      next_unlock_date: null,
      unlock_amount_pct: 0,
      unlock_usd_value: 0,
      unlock_risk: 'LOW',
      social_growth_24h: 46.0,
      narrative_velocity_pct: 48.0,
      news_mentions_24h: 58,
      search_trend_score: 75.0,
      catalyst_summary: 'Migrasi penuh komputasi AI video rendering 3D & kemitraan studio kreatif global.'
    },
    // BTCFi
    {
      symbol: 'STX',
      name: 'Stacks',
      narrative_slug: 'btcfi',
      narrative_name: 'BTCFi & Bitcoin Ecosystem L2',
      chain: 'Stacks Bitcoin L2',
      price: 1.84,
      price_change_1h: 0.5,
      price_change_24h: 5.8,
      price_change_7d: 16.4,
      price_change_30d: 32.0,
      volume_24h: 145000000,
      market_cap: 2750000000,
      fdv: 3350000000,
      circulating_pct: 82.0,
      ath_distance_pct: -52.0,
      active_address_growth_7d: 28.0,
      active_address_growth_30d: 48.0,
      new_address_growth_30d: 42.0,
      whale_net_flow_usd: 8500000,
      whale_action: 'ACCUMULATION',
      exchange_netflow_usd: -9500000,
      exchange_flow_status: 'NET OUTFLOW',
      top10_concentration_pct: 35.0,
      holder_growth_30d: 24.0,
      tvl_usd: 180000000,
      tvl_growth_30d: 36.0,
      protocol_revenue_30d: 1200000,
      revenue_growth_30d: 42.0,
      open_interest_usd: 88000000,
      oi_change_24h: 12.0,
      funding_rate: 0.000100,
      funding_percentile: 46.0,
      funding_status: 'NORMAL',
      short_liquidation_24h: 1500000,
      long_liquidation_24h: 300000,
      next_unlock_date: null,
      unlock_amount_pct: 0,
      unlock_usd_value: 0,
      unlock_risk: 'LOW',
      social_growth_24h: 38.0,
      narrative_velocity_pct: 42.0,
      news_mentions_24h: 41,
      search_trend_score: 68.0,
      catalyst_summary: 'Upgrade Nakamoto consensus selesai & integrasi sBTC peg terdesentralisasi.'
    },
    // ZK
    {
      symbol: 'TIA',
      name: 'Celestia',
      narrative_slug: 'zk-privacy',
      narrative_name: 'ZK Tech & Modular Execution',
      chain: 'Celestia Modular DA',
      price: 5.15,
      price_change_1h: -0.4,
      price_change_24h: 3.2,
      price_change_7d: 8.5,
      price_change_30d: -5.0,
      volume_24h: 165000000,
      market_cap: 1200000000,
      fdv: 5400000000,
      circulating_pct: 22.0,
      ath_distance_pct: -75.0,
      active_address_growth_7d: 14.0,
      active_address_growth_30d: 24.0,
      new_address_growth_30d: 21.0,
      whale_net_flow_usd: 3500000,
      whale_action: 'NEUTRAL',
      exchange_netflow_usd: 8500000,
      exchange_flow_status: 'NET INFLOW',
      top10_concentration_pct: 58.0,
      holder_growth_30d: 15.0,
      tvl_usd: 0,
      tvl_growth_30d: 0,
      protocol_revenue_30d: 450000,
      revenue_growth_30d: 18.0,
      open_interest_usd: 155000000,
      oi_change_24h: 8.0,
      funding_rate: 0.000120,
      funding_percentile: 60.0,
      funding_status: 'NORMAL',
      short_liquidation_24h: 1100000,
      long_liquidation_24h: 850000,
      next_unlock_date: '2026-10-31',
      unlock_amount_pct: 17.5,
      unlock_usd_value: 210000000,
      unlock_risk: 'HIGH',
      social_growth_24h: 22.0,
      narrative_velocity_pct: 25.0,
      news_mentions_24h: 38,
      search_trend_score: 59.0,
      catalyst_summary: 'Peringatan Unlock Token Investor (~17.5% sirkulasi) pada akhir Oktober 2026.'
    },
    // Meme
    {
      symbol: 'PEPE',
      name: 'Pepe',
      narrative_slug: 'meme-culture',
      narrative_name: 'Meme & Cultural Attention Economy',
      chain: 'Ethereum',
      price: 0.0000098,
      price_change_1h: 1.8,
      price_change_24h: 16.5,
      price_change_7d: 42.0,
      price_change_30d: 78.0,
      volume_24h: 920000000,
      market_cap: 4120000000,
      fdv: 4120000000,
      circulating_pct: 100.0,
      ath_distance_pct: -42.0,
      active_address_growth_7d: 44.0,
      active_address_growth_30d: 68.0,
      new_address_growth_30d: 85.0,
      whale_net_flow_usd: 22000000,
      whale_action: 'ACCUMULATION',
      exchange_netflow_usd: -31000000,
      exchange_flow_status: 'NET OUTFLOW',
      top10_concentration_pct: 44.0,
      holder_growth_30d: 48.0,
      tvl_usd: 0,
      tvl_growth_30d: 0,
      protocol_revenue_30d: 0,
      revenue_growth_30d: 0,
      open_interest_usd: 245000000,
      oi_change_24h: 52.0,
      funding_rate: 0.000320,
      funding_percentile: 94.0,
      funding_status: 'CROWDED LONG',
      short_liquidation_24h: 12500000,
      long_liquidation_24h: 1800000,
      next_unlock_date: null,
      unlock_amount_pct: 0,
      unlock_usd_value: 0,
      unlock_risk: 'LOW',
      social_growth_24h: 94.0,
      narrative_velocity_pct: 88.0,
      news_mentions_24h: 145,
      search_trend_score: 96.0,
      catalyst_summary: 'Volume sosial viral melompat 94% pasca breakout teknikal level resistensi mayor.'
    }
  ];

  for (const c of seedCoins) {
    const scores = calculateOpportunityScores(c);
    const classification = classifyOpportunitySignal(c, scores.total_score);

    await executeQuery(`
      INSERT INTO crypto_narrative_coins (
        symbol, name, narrative_slug, narrative_name, chain,
        price, price_change_1h, price_change_24h, price_change_7d, price_change_30d,
        volume_24h, market_cap, fdv, circulating_pct, ath_distance_pct,
        active_address_growth_7d, active_address_growth_30d, new_address_growth_30d,
        whale_net_flow_usd, whale_action, exchange_netflow_usd, exchange_flow_status,
        top10_concentration_pct, holder_growth_30d, tvl_usd, tvl_growth_30d,
        protocol_revenue_30d, revenue_growth_30d, open_interest_usd, oi_change_24h,
        funding_rate, funding_percentile, funding_status, short_liquidation_24h, long_liquidation_24h,
        next_unlock_date, unlock_amount_pct, unlock_usd_value, unlock_risk,
        social_growth_24h, narrative_velocity_pct, news_mentions_24h, search_trend_score,
        onchain_score, narrative_score, market_momentum_score, liquidity_score,
        derivatives_score, tokenomics_score, opportunity_score, signal_classification, catalyst_summary
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      ) ON DUPLICATE KEY UPDATE
        price = VALUES(price),
        opportunity_score = VALUES(opportunity_score),
        onchain_score = VALUES(onchain_score),
        signal_classification = VALUES(signal_classification)
    `, [
      c.symbol, c.name, c.narrative_slug, c.narrative_name, c.chain,
      c.price, c.price_change_1h, c.price_change_24h, c.price_change_7d, c.price_change_30d,
      c.volume_24h, c.market_cap, c.fdv, c.circulating_pct, c.ath_distance_pct,
      c.active_address_growth_7d, c.active_address_growth_30d, c.new_address_growth_30d,
      c.whale_net_flow_usd, c.whale_action, c.exchange_netflow_usd, c.exchange_flow_status,
      c.top10_concentration_pct, c.holder_growth_30d, c.tvl_usd, c.tvl_growth_30d,
      c.protocol_revenue_30d, c.revenue_growth_30d, c.open_interest_usd, c.oi_change_24h,
      c.funding_rate, c.funding_percentile, c.funding_status, c.short_liquidation_24h, c.long_liquidation_24h,
      c.next_unlock_date, c.unlock_amount_pct, c.unlock_usd_value, c.unlock_risk,
      c.social_growth_24h, c.narrative_velocity_pct, c.news_mentions_24h, c.search_trend_score,
      scores.onchain_score, scores.narrative_score, scores.market_score, scores.liquidity_score,
      scores.derivatives_score, scores.tokenomics_score, scores.total_score,
      classification, c.catalyst_summary
    ]);
  }

  // Seed Catalysts
  const catalysts = [
    { coin: 'TAO', title: 'Subnet 45 Deployment & Autonomous Agent Marketplace', type: 'Protocol Upgrade', date: '2026-10-05', importance: 'CRITICAL', source: 'Bittensor Foundation' },
    { coin: 'NEAR', title: 'User-Owned AI Hackathon & 1.4B Parameter Model Testnet', type: 'Mainnet', date: '2026-10-12', importance: 'HIGH', source: 'NEAR Core Devs' },
    { coin: 'ONDO', title: 'USDY Cross-Chain Expansion to Base & Arbitrum', type: 'Partnership', date: '2026-10-15', importance: 'HIGH', source: 'Ondo Finance PR' },
    { coin: 'HYPE', title: 'EVM Compatibility Layer Mainnet Launch', type: 'Mainnet', date: '2026-10-20', importance: 'CRITICAL', source: 'Hyperliquid L1' },
    { coin: 'TIA', title: 'Major Seed & Series A Token Unlock Event', type: 'Token Unlock', date: '2026-10-31', importance: 'CRITICAL', source: 'Tokenomist / CryptoRank' },
    { coin: 'ENA', title: 'CEX Margin Collateral Acceptance Decision', type: 'Listing', date: '2026-11-05', importance: 'HIGH', source: 'Ethena Labs' },
    { coin: 'STX', title: 'sBTC Production Bridging Mainnet Go-Live', type: 'Mainnet', date: '2026-11-10', importance: 'HIGH', source: 'Stacks Foundation' }
  ];

  for (const cat of catalysts) {
    await executeQuery(`
      INSERT INTO crypto_narrative_catalysts 
        (coin_symbol, title, event_type, event_date, importance, source, status)
      VALUES 
        (?, ?, ?, ?, ?, ?, 'UPCOMING')
    `, [cat.coin, cat.title, cat.type, cat.date, cat.importance, cat.source]);
  }
}

/**
 * 5-Layer Composite Opportunity Scoring Formula
 * Exact breakdown:
 * - 30% On-Chain Score
 * - 20% Narrative Score
 * - 15% Market Momentum
 * - 15% Liquidity Score
 * - 10% Derivatives Score
 * - 10% Tokenomics Score
 */
export function calculateOpportunityScores(coin: any) {
  // 1. On-Chain Score (30%)
  // Active Addr (20%), New Addr (15%), Whale Acc (15%), Exchange Outflow (15%), Holder Growth (10%), TVL (10%), Revenue (10%), Tx Growth (5%)
  const activeAddrScore = Math.min(100, Math.max(0, (coin.active_address_growth_7d || 0) * 1.5 + 20));
  const newAddrScore = Math.min(100, Math.max(0, (coin.new_address_growth_30d || 0) * 1.2));
  const whaleScore = coin.whale_action === 'ACCUMULATION' ? 90 : (coin.whale_action === 'NEUTRAL' ? 50 : 20);
  const exchangeScore = coin.exchange_flow_status === 'NET OUTFLOW' ? 90 : (coin.exchange_flow_status === 'BALANCED' ? 55 : 25);
  const holderScore = Math.min(100, Math.max(0, (coin.holder_growth_30d || 0) * 1.8 + 20));
  const tvlScore = coin.tvl_growth_30d > 0 ? Math.min(100, 50 + coin.tvl_growth_30d * 0.8) : 50;
  const revScore = coin.revenue_growth_30d > 0 ? Math.min(100, 50 + coin.revenue_growth_30d * 0.6) : 40;

  const onchain_score = Math.round(
    activeAddrScore * 0.20 +
    newAddrScore * 0.15 +
    whaleScore * 0.15 +
    exchangeScore * 0.15 +
    holderScore * 0.10 +
    tvlScore * 0.10 +
    revScore * 0.10 +
    70 * 0.05
  );

  // 2. Narrative Score (20%)
  // Social Growth (30%), Velocity (25%), News (15%), Search Trend (10%), Attention (10%), Breadth (10%)
  const socialScore = Math.min(100, Math.max(0, (coin.social_growth_24h || 0) * 1.2));
  const velocityScore = Math.min(100, Math.max(0, (coin.narrative_velocity_pct || 0) * 1.1));
  const newsScore = Math.min(100, Math.max(20, (coin.news_mentions_24h || 0) * 0.9));
  const searchScore = Math.min(100, Math.max(20, coin.search_trend_score || 50));

  const narrative_score = Math.round(
    socialScore * 0.30 +
    velocityScore * 0.25 +
    newsScore * 0.15 +
    searchScore * 0.10 +
    80 * 0.10 +
    75 * 0.10
  );

  // 3. Market Momentum (15%)
  const priceChangeScore = Math.min(100, Math.max(10, 50 + (coin.price_change_24h || 0) * 2.5));
  const market_score = Math.round(priceChangeScore * 0.60 + 80 * 0.40);

  // 4. Liquidity Score (15%)
  // Vol / MC ratio and raw volume
  const volMcRatio = coin.market_cap > 0 ? (coin.volume_24h / coin.market_cap) : 0.1;
  const liquidity_score = Math.min(100, Math.max(30, Math.round(volMcRatio * 150 + 50)));

  // 5. Derivatives Score (10%)
  // OI Growth positive, but penalize crowded funding rates!
  let derivBase = Math.min(100, Math.max(20, 50 + (coin.oi_change_24h || 0) * 1.2));
  if (coin.funding_rate > 0.00025) {
    derivBase -= 25; // Crowded long penalty!
  } else if (coin.funding_rate < -0.0001) {
    derivBase += 15; // Short squeeze bonus!
  }
  const derivatives_score = Math.min(100, Math.max(15, Math.round(derivBase)));

  // 6. Tokenomics Score (10%)
  // Circulating supply ratio & unlock risk penalty
  let tokenomicsBase = (coin.circulating_pct || 50);
  if (coin.unlock_risk === 'HIGH') {
    tokenomicsBase -= 30;
  } else if (coin.unlock_risk === 'MEDIUM') {
    tokenomicsBase -= 12;
  }
  const tokenomics_score = Math.min(100, Math.max(15, Math.round(tokenomicsBase)));

  // Total Composite Opportunity Score
  const total_score = Math.round(
    onchain_score * 0.30 +
    narrative_score * 0.20 +
    market_score * 0.15 +
    liquidity_score * 0.15 +
    derivatives_score * 0.10 +
    tokenomics_score * 0.10
  );

  return {
    onchain_score,
    narrative_score,
    market_score,
    liquidity_score,
    derivatives_score,
    tokenomics_score,
    total_score
  };
}

/**
 * Classify opportunity signal based on multi-metric alignment
 */
export function classifyOpportunitySignal(coin: any, totalScore: number): 'EARLY_ACCUMULATION' | 'NARRATIVE_BREAKOUT' | 'CROWDED_RISK' | 'DISTRIBUTION_WARNING' {
  // Crowded: Extreme funding rate or extreme price jump with high funding
  if (coin.funding_rate > 0.00025 || (coin.price_change_24h > 15 && coin.funding_percentile > 85)) {
    return 'CROWDED_RISK';
  }

  // Distribution: Net inflow to exchanges + whale selling
  if (coin.exchange_flow_status === 'NET INFLOW' && coin.whale_action === 'DISTRIBUTION') {
    return 'DISTRIBUTION_WARNING';
  }

  // Early Accumulation: On-chain strong, whale accumulating, but price still consolidated
  if (coin.whale_action === 'ACCUMULATION' && coin.active_address_growth_7d > 25 && coin.price_change_24h < 12) {
    return 'EARLY_ACCUMULATION';
  }

  // Narrative Breakout: High social, high volume growth, price breaking out
  if (coin.social_growth_24h > 50 && coin.price_change_24h >= 8) {
    return 'NARRATIVE_BREAKOUT';
  }

  return totalScore >= 75 ? 'EARLY_ACCUMULATION' : 'NARRATIVE_BREAKOUT';
}

/**
 * Fetch Full Dashboard Data
 */
export async function getOpportunityDashboardData() {
  await ensureNarrativeTables();

  // 1. Narratives
  const narrativesRows: any = await executeQuery(`
    SELECT * FROM crypto_narratives 
    ORDER BY score DESC
  `);

  const narratives: NarrativeItem[] = narrativesRows.map((r: any) => ({
    ...r,
    id: parseInt(r.id),
    score: parseFloat(r.score),
    velocity_pct: parseFloat(r.velocity_pct),
    social_growth_24h: parseFloat(r.social_growth_24h),
    volume_growth_24h: parseFloat(r.volume_growth_24h),
    onchain_growth_24h: parseFloat(r.onchain_growth_24h),
    news_count_24h: parseInt(r.news_count_24h),
    top_coins: r.top_coins_json ? JSON.parse(r.top_coins_json) : []
  }));

  // 2. Coins
  const coinsRows: any = await executeQuery(`
    SELECT * FROM crypto_narrative_coins 
    ORDER BY opportunity_score DESC
  `);

  const coins: CoinOpportunity[] = coinsRows.map((r: any) => ({
    ...r,
    id: parseInt(r.id),
    price: parseFloat(r.price),
    price_change_1h: parseFloat(r.price_change_1h),
    price_change_24h: parseFloat(r.price_change_24h),
    price_change_7d: parseFloat(r.price_change_7d),
    price_change_30d: parseFloat(r.price_change_30d),
    volume_24h: parseFloat(r.volume_24h),
    market_cap: parseFloat(r.market_cap),
    fdv: parseFloat(r.fdv),
    circulating_pct: parseFloat(r.circulating_pct),
    ath_distance_pct: parseFloat(r.ath_distance_pct),
    active_address_growth_7d: parseFloat(r.active_address_growth_7d),
    active_address_growth_30d: parseFloat(r.active_address_growth_30d),
    new_address_growth_30d: parseFloat(r.new_address_growth_30d),
    whale_net_flow_usd: parseFloat(r.whale_net_flow_usd),
    exchange_netflow_usd: parseFloat(r.exchange_netflow_usd),
    top10_concentration_pct: parseFloat(r.top10_concentration_pct),
    holder_growth_30d: parseFloat(r.holder_growth_30d),
    tvl_usd: parseFloat(r.tvl_usd),
    tvl_growth_30d: parseFloat(r.tvl_growth_30d),
    protocol_revenue_30d: parseFloat(r.protocol_revenue_30d),
    revenue_growth_30d: parseFloat(r.revenue_growth_30d),
    open_interest_usd: parseFloat(r.open_interest_usd),
    oi_change_24h: parseFloat(r.oi_change_24h),
    funding_rate: parseFloat(r.funding_rate),
    funding_percentile: parseFloat(r.funding_percentile),
    short_liquidation_24h: parseFloat(r.short_liquidation_24h),
    long_liquidation_24h: parseFloat(r.long_liquidation_24h),
    unlock_amount_pct: parseFloat(r.unlock_amount_pct),
    unlock_usd_value: parseFloat(r.unlock_usd_value),
    social_growth_24h: parseFloat(r.social_growth_24h),
    narrative_velocity_pct: parseFloat(r.narrative_velocity_pct),
    news_mentions_24h: parseInt(r.news_mentions_24h),
    search_trend_score: parseFloat(r.search_trend_score),
    onchain_score: parseFloat(r.onchain_score),
    narrative_score: parseFloat(r.narrative_score),
    market_momentum_score: parseFloat(r.market_momentum_score),
    liquidity_score: parseFloat(r.liquidity_score),
    derivatives_score: parseFloat(r.derivatives_score),
    tokenomics_score: parseFloat(r.tokenomics_score),
    opportunity_score: parseFloat(r.opportunity_score)
  }));

  // 3. Catalysts
  const catalystRows: any = await executeQuery(`
    SELECT * FROM crypto_narrative_catalysts 
    ORDER BY event_date ASC
  `);

  const catalysts: CatalystEvent[] = catalystRows.map((r: any) => ({
    ...r,
    id: parseInt(r.id)
  }));

  // 4. Alerts
  const alertRows: any = await executeQuery(`
    SELECT * FROM crypto_narrative_alerts 
    ORDER BY id DESC LIMIT 20
  `);

  const alerts: OpportunityAlert[] = alertRows.map((r: any) => ({
    ...r,
    id: parseInt(r.id),
    score: r.score ? parseFloat(r.score) : null,
    sent_to_telegram: Boolean(r.sent_to_telegram)
  }));

  // 5. Macro Regime Analysis
  const btcDominance = 57.8;
  const altcoinBreadth = 68;
  const marketRegime = btcDominance > 58 ? 'BTC LED MOMENTUM' : (altcoinBreadth > 60 ? 'SELECTIVE RISK-ON' : 'RANGE CONSOLIDATION');

  return {
    marketRegime,
    btcDominance,
    altcoinBreadth,
    narratives,
    coins,
    catalysts,
    alerts,
    stats: {
      totalNarratives: narratives.length,
      topNarrative: narratives[0]?.name || 'AI Agents',
      topCoin: coins[0]?.symbol || 'TAO',
      highConvictionCount: coins.filter(c => c.opportunity_score >= 80).length,
      earlyAccumulationCount: coins.filter(c => c.signal_classification === 'EARLY_ACCUMULATION').length
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Live Market & On-chain Refresh Scanner
 */
export async function refreshOpportunityData() {
  await ensureNarrativeTables();

  // 1. Fetch live market tickers from Binance
  try {
    const tickerRes = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', { cache: 'no-store' });
    const tickers = await tickerRes.json();
    
    if (Array.isArray(tickers)) {
      const tickerMap: Record<string, any> = {};
      for (const t of tickers) {
        tickerMap[t.symbol] = t;
      }

      // Update coins with real price data
      const existingCoins: any = await executeQuery(`SELECT symbol, price, market_cap, volume_24h FROM crypto_narrative_coins`);
      
      for (const coin of existingCoins) {
        const futuresSymbol = `${coin.symbol}USDT`;
        const tick = tickerMap[futuresSymbol];
        if (tick) {
          const livePrice = parseFloat(tick.lastPrice) || coin.price;
          const liveChange24h = parseFloat(tick.priceChangePercent) || 0;
          const liveVol24h = parseFloat(tick.quoteVolume) || coin.volume_24h;

          // Re-calculate scores
          await executeQuery(`
            UPDATE crypto_narrative_coins 
            SET price = ?,
                price_change_24h = ?,
                volume_24h = ?,
                updated_at = NOW()
            WHERE symbol = ?
          `, [livePrice, liveChange24h, liveVol24h, coin.symbol]);
        }
      }
    }
  } catch (err) {
    console.warn("Binance sync warning in opportunity scanner:", err);
  }

  return await getOpportunityDashboardData();
}

/**
 * Dispatch Telegram Alert for a specific Narrative or Coin
 */
export async function dispatchOpportunityTelegramAlert(params: {
  type: 'NARRATIVE' | 'COIN';
  slugOrSymbol: string;
}) {
  await ensureNarrativeTables();
  const { type, slugOrSymbol } = params;

  if (type === 'NARRATIVE') {
    const narRows: any = await executeQuery(`SELECT * FROM crypto_narratives WHERE slug = ?`, [slugOrSymbol]);
    if (!narRows || narRows.length === 0) throw new Error('Narasi tidak ditemukan');
    const n = narRows[0];
    const topCoins = n.top_coins_json ? JSON.parse(n.top_coins_json).join(', ') : '';

    const text = 
`🚨 *NEW NARRATIVE DETECTED* 🚨

🔥 *Narrative:* *${n.name.toUpperCase()}*
⚡ *Velocity:* +${n.velocity_pct}% (${n.velocity})
📈 *Social Growth 24h:* +${n.social_growth_24h}%
📊 *Trading Volume:* +${n.volume_growth_24h}%
⛓️ *On-Chain Activity:* +${n.onchain_growth_24h}%
📰 *News & Media Mentions:* ${n.news_count_24h} publikasi
🪙 *Leading Coins:* ${topCoins}

🎯 *Opportunity Score:* *${n.score}/100*
Status: *EARLY MOMENTUM MONITOR*`;

    await sendTelegramNotification(text);

    await executeQuery(`
      INSERT INTO crypto_narrative_alerts 
        (type, title, narrative, score, content, sent_to_telegram)
      VALUES 
        ('NEW_NARRATIVE', ?, ?, ?, ?, true)
    `, [`Narrative Alert: ${n.name}`, n.name, n.score, text]);

    return { success: true, message: `Alert narasi ${n.name} terkirim ke Telegram.` };
  } else {
    const coinRows: any = await executeQuery(`SELECT * FROM crypto_narrative_coins WHERE symbol = ?`, [slugOrSymbol.toUpperCase()]);
    if (!coinRows || coinRows.length === 0) throw new Error('Koin tidak ditemukan');
    const c = coinRows[0];

    const unlockStatus = c.unlock_risk === 'LOW' ? '🟢 Low Risk' : (c.unlock_risk === 'MEDIUM' ? '🟡 Medium Risk' : '🔴 High Risk');
    const whaleText = c.whale_action === 'ACCUMULATION' ? '🐋 Whale Accumulation' : 'Whale Neutral';
    const exchangeText = c.exchange_flow_status === 'NET OUTFLOW' ? '🟢 Net Outflow (Penyimpanan Dingin)' : '🔴 Net Inflow';

    const text =
`🔥 *COIN OPPORTUNITY ALERT* 🔥

💎 *Coin:* *$${c.symbol}* (${c.name})
🌐 *Narrative:* *${c.narrative_name}*
🏷️ *Price:* $${parseFloat(c.price).toLocaleString()} (${c.price_change_24h >= 0 ? '+' : ''}${c.price_change_24h}%)

📊 *5-Layer Opportunity Breakdown:*
• *Opportunity Score:* *${c.opportunity_score}/100*
• *Signal:* *${c.signal_classification.replace(/_/g, ' ')}*
• *On-Chain Score:* ${c.onchain_score}/100 (Active Addr: +${c.active_address_growth_7d}%)
• *Whale Flow:* ${whaleText} (Net: +$${(parseFloat(c.whale_net_flow_usd) / 1000000).toFixed(1)}M)
• *Exchange Netflow:* ${exchangeText}
• *Open Interest:* $${(parseFloat(c.open_interest_usd) / 1000000).toFixed(1)}M (+${c.oi_change_24h}%)
• *Funding Rate:* ${(parseFloat(c.funding_rate) * 100).toFixed(4)}% (${c.funding_status})
• *Token Unlock:* ${unlockStatus}

📌 *Katalis Mendatang:*
${c.catalyst_summary || 'Ekosistem adopsi aktif.'}`;

    await sendTelegramNotification(text);

    await executeQuery(`
      INSERT INTO crypto_narrative_alerts 
        (type, title, symbol, narrative, score, content, sent_to_telegram)
      VALUES 
        ('COIN_OPPORTUNITY', ?, ?, ?, ?, ?, true)
    `, [`Coin Alert: $${c.symbol}`, c.symbol, c.narrative_name, c.opportunity_score, text]);

    return { success: true, message: `Alert koin $${c.symbol} terkirim ke Telegram.` };
  }
}
