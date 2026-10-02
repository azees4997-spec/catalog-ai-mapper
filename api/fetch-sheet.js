const https = require('https');
const url = require('url');

function fetchUrlWithRedirects(targetUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects === 0) return reject(new Error('Too many HTTP redirects'));
    https.get(targetUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrlWithRedirects(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
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

  const parsedUrl = url.parse(req.url, true);
  const rawSheetUrl = parsedUrl.query.url || '';
  
  let sheetId = '1a3eRoJcizuyVdp24bIlHpB_dRApmyJzqgOc_twzXCP8';
  let gid = '1777883675';

  const matchId = rawSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matchId) sheetId = matchId[1];
  const matchGid = rawSheetUrl.match(/gid=([0-9]+)/);
  if (matchGid) gid = matchGid[1];

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  try {
    const csvData = await fetchUrlWithRedirects(exportUrl);
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csvData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
