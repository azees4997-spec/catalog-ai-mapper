const https = require('https');

const SUPABASE_URL = 'https://rhxrtsjocqizhxqhbzgu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeHJ0c2pvY3Fpemh4cWhiemd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY1MzQsImV4cCI6MjA4NjkwMjUzNH0.fa6pG3IxS05ngcpbrWCWPA5NAYF1YQ2kRn9WO__81qM';
const MASTER_TABLE = 'June_Data';

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

    const start = Date.now();
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${Date.now() - start}ms] Status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', err => reject(err));
  });
}

function toTitleCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function testBrands() {
  const testItems = [
    { brand: 'CETRILAK', full: 'CETRILAK SOAP' },
    { brand: 'SALYTAR', full: 'SALYTAR OINT 15GM' },
    { brand: 'LICEOFF', full: 'LICEOFF SOAP' },
    { brand: 'MEGASCAB', full: 'MEGASCAB SOAP' }
  ];

  for (const item of testItems) {
    console.log(`\n========================================`);
    console.log(`Testing Brand: ${item.brand} (TitleCase: ${toTitleCase(item.brand)})`);
    console.log(`========================================`);

    const titleBrand = toTitleCase(item.brand);

    // Strategy A: TitleCase prefix
    const resA = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=ilike.${encodeURIComponent(titleBrand)}%25&limit=15`);
    console.log(`TitleCase Prefix [ilike.${titleBrand}%]:`, Array.isArray(resA) ? `${resA.length} items found` : resA.message || resA);
    if (Array.isArray(resA) && resA.length > 0) {
      resA.slice(0, 3).forEach(r => console.log('   ->', r['Product ID'], '|', r['Product Name']));
    }

    // Strategy B: %Word% fallback
    if (!Array.isArray(resA) || resA.length === 0) {
      const resB = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=ilike.%25${encodeURIComponent(item.brand)}%25&limit=15`);
      console.log(`Wildcard Contains [ilike.%${item.brand}%]:`, Array.isArray(resB) ? `${resB.length} items found` : resB.message || resB);
      if (Array.isArray(resB) && resB.length > 0) {
        resB.slice(0, 3).forEach(r => console.log('   ->', r['Product ID'], '|', r['Product Name']));
      }
    }
  }
}

testBrands();
