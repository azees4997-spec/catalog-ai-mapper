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
        const duration = Date.now() - start;
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, duration, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, duration, data });
        }
      });
    }).on('error', err => resolve({ status: 500, duration: Date.now() - start, data: err.message }));
  });
}

function toTitleCase(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function runBenchmark() {
  const brand = 'CETRILAK';
  const title = toTitleCase(brand);

  console.log(`=== BENCHMARK FOR BRAND: "${brand}" / "${title}" ===`);

  const strategies = [
    { name: 'A. TitleCase Prefix (%25): Product Name=ilike.Cetrilak%', path: `${MASTER_TABLE}?select=*&Product%20Name=ilike.${title}%25&limit=15` },
    { name: 'B. TitleCase Wildcard (%25): Product Name=ilike.%Cetrilak%', path: `${MASTER_TABLE}?select=*&Product%20Name=ilike.%25${title}%25&limit=15` },
    { name: 'C. Uppercase Wildcard (%25): Product Name=ilike.%CETRILAK%', path: `${MASTER_TABLE}?select=*&Product%20Name=ilike.%25${brand}%25&limit=15` },
    { name: 'D. Multi-OR Prefix: or=(Product Name.ilike.Cetrilak%,Product Name.ilike.%CETRILAK%)', path: `${MASTER_TABLE}?select=*&or=(Product%20Name.ilike.${title}%25,Product%20Name.ilike.%25${brand}%25)&limit=15` },
  ];

  for (const s of strategies) {
    const res = await querySupabase(s.path);
    const count = Array.isArray(res.data) ? res.data.length : (res.data.message || 'error');
    console.log(`\nStrategy: ${s.name}`);
    console.log(`Status: ${res.status} | Duration: ${res.duration}ms | Count: ${count}`);
    if (Array.isArray(res.data) && res.data.length > 0) {
      res.data.forEach(r => console.log('   ->', r['Product ID'], '|', r['Product Name']));
    }
  }
}

runBenchmark();
