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

async function testFastQueries() {
  const fields = 'Product%20ID,Product%20Name,Packaging%20Detail,Composition,Manufacturer';

  console.log('--- Test 1: select=specific_fields & Product Name=ilike.Cetrilak% ---');
  const r1 = await querySupabase(`${MASTER_TABLE}?select=${fields}&Product%20Name=ilike.Cetrilak%25&limit=10`);
  console.log('R1:', Array.isArray(r1) ? r1.length : r1.message || r1);
  if (Array.isArray(r1)) r1.forEach(x => console.log(' ->', x['Product ID'], '|', x['Product Name']));

  console.log('\n--- Test 2: select=specific_fields & Product Name=ilike.Cetrilak Soap% ---');
  const r2 = await querySupabase(`${MASTER_TABLE}?select=${fields}&Product%20Name=ilike.Cetrilak%20Soap%25&limit=10`);
  console.log('R2:', Array.isArray(r2) ? r2.length : r2.message || r2);
  if (Array.isArray(r2)) r2.forEach(x => console.log(' ->', x['Product ID'], '|', x['Product Name']));

  console.log('\n--- Test 3: Full phrase search "Cetrilak Soap" ---');
  const r3 = await querySupabase(`${MASTER_TABLE}?select=${fields}&Product%20Name=ilike.Cetrilak%25Soap%25&limit=10`);
  console.log('R3:', Array.isArray(r3) ? r3.length : r3.message || r3);
  if (Array.isArray(r3)) r3.forEach(x => console.log(' ->', x['Product ID'], '|', x['Product Name']));

  console.log('\n--- Test 4: OR search: Product Name ilike Cetrilak% OR Product Name ilike CETRILAK% ---');
  const r4 = await querySupabase(`${MASTER_TABLE}?select=${fields}&or=(Product%20Name.ilike.Cetrilak%25,Product%20Name.ilike.CETRILAK%25)&limit=10`);
  console.log('R4:', Array.isArray(r4) ? r4.length : r4.message || r4);
  if (Array.isArray(r4)) r4.forEach(x => console.log(' ->', x['Product ID'], '|', x['Product Name']));
}

testFastQueries();
