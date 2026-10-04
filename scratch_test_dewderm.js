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

async function testDewderm() {
  console.log('Querying Dewderm:');
  const res1 = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=like.Dewderm%25&limit=10`);
  res1.forEach(r => console.log(' ->', r['Product ID'], '|', r['Product Name'], '|', r['Packaging Detail']));

  console.log('\nQuerying Dewd*:');
  const res2 = await querySupabase(`${MASTER_TABLE}?select=*&Product%20Name=like.Dewd%25&limit=10`);
  res2.forEach(r => console.log(' ->', r['Product ID'], '|', r['Product Name']));
}

testDewderm();
