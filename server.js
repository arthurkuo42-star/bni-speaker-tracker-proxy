/**
 * BNI 主題演講進度追蹤 - Railway Proxy
 *
 * 負責：
 *   1. 接收前端（GitHub Pages）的讀寫請求
 *   2. 把 JSONBin X-Master-Key 藏在後端
 *   3. 寫入請求要帶「寫入 PIN」驗證
 *
 * 環境變數：
 *   - JSONBIN_MASTER_KEY : JSONBin 的 X-Master-Key
 *   - JSONBIN_BIN_ID     : JSONBin 的 Bin ID（建立一個空物件 {} 的 bin）
 *   - WRITE_PIN          : 分會共用寫入 PIN（例：BNI2026）
 *   - ALLOWED_ORIGINS    : (可選) 允許的前端 domain，以逗號分隔
 *                          未設定則允許全部，例 "https://xxx.github.io"
 *   - PORT               : (Railway 會自動提供)
 */

const express = require('express');
const cors = require('cors');

const app = express();

// ========== CORS ==========
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length === 0 ? true : (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin not allowed: ' + origin));
  },
  methods: ['GET', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Write-PIN'],
}));

app.use(express.json({ limit: '10mb' }));

// ========== 環境變數檢查 ==========
const JSONBIN_KEY = process.env.JSONBIN_MASTER_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const WRITE_PIN = process.env.WRITE_PIN;

if (!JSONBIN_KEY || !JSONBIN_BIN_ID || !WRITE_PIN) {
  console.error('❌ 缺少環境變數：JSONBIN_MASTER_KEY / JSONBIN_BIN_ID / WRITE_PIN');
  process.exit(1);
}

const JSONBIN_BASE = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

// ========== JSONBin 存取封裝 ==========
async function loadBin() {
  const res = await fetch(`${JSONBIN_BASE}/latest`, {
    headers: { 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Meta': 'false' }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`JSONBin GET ${res.status}: ${txt}`);
  }
  const json = await res.json();
  // 免 meta 時直接回傳 record 內容；若關閉 meta 失敗則退回 json.record
  return (json && json.record) ? json.record : (json || {});
}

async function saveBin(data) {
  const res = await fetch(JSONBIN_BASE, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_KEY,
      'X-Bin-Versioning': 'false',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`JSONBin PUT ${res.status}: ${txt}`);
  }
  return res.json();
}

// ========== Routes ==========

// 健康檢查
app.get('/', (req, res) => {
  res.send('BNI Speaker Tracker Proxy · OK');
});

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 讀取某個 key
app.get('/api/data', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: 'missing key param' });

    const bin = await loadBin();
    const value = bin[key];
    if (value === undefined) return res.status(404).json({ error: 'key not found' });

    res.json({ key, value });
  } catch (e) {
    console.error('[GET /api/data]', e);
    res.status(500).json({ error: e.message });
  }
});

// 寫入某個 key（需要 PIN）
app.put('/api/data', async (req, res) => {
  const pin = req.headers['x-write-pin'];
  if (pin !== WRITE_PIN) {
    return res.status(401).json({ error: 'Invalid write PIN' });
  }

  try {
    const { key, value } = req.body || {};
    if (!key) return res.status(400).json({ error: 'missing key' });
    if (value === undefined) return res.status(400).json({ error: 'missing value' });

    const bin = await loadBin();
    bin[key] = value;
    await saveBin(bin);

    res.json({ ok: true, key });
  } catch (e) {
    console.error('[PUT /api/data]', e);
    res.status(500).json({ error: e.message });
  }
});

// 取得整個 bin 內容（管理員用，for 備份）
app.get('/api/dump', async (req, res) => {
  const pin = req.headers['x-write-pin'];
  if (pin !== WRITE_PIN) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  try {
    const bin = await loadBin();
    res.json(bin);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== Start ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 BNI Speaker Tracker Proxy running on port ${PORT}`);
  console.log(`   Allowed origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : '(all)'}`);
});
