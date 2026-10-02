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

// Multi-Factor AI Matching Algorithm evaluating ITEMNAME, COMPANYNAME, CONTENT vs Supabase June_Data
async function findCandidatesForSupplierItem(item, rules = customMappingRules) {
  const itemCode = item.ITEMCODE || item.item_code || item.code || '';
  const itemName = item.ITEMNAME || item.item_name || item.name || '';
  const content = item.CONTENT || item.composition || item.formula || '';
  const packing = item.PACKING || item.packaging || '';
  const companyName = item.COMPANYNAME || item.company_name || item.supplier_name || '';
  const saleRate = item.SALERATE || item.sale_rate || '';
  const mrp = item.MRP || item.mrp || '';

  // Combine ITEMNAME + COMPANYNAME + CONTENT for search tokens
  const fullTextQuery = `${itemName} ${companyName} ${content}`;
  
  // Extract keywords (words longer than 2 chars excluding generic pharma stop words)
  const cleanTokens = fullTextQuery
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !['tab', 'tablet', 'cap', 'capsule', 'syrup', 'inj', 'strip', 'mg', 'ml', 'pvt', 'ltd', 'limited', 'india'].includes(t.toLowerCase()));

  const searchKeywords = cleanTokens.slice(0, 4);
  let candidates = [];

  // 1. Search Supabase "Product Name" column
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

  // 2. Search Supabase "Composition" column if candidates < 5
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

  // 3. Fallback search
  if (candidates.length === 0 && cleanTokens.length > 0) {
    const fallbackRes = await querySupabase(`${MASTER_TABLE}?select=*&"Product Name"=ilike.*${encodeURIComponent(cleanTokens[0].substring(0, 4))}*&limit=8`);
    if (Array.isArray(fallbackRes)) {
      candidates = fallbackRes;
    }
  }

  // Calculate Match Scores
  const scoredCandidates = candidates.map(cand => {
    let score = 0;
    const candName = (cand['Product Name'] || '').toLowerCase();
    const candComp = (cand['Composition'] || '').toLowerCase();
    const suppName = itemName.toLowerCase();
    const suppComp = companyName.toLowerCase();
    const suppContent = content.toLowerCase();

    // Match ITEMNAME & COMPANYNAME against Product Name
    const nameTokens = (itemName + ' ' + companyName).toLowerCase().split(/\s+/);
    let nameMatches = 0;
    nameTokens.forEach(w => {
      if (w.length > 2 && (candName.includes(w) || candComp.includes(w))) nameMatches++;
    });
    const nameScore = Math.min(100, Math.round((nameMatches / Math.max(1, nameTokens.length)) * 100));

    // Match CONTENT against Composition
    let contentScore = 0;
    if (suppContent && candComp) {
      const compWords = suppContent.split(/[\+\/\,\s]+/);
      let compMatches = 0;
      compWords.forEach(w => {
        if (w.length > 2 && (candComp.includes(w) || candName.includes(w))) compMatches++;
      });
      contentScore = Math.min(100, Math.round((compMatches / Math.max(1, compWords.length)) * 100));
    }

    // Strength / Dosage match
    const suppStrengths = (itemName + ' ' + companyName + ' ' + content).match(/\d+(\.\d+)?\s*(mg|ml|gm|mcg|%)/gi) || [];
    let strengthScore = 100;
    if (suppStrengths.length > 0) {
      const matchedStrengths = suppStrengths.filter(s => candName.includes(s.toLowerCase().replace(/\s+/g, '')) || candComp.includes(s.toLowerCase().replace(/\s+/g, '')));
      strengthScore = (matchedStrengths.length / suppStrengths.length) * 100;
    }

    score = Math.round(
      (nameScore * (rules.weights.name || 0.45)) +
      (contentScore * (rules.weights.content || 0.40)) +
      (strengthScore * (rules.weights.strength || 0.15))
    );

    if (candName.includes(suppName) || candName.includes(suppComp)) score = Math.max(score, 90);

    return {
      master_product_id: cand['Product ID'],
      master_product_name: cand['Product Name'],
      master_composition: cand['Composition'],
      master_packaging: cand['Packaging Detail'],
      confidence_score: score,
      breakdown: {
        item_name_match: `${nameScore}%`,
        content_match: `${contentScore}%`,
        strength_match: `${Math.round(strengthScore)}%`
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
    sale_rate: saleRate,
    mrp: mrp,
    top_match: scoredCandidates[0] || null,
    candidates: scoredCandidates.slice(0, 5),
    status: scoredCandidates.length > 0 && scoredCandidates[0].confidence_score >= rules.minConfidenceThreshold ? 'AI_MATCHED' : 'PENDING_REVIEW'
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

    https.get(exportUrl, (sheetRes) => {
      let csvData = '';
      sheetRes.on('data', chunk => csvData += chunk);
      sheetRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'text/csv' });
        res.end(csvData);
      });
    }).on('error', err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
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
