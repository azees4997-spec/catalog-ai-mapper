const https = require('https');

function fetchUrlSmart(targetUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects === 0) return reject(new Error('Too many HTTP redirects'));
    https.get(targetUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrlSmart(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.includes('Temporary Redirect') || data.includes('document has moved')) {
          const match = data.match(/HREF="([^"]+)"/i) || data.match(/href="([^"]+)"/i);
          if (match && match[1]) {
            const redirectUrl = match[1].replace(/&amp;/g, '&');
            return fetchUrlSmart(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
          }
        }
        resolve(data);
      });
    }).on('error', err => reject(err));
  });
}

function extractSheetIdAndGid(rawUrl) {
  let sheetId = '1a3eRoJcizuyVdp24bIlHpB_dRApmyJzqgOc_twzXCP8';
  let gid = '691679338';

  if (rawUrl) {
    const idMatch = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) sheetId = idMatch[1];
    const gidMatch = rawUrl.match(/gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) gid = gidMatch[1];
  }
  return { sheetId, gid };
}

exports.handler = async function(event, context) {
  const rawSheetUrl = event.queryStringParameters.url || '';
  const { sheetId, gid } = extractSheetIdAndGid(rawSheetUrl);
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  try {
    const csvData = await fetchUrlSmart(exportUrl);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/csv'
      },
      body: csvData
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
