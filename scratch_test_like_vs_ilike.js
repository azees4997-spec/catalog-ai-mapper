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

async function benchmarkLikeVsIlike() {
  const brands = ['Cetrilak', 'Salytar', 'Liceoff', 'Megascab'];

  for (const brand of brands) {
    console.log(`\n--- BENCHMARK FOR: ${brand} ---`);

    // Test A: Case-sensitive `like.Brand%`
    const resA = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=like.${brand}%25&limit=10`);
    console.log(`LIKE (case-sensitive)  [like.${brand}%]: Status ${resA.status} | ${resA.duration}ms | Items: ${Array.isArray(resA.data) ? resA.data.length : resA.data.message || resA.data}`);
    if (Array.isArray(resA.data) && resA.data.length > 0) {
      resA.data.slice(0, 2).forEach(r => console.log('   ->', r['Product ID'], '|', r['Product Name']));
    }

    // Test B: Case-insensitive `ilike.Brand%`
    const resB = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=ilike.${brand}%25&limit=10`);
    console.log(`ILIKE (case-insensitive) [ilike.${brand}%]: Status ${resB.status} | ${resB.duration}ms | Items: ${Array.isArray(resB.data) ? resB.data.length : resB.data.message || resB.data}`);
    if (Array.isArray(resB.data) && resB.data.length > 0) {
      resB.data.slice(0, 2).forEach(r => console.log('   ->', r['Product ID'], '|', r['Product Name']));
    }

    // Test C: Case-sensitive UPPER `like.BRAND%`
    const resC = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=like.${brand.toUpperCase()}%25&limit=10`);
    console.log(`LIKE UPPERCASE        [like.${brand.toUpperCase()}%]: Status ${resC.status} | ${resC.duration}ms | Items: ${Array.isArray(resC.data) ? resC.data.length : resC.data.message || resC.data}`);
  }
}

benchmarkLikeVsIlike();
