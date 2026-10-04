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

function toTitleCase(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

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

  const packMatch = rawPack.match(/(\d+(?:\.\d+)?)\s*(gm|g|ml|mg|tab|cap|capsule|strip|tube|bottle)?/i);
  const packVal = packMatch ? packMatch[1] : '';

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
    nameScore = 30;
  }

  // Check exact token match between rawName and candName
  const rawTokens = meta.rawName.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  const candTokens = candName.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  
  // Extra modifier penalty if candidate contains extra descriptor words (e.g. "baby", "veterinary") not in rawName
  let extraTokenPenalty = 0;
  candTokens.forEach(t => {
    if (!rawTokens.includes(t) && !DOSAGE_STOP_WORDS.has(t)) {
      extraTokenPenalty += 5;
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
  if (meta.packVal && candPack.includes(meta.packVal)) {
    packScore = 100;
  }

  let compScore = 50;
  if (meta.rawComp) {
    const suppCompTokens = meta.rawComp.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !DOSAGE_STOP_WORDS.has(t));
    let matches = 0;
    suppCompTokens.forEach(t => { if (candComp.includes(t) || lowerCandName.includes(t)) matches++; });
    compScore = suppCompTokens.length > 0 ? Math.min(100, Math.round((matches / suppCompTokens.length) * 100)) : 60;
  }

  let totalScore = Math.round((nameScore * 0.50) + (packScore * 0.25) + (compScore * 0.25) + formBonus - extraTokenPenalty);
  
  // Exact name equality boost
  if (lowerCandName === lowerRawName) {
    totalScore = 99;
  } else if (lowerCandName.startsWith(lowerBrand) && packScore >= 80) {
    totalScore = Math.max(90, totalScore);
  }

  totalScore = Math.max(10, Math.min(99, totalScore));

  return { totalScore, nameScore, packScore, compScore };
}

async function findCandidates(item) {
  const meta = extractSupplierMetadata(item);
  let candidates = [];

  if (meta.brandPrefix) {
    const titleBrand = toTitleCase(meta.brandPrefix);
    const queryUrl1 = `${MASTER_TABLE}?select=*&Product%20Name=ilike.${encodeURIComponent(titleBrand)}*&limit=15`;
    const res1 = await querySupabase(queryUrl1);
    if (Array.isArray(res1) && res1.length > 0) {
      candidates.push(...res1);
    }
    
    // Fallback: Wildcard containing *CETRILAK*
    if (candidates.length === 0) {
      const queryUrlWild = `${MASTER_TABLE}?select=*&Product%20Name=ilike.*${encodeURIComponent(meta.brandPrefix)}*&limit=15`;
      const resWild = await querySupabase(queryUrlWild);
      if (Array.isArray(resWild)) candidates.push(...resWild);
    }
  }

  const scoredCandidates = candidates.map(cand => {
    const scores = computeMetadataScores(meta, cand);
    return {
      master_product_id: cand['Product ID'],
      master_product_name: cand['Product Name'],
      confidence_score: scores.totalScore,
      scores
    };
  });

  scoredCandidates.sort((a, b) => b.confidence_score - a.confidence_score);
  return scoredCandidates;
}

async function runTest() {
  const item = {
    ITEMCODE: '000856',
    ITEMNAME: 'CETRILAK SOAP',
    PACKING: '75GM',
    COMPANYNAME: 'INVIDA INDIA PVT LIMITED',
    CONTENT: 'CETRIMIDE'
  };

  console.log('Testing item:', item.ITEMNAME);
  const candidates = await findCandidates(item);
  console.log(`Found ${candidates.length} candidates:`);
  candidates.forEach(c => {
    console.log(` - [${c.confidence_score}% Match] ${c.master_product_id} | ${c.master_product_name}`);
  });
}

runTest();
