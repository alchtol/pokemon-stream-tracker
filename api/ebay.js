export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const query = req.query.q || '';
  const type = req.query.type || 'bin'; // 'bin' or 'sold'
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const APP_ID = process.env.EBAY_APP_ID;
  const CERT_ID = process.env.EBAY_CERT_ID;
  if (!APP_ID || !CERT_ID) return res.status(500).json({ error: 'Missing API credentials' });

  try {
    const creds = Buffer.from(`${APP_ID}:${CERT_ID}`).toString('base64');
    const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope'
    });

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) return res.status(500).json({ error: 'Token failed' });

    const searchQuery = encodeURIComponent(query + ' pokemon card');

    // BIN = active fixed price listings, sold = completed sold items
    const filter = type === 'sold'
      ? 'buyingOptions:%7BFIXED_PRICE%7D,deliveryCountry:US'
      : 'buyingOptions:%7BFIXED_PRICE%7D,deliveryCountry:US';

    const sort = type === 'sold' ? 'endingSoonest' : 'price';

    const searchRes = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${searchQuery}&filter=${filter}&sort=${sort}&limit=8`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Content-Type': 'application/json'
        }
      }
    );

    const searchData = await searchRes.json();
    const items = searchData.itemSummaries || [];
    const prices = items.map(i => parseFloat(i.price?.value || 0)).filter(p => p > 0).sort((a,b) => a-b);
    const avg = prices.length ? (prices.reduce((a,b) => a+b,0) / prices.length).toFixed(2) : null;
    const low = prices.length ? prices[0].toFixed(2) : null;
    const high = prices.length ? prices[prices.length-1].toFixed(2) : null;

    const recent = items.slice(0, 6).map(i => ({
      title: i.title || '',
      price: parseFloat(i.price?.value || 0).toFixed(2),
      condition: i.condition || '',
      url: i.itemWebUrl || ''
    }));

    return res.status(200).json({ avg, low, high, count: prices.length, recent });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
