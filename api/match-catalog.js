const https = require('https');

const SUPABASE_URL = 'https://rhxrtsjocqizhxqhbzgu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeHJ0c2pvY3Fpemh4cWhiemd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY1MzQsImV4cCI6MjA4NjkwMjUzNH0.fa6pG3IxS05ngcpbrWCWPA5NAYF1YQ2kRn9WO__81qM';
const MASTER_TABLE = 'June_Data';

const defaultRules = {
  weights: { name: 0.45, content: 0.40, strength: 0.15 },
  minConfidenceThreshold: 75
};

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

async function findCandidatesForSupplierItem(item, rules = defaultRules) {
  const itemCode = item.ITEMCODE || item.item_code || item.code || '';
  const itemName = item.ITEMNAME || item.item_name || item.name || '';
  const content = item.CONTENT || item.composition || item.formula || '';
  const packing = item.PACKING || item.packaging || '';
  const companyName = item.COMPANYNAME || item.company_name || item.supplier_name || '';
  const saleRate = item.SALERATE || item.sale_rate || '';
  const mrp = item.MRP || item.mrp || '';

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
    let score = 0;
    const candName = (cand['Product Name'] || '').toLowerCase();
    const candComp = (cand['Composition'] || '').toLowerCase();
    const suppName = itemName.toLowerCase();
    const suppComp = companyName.toLowerCase();
    const suppContent = content.toLowerCase();

    const nameTokens = (itemName + ' ' + companyName).toLowerCase().split(/\s+/);
    let nameMatches = 0;
    nameTokens.forEach(w => {
      if (w.length > 2 && (candName.includes(w) || candComp.includes(w))) nameMatches++;
    });
    const nameScore = Math.min(100, Math.round((nameMatches / Math.max(1, nameTokens.length)) * 100));

    let contentScore = 0;
    if (suppContent && candComp) {
      const compWords = suppContent.split(/[\+\/\,\s]+/);
      let compMatches = 0;
      compWords.forEach(w => {
        if (w.length > 2 && (candComp.includes(w) || candName.includes(w))) compMatches++;
      });
      contentScore = Math.min(100, Math.round((compMatches / Math.max(1, compWords.length)) * 100));
    }

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(455).json({ error: 'Method not allowed' });
    return;
  }

  try {
    let payload = req.body;
    if (typeof payload === 'string') payload = JSON.parse(payload);
    
    const items = payload.items || [];
    const rules = payload.rules || defaultRules;

    const results = await Promise.all(items.map(item => findCandidatesForSupplierItem(item, rules)));
    res.status(200).json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
