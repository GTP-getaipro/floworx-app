const databaseOperations = require('../database/database-operations');
const fetch = require('node-fetch');
const { decrypt } = require('../utils/crypto');

const COLOR_MAP = {
  red: { backgroundColor: "#d93025", textColor: "#ffffff" },
  green: { backgroundColor: "#188038", textColor: "#ffffff" },
  blue: { backgroundColor: "#1967d2", textColor: "#ffffff" },
  orange: { backgroundColor: "#e37400", textColor: "#ffffff" },
  yellow: { backgroundColor: "#f9ab00", textColor: "#000000" },
  pink: { backgroundColor: "#c93cb3", textColor: "#ffffff" }
};

function pickColor(labelKey) {
  if (/bank/i.test(labelKey)) return COLOR_MAP.green;
  if (/manager/i.test(labelKey)) return COLOR_MAP.orange;
  if (/support|form|phone/i.test(labelKey)) return COLOR_MAP.blue;
  if (/urgent|error|review/i.test(labelKey)) return COLOR_MAP.red;
  if (/social/i.test(labelKey)) return COLOR_MAP.yellow;
  if (/recruit/i.test(labelKey)) return COLOR_MAP.pink;
  return COLOR_MAP.blue;
}

async function getConfig(clientId) {
  const result = await databaseOperations.getClientConfigRow(clientId);
  if (result.error || !result.data) {
    throw new Error('client not found');
  }
  return result.data.config_json;
}

async function getGoogleTokens(clientId) {
  const result = await databaseOperations.getUserConnectionByProvider(clientId, 'google');
  if (result.error || !result.data) {
    return null;
  }
  return result.data;
}

async function provisionEmail(clientId) {
  const cfg = await getConfig(clientId);
  if (!cfg.channels?.email?.provider) {
    throw new Error('missing provider');
  }
  
  const provider = cfg.channels.email.provider;

  if (provider === 'gmail') {
    const conn = await getGoogleTokens(clientId);
    if (!conn) {
      throw new Error('no google connection');
    }

    const accessToken = decrypt(conn.access_token_encrypted);

    // List existing labels
    const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!listRes.ok) {
      throw new Error('failed to list labels');
    }
    
    const existing = (await listRes.json()).labels || [];
    const existingNames = new Set(existing.map(l => l.name));

    // Ensure labels exist
    for (const key of Object.keys(cfg.channels.email.label_map || {})) {
      if (existingNames.has(key)) continue;
      
      const color = pickColor(key);
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: key,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
          color
        })
      });
    }
  }

  if (provider === 'o365') {
    // Stub seam — implement in later ticket
    return;
  }
}

module.exports = { provisionEmail };
