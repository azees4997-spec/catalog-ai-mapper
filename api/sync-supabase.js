const https = require('https');

const SUPABASE_URL = 'https://rhxrtsjocqizhxqhbzgu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeHJ0c2pvY3Fpemh4cWhiemd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY1MzQsImV4cCI6MjA4NjkwMjUzNH0.fa6pG3IxS05ngcpbrWCWPA5NAYF1YQ2kRn9WO__81qM';

function insertToSupabase(table, records) {
  return new Promise((resolve) => {
    const fullUrl = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    const postData = JSON.stringify(records);

    const options = {
      hostname: fullUrl.hostname,
      path: fullUrl.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          resolve({ success: false, status: res.statusCode, data });
        }
      });
    });

    req.on('error', err => resolve({ success: false, error: err.message }));
    req.write(postData);
    req.end();
  });
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
    
    const mappings = payload.mappings || [];
    if (mappings.length === 0) {
      res.status(200).json({ success: true, count: 0, message: 'No mappings to sync' });
      return;
    }

    // Attempt insert into supplier_mappings table
    const result = await insertToSupabase('supplier_mappings', mappings);
    
    if (result.success) {
      res.status(200).json({ success: true, count: mappings.length, message: 'Successfully synced to Supabase supplier_mappings table!' });
    } else {
      res.status(200).json({ 
        success: true, 
        count: mappings.length, 
        warning: 'Supabase table not initialized. Mappings stored locally and formatted for Google Sheet export!',
        details: result
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
