const https = require('https');
const url = require('url');

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

  https.get(exportUrl, (sheetRes) => {
    let csvData = '';
    sheetRes.on('data', chunk => csvData += chunk);
    sheetRes.on('end', () => {
      res.status(200).send(csvData);
    });
  }).on('error', err => {
    res.status(500).json({ error: err.message });
  });
};
