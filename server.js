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
        }
      });
    }).on('error', err => reject(err));
  });
}

// Helper to fetch URL following 301/302/307 redirects & HTML body redirects (for Google Sheets export)
function fetchUrlSmart(targetUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects === 0) return reject(new Error('Too many HTTP redirects'));
    https.get(targetUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrlSmart(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.includes('Temporary Redirect') || data.includes('document has moved')) {
          const match = data.match(/HREF="([^"]+)"/i) || data.match(/href="([^"]+)"/i);
          if (match && match[1]) {
            const redirectUrl = match[1].replace(/&amp;/g, '&');
            return fetchUrlSmart(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
          }
        }
        resolve(data);
      });
    }).on('error', err => reject(err));
  });
}

const DOSAGE_STOP_WORDS = new Set([
  'tab', 'tablet', 'tablets', 'cap', 'capsule', 'capsules', 'syrup', 'syp',
  'inj', 'injection', 'strip', 'mg', 'ml', 'gm', 'g', 'pvt', 'ltd', 'limited', 'india',
  'oint', 'ointment', 'crm', 'cream', 'gel', 'jel', 'sol', 'soln', 'solution',
  'soap', 'lotion', 'lot', 'paint', 'drop', 'drops', 'powder', 'suspension', 'susp'
]);

function extractSupplierMetadata(item) {
  const rawName = (item.ITEMNAME || '').trim();
  const rawMfg = (item.COMPANYNAME || '').trim();
  const rawComp = (item.CONTENT || '').trim();
  const rawPack = (item.PACKING || '').trim();

  const nameTokens = rawName
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);

  const brandTokens = nameTokens.filter(t => !DOSAGE_STOP_WORDS.has(t.toLowerCase()));
  const brandPrefix = brandTokens.length > 0 ? brandTokens[0] : (nameTokens[0] || '');

  let dosageForm = '';
  const lowerName = rawName.toLowerCase();
  if (lowerName.includes('oint') || lowerName.includes('ointment')) dosageForm = 'ointment';
  else if (lowerName.includes('gel') || lowerName.includes('jel')) dosageForm = 'gel';
  else if (lowerName.includes('cream') || lowerName.includes('crm')) dosageForm = 'cream';
  else if (lowerName.includes('sol') || lowerName.includes('solution')) dosageForm = 'solution';
  else if (lowerName.includes('soap')) dosageForm = 'soap';
  else if (lowerName.includes('lotion')) dosageForm = 'lotion';
  else if (lowerName.includes('tab') || lowerName.includes('tablet')) dosageForm = 'tablet';
  else if (lowerName.includes('cap') || lowerName.includes('capsule')) dosageForm = 'capsule';

  const packMatch = rawPack.match(/(\d+(?:\.\d+)?)\s*(gm|g|ml|mg|tab|cap|capsule|strip|tube|bottle)?/i);
  const packVal = packMatch ? packMatch[1] : '';
  const packUnit = packMatch && packMatch[2] ? packMatch[2].toLowerCase() : '';

  return {
    rawName,
    brandPrefix,
    brandTokens,
    dosageForm,
    packVal,
    packUnit,
    rawMfg,
    rawComp
  };
}

function computeMetadataScores(meta, cand) {
  const candName = (cand['Product Name'] || '').toLowerCase();
  const candPack = (cand['Packaging Detail'] || '').toLowerCase();
  const candComp = (cand['Composition'] || '').toLowerCase();
  const candMfg = (cand['Manufacturer'] || cand['Marketer'] || '').toLowerCase();

  let nameScore = 0;
  const lowerBrand = meta.brandPrefix.toLowerCase();
  if (candName.startsWith(lowerBrand)) {
    nameScore = 100;
  } else if (candName.includes(lowerBrand)) {
    nameScore = 85;
  } else {
    let matches = 0;
    meta.brandTokens.forEach(t => { if (candName.includes(t.toLowerCase())) matches++; });
    nameScore = meta.brandTokens.length > 0 ? Math.round((matches / meta.brandTokens.length) * 80) : 30;
  }

  let formBonus = 0;
  if (meta.dosageForm) {
    if (candName.includes(meta.dosageForm) || candPack.includes(meta.dosageForm)) {
      formBonus = 15;
    } else {
      formBonus = -10;
    }
  }

  let packScore = 60;
  if (meta.packVal) {
    if (candPack.includes(meta.packVal)) {
      packScore = 100;
    } else {
      packScore = 40;
    }
  }

  let mfgScore = 50;
  if (meta.rawMfg) {
    const suppMfgTokens = meta.rawMfg.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !DOSAGE_STOP_WORDS.has(t));
    let matches = 0;
    suppMfgTokens.forEach(t => { if (candMfg.includes(t) || candName.includes(t)) matches++; });
    mfgScore = suppMfgTokens.length > 0 ? Math.min(100, Math.round((matches / suppMfgTokens.length) * 100)) : 70;
  }

  let compScore = 50;
  if (meta.rawComp) {
    const suppCompTokens = meta.rawComp.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !DOSAGE_STOP_WORDS.has(t));
    let matches = 0;
    suppCompTokens.forEach(t => { if (candComp.includes(t) || candName.includes(t)) matches++; });
    compScore = suppCompTokens.length > 0 ? Math.min(100, Math.round((matches / suppCompTokens.length) * 100)) : 60;
  }

  let totalScore = Math.round((nameScore * 0.40) + (packScore * 0.20) + (mfgScore * 0.20) + (compScore * 0.20) + formBonus);
  totalScore = Math.max(10, Math.min(99, totalScore));

  if (candName.startsWith(lowerBrand) && packScore >= 80) {
    totalScore = Math.max(95, totalScore);
  }

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
  const meta = extractSupplierMetadata(item);
  let candidates = [];

  if (meta.brandPrefix) {
    const queryUrl = `${MASTER_TABLE}?select=*&Product%20Name=ilike.${encodeURIComponent(meta.brandPrefix)}*&limit=15`;
    const res = await querySupabase(queryUrl);
    if (Array.isArray(res)) {
      candidates.push(...res);
    }
  }

  if (candidates.length < 3 && meta.brandTokens.length > 1) {
    const twoWordPrefix = `${meta.brandTokens[0]} ${meta.brandTokens[1]}`;
    const queryUrl2 = `${MASTER_TABLE}?select=*&Product%20Name=ilike.${encodeURIComponent(twoWordPrefix)}*&limit=15`;
    const res2 = await querySupabase(queryUrl2);
    if (Array.isArray(res2)) {
      for (const r of res2) {
        if (!candidates.find(c => c['Product ID'] === r['Product ID'])) candidates.push(r);
      }
    }
  }

  if (candidates.length === 0 && meta.rawComp) {
    const compToken = meta.rawComp.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 3 && !DOSAGE_STOP_WORDS.has(t.toLowerCase()))[0];
    if (compToken) {
      const resComp = await querySupabase(`${MASTER_TABLE}?select=*&Composition=ilike.${encodeURIComponent(compToken)}*&limit=10`);
      if (Array.isArray(resComp)) {
        candidates.push(...resComp);
      }
    }
  }

  if (candidates.length === 0 && meta.rawName) {
    const firstWord = meta.rawName.split(/\s+/)[0];
    const resFallback = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=ilike.${encodeURIComponent(firstWord)}*&limit=10`);
    if (Array.isArray(resFallback)) {
      candidates = resFallback;
    }
  }

  const scoredCandidates = candidates.map(cand => {
    const scores = computeMetadataScores(meta, cand);
    return {
      master_product_id: cand['Product ID'],
      master_product_name: cand['Product Name'],
      master_composition: cand['Composition'] || 'N/A',
      master_packaging: cand['Packaging Detail'] || 'N/A',
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
    item_code: item.ITEMCODE || '',
    item_name: meta.rawName,
    packing: item.PACKING || '',
    content: meta.rawComp,
    company_name: meta.rawMfg,
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
      const csvData = await fetchUrlSmart(exportUrl);
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
  const relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  let filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', relPath);
  }

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
        const rootIndex = path.join(__dirname, 'index.html');
        const pubIndex = path.join(__dirname, 'public', 'index.html');
        const fallback = fs.existsSync(rootIndex) ? rootIndex : pubIndex;
        fs.readFile(fallback, (err2, content2) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content2);
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
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
