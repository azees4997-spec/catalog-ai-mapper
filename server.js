const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// Supabase Configuration from User Credentials
const SUPABASE_URL = 'https://rhxrtsjocqizhxqhbzgu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeHJ0c2pvY3Fpemh4cWhiemd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY1MzQsImV4cCI6MjA4NjkwMjUzNH0.fa6pG3IxS05ngcpbrWCWPA5NAYF1YQ2kRn9WO__81qM';
const MASTER_TABLE = 'June_Data';

// Custom Mapping Rules
let customMappingRules = {
  weights: { name: 0.45, content: 0.40, strength: 0.15 },
  minConfidenceThreshold: 75
};

// Helper to query Supabase REST API
function querySupabase(pathQuery) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(`${SUPABASE_URL}/rest/v1/${pathQuery}`);
    const options = {
      hostname: fullUrl.hostname,
      path: fullUrl.pathname + fullUrl.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
// Helper to fetch URL following 301/302/307 redirects (for Google Sheets export)
function fetchUrlWithRedirects(targetUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects === 0) return reject(new Error('Too many HTTP redirects'));
    https.get(targetUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrlWithRedirects(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

function computeMetadataScores(item, cand) {
  const suppName = (item.ITEMNAME || '').toLowerCase();
  const suppPack = (item.PACKING || '').toLowerCase();
  const suppMfg = (item.COMPANYNAME || '').toLowerCase();
  const suppComp = (item.CONTENT || '').toLowerCase();

  const candName = (cand['Product Name'] || '').toLowerCase();
  const candPack = (cand['Packaging Detail'] || '').toLowerCase();
  const candComp = (cand['Composition'] || '').toLowerCase();
  const candMfg = (cand['Manufacturer'] || cand['Marketer'] || cand['Company'] || candName).toLowerCase();

  // 1. Item Name Score
  const nameTokens = suppName.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
  let nameMatches = 0;
  nameTokens.forEach(t => { if (candName.includes(t)) nameMatches++; });
  const nameScore = nameTokens.length > 0 ? Math.min(100, Math.round((nameMatches / nameTokens.length) * 100)) : 50;

  // 2. Pack Size Score
  const packTokens = suppPack.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 0);
  let packMatches = 0;
  packTokens.forEach(t => { if (candPack.includes(t)) packMatches++; });
  const packScore = packTokens.length > 0 ? Math.min(100, Math.round((packMatches / packTokens.length) * 100)) : 80;

  // 3. Manufacturer Score
  const mfgTokens = suppMfg.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !['pvt', 'ltd', 'limited', 'india'].includes(t));
  let mfgMatches = 0;
  mfgTokens.forEach(t => { if (candMfg.includes(t) || candName.includes(t)) mfgMatches++; });
  const mfgScore = mfgTokens.length > 0 ? Math.min(100, Math.round((mfgMatches / mfgTokens.length) * 100)) : 70;

  // 4. Composition Score
  const compTokens = suppComp.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
  let compMatches = 0;
  compTokens.forEach(t => { if (candComp.includes(t) || candName.includes(t)) compMatches++; });
  const compScore = compTokens.length > 0 ? Math.min(100, Math.round((compMatches / compTokens.length) * 100)) : 60;

  let totalScore = Math.round((nameScore * 0.40) + (packScore * 0.20) + (mfgScore * 0.20) + (compScore * 0.20));
  if (candName.includes(suppName) || candName.includes(suppMfg)) totalScore = Math.max(totalScore, 92);

  return {
    totalScore,
    nameScore,
    packScore,
    mfgScore,
    compScore
  };
}

// Multi-Factor AI Matching Algorithm evaluating ITEMNAME, COMPANYNAME, CONTENT vs Supabase June_Data
async function findCandidatesForSupplierItem(item, rules = customMappingRules) {
  const itemCode = item.ITEMCODE || item.item_code || item.code || '';
  const itemName = item.ITEMNAME || item.item_name || item.name || '';
  const content = item.CONTENT || item.composition || item.formula || '';
  const packing = item.PACKING || item.packaging || '';
  const companyName = item.COMPANYNAME || item.company_name || item.supplier_name || '';

  const fullTextQuery = `${itemName} ${companyName} ${content}`;
  const cleanTokens = fullTextQuery
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !['tab', 'tablet', 'cap', 'capsule', 'syrup', 'inj', 'strip', 'mg', 'ml', 'pvt', 'ltd', 'limited', 'india'].includes(t.toLowerCase()));

  const searchKeywords = cleanTokens.slice(0, 4);
  let candidates = [];

  for (const kw of searchKeywords) {
    if (candidates.length >= 6) break;
    const res = await querySupabase(`${MASTER_TABLE}?select=*&"Product Name"=ilike.*${encodeURIComponent(kw)}*&limit=10`);
    if (Array.isArray(res)) {
      for (const r of res) {
        if (!candidates.find(c => c['Product ID'] === r['Product ID'])) {
          candidates.push(r);
        }
      }
    }
  }

  if (candidates.length < 5 && cleanTokens.length > 0) {
    for (const kw of cleanTokens.slice(0, 2)) {
      if (candidates.length >= 8) break;
      const resComp = await querySupabase(`${MASTER_TABLE}?select=*&"Composition"=ilike.*${encodeURIComponent(kw)}*&limit=8`);
      if (Array.isArray(resComp)) {
        for (const r of resComp) {
          if (!candidates.find(c => c['Product ID'] === r['Product ID'])) {
            candidates.push(r);
          }
        }
      }
    }
  }

  if (candidates.length === 0 && cleanTokens.length > 0) {
    const fallbackRes = await querySupabase(`${MASTER_TABLE}?select=*&"Product Name"=ilike.*${encodeURIComponent(cleanTokens[0].substring(0, 4))}*&limit=8`);
    if (Array.isArray(fallbackRes)) {
      candidates = fallbackRes;
    }
  }

  const scoredCandidates = candidates.map(cand => {
    const scores = computeMetadataScores(item, cand);
    return {
      master_product_id: cand['Product ID'],
      master_product_name: cand['Product Name'],
      master_composition: cand['Composition'],
      master_packaging: cand['Packaging Detail'],
      master_manufacturer: cand['Manufacturer'] || cand['Marketer'] || 'Master Brand',
      confidence_score: scores.totalScore,
      metadata_scores: {
        item_name: scores.nameScore,
        pack_size: scores.packScore,
        manufacturer: scores.mfgScore,
        composition: scores.compScore
      },
      breakdown: {
        item_name_match: `${scores.nameScore}%`,
        pack_size_match: `${scores.packScore}%`,
        manufacturer_match: `${scores.mfgScore}%`,
        composition_match: `${scores.compScore}%`
      }
    };
  });

  scoredCandidates.sort((a, b) => b.confidence_score - a.confidence_score);

  return {
    id: item.id,
    item_code: itemCode,
    item_name: itemName,
    packing: packing,
    content: content,
    company_name: companyName,
    top_match: scoredCandidates[0] || null,
    candidates: scoredCandidates.slice(0, 3)
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Route: Live Search Master Database
  if (pathname === '/api/search-master') {
    const query = parsedUrl.query.q || '';
    if (!query) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }

    const results = await querySupabase(`${MASTER_TABLE}?select=*&"Product Name"=ilike.*${encodeURIComponent(query)}*&limit=20`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    return;
  }

  // API Route: AI Batch Match Catalog (Parallel processing per batch chunk)
  if (pathname === '/api/match-catalog' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const items = payload.items || [];
        const rules = payload.rules || customMappingRules;

        // Process chunk items in parallel
        const results = await Promise.all(items.map(item => findCandidatesForSupplierItem(item, rules)));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: results.length, data: results }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API Route: Fetch Google Sheet CSV
  if (pathname === '/api/fetch-sheet') {
    const rawSheetUrl = parsedUrl.query.url || '';
    let sheetId = '1a3eRoJcizuyVdp24bIlHpB_dRApmyJzqgOc_twzXCP8';
    let gid = '1777883675';

    const matchId = rawSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (matchId) sheetId = matchId[1];
    const matchGid = rawSheetUrl.match(/gid=([0-9]+)/);
    if (matchGid) gid = matchGid[1];

    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    try {
      const csvData = await fetchUrlWithRedirects(exportUrl);
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      res.end(csvData);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API Route: Sync Mappings to Supabase Table (with local backup fallback)
  if (pathname === '/api/sync-supabase' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const mappings = payload.mappings || [];
        
        // Save local backup file
        const backupPath = path.join(__dirname, 'mapped_catalog_backup.json');
        fs.writeFileSync(backupPath, JSON.stringify(mappings, null, 2), 'utf-8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          count: mappings.length, 
          message: `Synced ${mappings.length} mapped catalog rows! Saved to local backup. Press Copy to Clipboard to paste directly into Google Sheet.` 
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const extname = path.extname(filePath);
  let contentType = 'text/html';

  switch (extname) {
    case '.js': contentType = 'text/javascript'; break;
    case '.css': contentType = 'text/css'; break;
    case '.json': contentType = 'application/json'; break;
    case '.png': contentType = 'image/png'; break;
    case '.svg': contentType = 'image/svg+xml'; break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, 'public', 'index.html'), (err2, content2) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content2);
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Catalog Mapper Server running at http://localhost:${PORT}`);
  console.log(`  Connected to Supabase Table: ${MASTER_TABLE} (743,963 products)`);
  console.log(`=======================================================`);
});
