// api/8ballpool-lookup.js
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId } = req.body || {};
  const clean = (playerId || '').toString().trim();

  // Validate: 8Ball Pool IDs are numeric (typically 8-12 digits)
  if (!/^[0-9]{6,15}$/.test(clean)) {
    return res.status(400).json({ error: 'Invalid Player ID (6-15 digits)' });
  }

  try {
    // Codashop official validation endpoint (Miniclip's payment partner)
    const codashopUrl = `https://order-sg.codashop.com/validate-account.php?initiate=1&game=8ballpool&userId=${clean}`;

    const response = await fetch(codashopUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.codashop.com/',
      },
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Player ID not found' });
    }

    const rawText = await response.text();

    // Codashop may return JSON or a JSONP-like response
    let data = null;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      // Try to extract JSON from a JSONP wrapper
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
        } catch (e2) {
          data = null;
        }
      }
    }

    // Check if the response contains a username/nickname
    const nickname = (data && (data.username || data.nickname || data.name)) || null;

    if (!nickname) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Return ONLY the real data (ID + name)
    return res.status(200).json({
      playerId: clean,
      username: nickname,
    });

  } catch (error) {
    console.error('Codashop API error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch player data' });
  }
}
