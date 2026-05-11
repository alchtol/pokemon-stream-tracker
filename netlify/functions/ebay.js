exports.handler = async function(event) {
  const query = event.queryStringParameters?.q || '';
  if (!query) return {
    statusCode: 400,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'Missing query' })
  };

  const APP_ID = process.env.EBAY_APP_ID;
  const CERT_ID = process.env.EBAY_CERT_ID;

  if (!APP_ID || !CERT_ID) return {
    statusCode: 500,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'Missing API credentials' })
  };

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

    if (!token) return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Token failed' })
    };

    const searchQuery = encodeURIComponent(query + ' pokemon card');
    const searchRes = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${searchQuery}&filter=buyingOptions:%7BFIXED_PRICE%7D&sort=endingSoonest&limit=10`,
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
    const recent = items.slice(0,5).map(i => ({
      title: i.title || '',
      price: parseFloat(i.price?.value || 0).toFixed(2),
      condition: i.condition || '',
      url: i.itemWebUrl || ''
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ avg, low, high, count: prices.length, recent })
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};

  try {
    // Get OAuth token
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

    if (!token) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Token failed', detail: tokenData })
      };
    }

    // Search eBay for sold Pokemon card listings
    const searchQuery = encodeURIComponent(query + ' pokemon card');
    const searchRes = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${searchQuery}&filter=buyingOptions:%7BFIXED_PRICE%7D,conditionIds:%7B3000%7D&sort=endingSoonest&limit=10`,
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

    const prices = items
      .map(i => parseFloat(i.price?.value || 0))
      .filter(p => p > 0)
      .sort((a, b) => a - b);

    const avg = prices.length ? (prices.reduce((a,b) => a+b,0) / prices.length).toFixed(2) : null;
    const low = prices.length ? prices[0].toFixed(2) : null;
    const high = prices.length ? prices[prices.length-1].toFixed(2) : null;

    const recent = items.slice(0, 5).map(i => ({
      title: i.title || '',
      price: parseFloat(i.price?.value || 0).toFixed(2),
      condition: i.condition || '',
      url: i.itemWebUrl || ''
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avg, low, high, count: prices.length, recent })
    };

  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
