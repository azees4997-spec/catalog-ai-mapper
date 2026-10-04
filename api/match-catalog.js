const https = require('https');

const SUPABASE_URL = 'https://rhxrtsjocqizhxqhbzgu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeHJ0c2pvY3Fpemh4cWhiemd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY1MzQsImV4cCI6MjA4NjkwMjUzNH0.fa6pG3IxS05ngcpbrWCWPA5NAYF1YQ2kRn9WO__81qM';
const MASTER_TABLE = 'June_Data';

const DOSAGE_STOP_WORDS = new Set([
  'tab', 'tablet', 'tablets', 'cap', 'capsule', 'capsules', 'syrup', 'syp',
  'inj', 'injection', 'strip', 'mg', 'ml', 'gm', 'g', 'pvt', 'ltd', 'limited', 'india',
  'oint', 'ointment', 'crm', 'cream', 'gel', 'jel', 'sol', 'soln', 'solution',
  'soap', 'lotion', 'lot', 'paint', 'drop', 'drops', 'powder', 'suspension', 'susp'
]);

const defaultRules = {
  weights: { name: 0.40, pack: 0.20, mfg: 0.20, content: 0.20 },
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
          const parsed = JSON.parse(data);
          resolve(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', err => resolve([]));
  });
}

function toTitleCase(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function extractSupplierMetadata(item) {
  const rawName = (item.ITEMNAME || '').trim();
  const rawMfg = (item.COMPANYNAME || '').trim().replace(/\[\d+\]/g, '').trim();
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
  const packVal = packMatch ? (packMatch[1] + (packMatch[2] ? ' ' + packMatch[2].toLowerCase() : '')).trim() : '';

  return {
    rawName,
    brandPrefix,
    brandTokens,
    dosageForm,
    packVal,
    rawMfg,
    rawComp
  };
}

function computeMetadataScores(meta, cand) {
  const candName = (cand['Product Name'] || '').trim();
  const lowerCandName = candName.toLowerCase();
  const lowerRawName = meta.rawName.toLowerCase();
  const candPack = (cand['Packaging Detail'] || '').toLowerCase();
  const candComp = (cand['Composition'] || '').toLowerCase();

  let nameScore = 0;
  const lowerBrand = meta.brandPrefix.toLowerCase();
  if (lowerCandName === lowerRawName) {
    nameScore = 100;
  } else if (lowerCandName.startsWith(lowerBrand)) {
    nameScore = 95;
  } else if (lowerCandName.includes(lowerBrand)) {
    nameScore = 85;
  } else {
    const brandStem = lowerBrand.length >= 4 ? lowerBrand.substring(0, 4) : lowerBrand;
    if (lowerCandName.includes(brandStem)) {
      nameScore = 75;
    } else {
      let matches = 0;
      meta.brandTokens.forEach(t => { if (lowerCandName.includes(t.toLowerCase())) matches++; });
      nameScore = meta.brandTokens.length > 0 ? Math.round((matches / meta.brandTokens.length) * 80) : 30;
    }
  }

  const rawTokens = lowerRawName.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  const candTokens = lowerCandName.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  let extraTokenPenalty = 0;
  candTokens.forEach(t => {
    if (!rawTokens.includes(t) && !DOSAGE_STOP_WORDS.has(t)) {
      extraTokenPenalty += 8;
    }
  });

  let formBonus = 0;
  if (meta.dosageForm) {
    if (lowerCandName.includes(meta.dosageForm) || candPack.includes(meta.dosageForm)) {
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

  let compScore = 50;
  if (meta.rawComp) {
    const suppCompTokens = meta.rawComp.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !DOSAGE_STOP_WORDS.has(t));
    let matches = 0;
    suppCompTokens.forEach(t => { if (candComp.includes(t) || lowerCandName.includes(t)) matches++; });
    compScore = suppCompTokens.length > 0 ? Math.min(100, Math.round((matches / suppCompTokens.length) * 100)) : 60;
  }

  let totalScore = Math.round((nameScore * 0.45) + (packScore * 0.30) + (compScore * 0.25) + formBonus - extraTokenPenalty);

  if (lowerCandName === lowerRawName) {
    totalScore = 99;
  } else if (lowerCandName.startsWith(lowerBrand) && packScore >= 80) {
    totalScore = Math.max(90, totalScore);
  }

  totalScore = Math.max(10, Math.min(99, totalScore));

  return {
    totalScore,
    nameScore,
    packScore,
    compScore
  };
}

async function findCandidatesForSupplierItem(item, rules = defaultRules) {
  const meta = extractSupplierMetadata(item);
  let candidates = [];

  if (meta.brandPrefix) {
    const titleBrand = toTitleCase(meta.brandPrefix);
    const queryUrl1 = `${MASTER_TABLE}?select=*&Product%20Name=like.${encodeURIComponent(titleBrand)}%25&limit=30`;
    const res1 = await querySupabase(queryUrl1);
    if (Array.isArray(res1)) candidates.push(...res1);

    if (meta.brandTokens.length > 1) {
      const twoWord = `${toTitleCase(meta.brandTokens[0])} ${toTitleCase(meta.brandTokens[1])}`;
      const queryUrl2 = `${MASTER_TABLE}?select=*&Product%20Name=like.${encodeURIComponent(twoWord)}%25&limit=15`;
      const res2 = await querySupabase(queryUrl2);
      if (Array.isArray(res2)) candidates.push(...res2);

      const combinedWord = toTitleCase(meta.brandTokens[0].toLowerCase() + meta.brandTokens[1].toLowerCase());
      const queryUrl3 = `${MASTER_TABLE}?select=*&Product%20Name=like.${encodeURIComponent(combinedWord)}%25&limit=15`;
      const res3 = await querySupabase(queryUrl3);
      if (Array.isArray(res3)) candidates.push(...res3);
    }

    if (candidates.length === 0 && meta.brandPrefix.length >= 4) {
      const stemBrand = toTitleCase(meta.brandPrefix.substring(0, 4));
      const resStem = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=like.${encodeURIComponent(stemBrand)}%25&limit=15`);
      if (Array.isArray(resStem)) candidates.push(...resStem);
    }
  }

  if (candidates.length === 0 && meta.rawComp) {
    const compTokens = meta.rawComp.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 3 && !DOSAGE_STOP_WORDS.has(t.toLowerCase()));
    if (compTokens.length > 0) {
      const compToken = toTitleCase(compTokens[0]);
      const resComp = await querySupabase(`${MASTER_TABLE}?select=*&Composition=like.${encodeURIComponent(compToken)}%25&limit=15`);
      if (Array.isArray(resComp)) candidates.push(...resComp);
    }
  }

  if (candidates.length === 0 && meta.rawName) {
    const firstWord = toTitleCase(meta.rawName.split(/\s+/)[0]);
    const resFallback = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=like.${encodeURIComponent(firstWord)}%25&limit=10`);
    if (Array.isArray(resFallback)) candidates = resFallback;
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
        manufacturer: 70,
        composition: scores.compScore
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
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
