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

async function test() {
  console.log('--- 1. Query: Product Name = ilike.CETRILAK%25 ---');
  const res1 = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=ilike.CETRILAK%25&limit=15`);
  console.log('Result 1 count:', Array.isArray(res1) ? res1.length : res1);
  if (Array.isArray(res1)) res1.forEach(r => console.log(' -', r['Product ID'], '|', r['Product Name']));

  console.log('\n--- 2. Query: Product Name = ilike.Cetrilak%25 ---');
  const res2 = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=ilike.Cetrilak%25&limit=15`);
  console.log('Result 2 count:', Array.isArray(res2) ? res2.length : res2);
  if (Array.isArray(res2)) res2.forEach(r => console.log(' -', r['Product ID'], '|', r['Product Name']));

  console.log('\n--- 3. Query: Product Name = ilike.%25CETRILAK%25 ---');
  const res3 = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=ilike.%25CETRILAK%25&limit=15`);
  console.log('Result 3 count:', Array.isArray(res3) ? res3.length : res3);
  if (Array.isArray(res3)) res3.forEach(r => console.log(' -', r['Product ID'], '|', r['Product Name']));
}

test();
