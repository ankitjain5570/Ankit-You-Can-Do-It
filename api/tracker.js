import { createSign, createHash, timingSafeEqual } from 'node:crypto';

const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' }
});
const digest = value => createHash('sha256').update(value).digest();
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
let token, expires, pending;

async function getToken() {
  if (Date.now() < expires) return token;
  if (!pending) pending = requestToken().finally(() => { pending = undefined; });
  return pending;
}

async function requestToken() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const endpoint = 'https://oauth2.googleapis.com/token';
  const claim = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({
    iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: endpoint, iat: now, exp: now + 3600
  });
  const signature = createSign('RSA-SHA256').update(claim).sign(credentials.private_key, 'base64url');
  const response = await fetch(endpoint, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: claim + '.' + signature })
  });
  if (!response.ok) throw new Error('Google authorization failed');
  const result = await response.json();
  token = result.access_token;
  expires = Date.now() + (result.expires_in - 60) * 1000;
  return token;
}

async function sheet(range, rows) {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets/' +
    encodeURIComponent(process.env.GOOGLE_SHEET_ID) + '/values/' + encodeURIComponent(range);
  const response = await fetch(url + (rows ? ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS' : ''), {
    method: rows ? 'POST' : 'GET', signal: AbortSignal.timeout(12000),
    headers: { Authorization: 'Bearer ' + await getToken(), 'Content-Type': 'application/json' },
    body: rows ? JSON.stringify({ values: rows }) : undefined
  });
  if (!response.ok) throw new Error('Sheets request failed');
  return (await response.json()).values ?? [];
}

export async function handle(request) {
  const secret = process.env.TRACKER_ACCESS_KEY;
  if (!secret || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.GOOGLE_SHEET_ID) {
    return json({ error: 'The private Google Sheet connection needs to be configured.' }, 503);
  }
  const supplied = request.headers.get('authorization') ?? '';
  if (!timingSafeEqual(digest(supplied), digest('Bearer ' + secret))) {
    return json({ error: 'Enter your dashboard access key.' }, 401);
  }

  try {
    if (request.method === 'GET') {
      const [meals, entries, foodLog, energy] = await Promise.all([sheet("'Daily Meals'!A2:H"), sheet("Progress!A2:E"), sheet("'Food Log'!A2:H"), sheet("Energy!A2:D")]);
      const byDate = new Map(entries.filter(([date]) => datePattern.test(date)).map(row => [row[0], row]));
      return json({ meals, foodLog, energy, progress: [...byDate.values()].sort((a,b) => a[0].localeCompare(b[0])) });
    }
    if (request.method !== 'POST') return json({ error: 'Method not supported.' }, 405);
    let entry;
    try { entry = await request.json(); } catch { return json({ error: 'Invalid check-in.' }, 400); }
    const { date, weight, activity, notes } = entry ?? {};
    const validDate = typeof date === 'string' && datePattern.test(date) &&
      !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
    if (!validDate || (weight !== null && !(typeof weight === 'number' && weight > 0 && weight <= 500)) ||
        (activity !== null && !(Number.isInteger(activity) && activity >= 0 && activity <= 1440)) ||
        typeof notes !== 'string' || notes.length > 400 ||
        (weight === null && activity === null && !notes.trim())) {
      return json({ error: 'Enter a valid weight, activity time or note.' }, 400);
    }
    await sheet('Progress!A:E', [[date, weight ?? '', activity ?? '', notes.trim(), new Date().toISOString()]]);
    return json({ saved: true });
  } catch {
    return json({ error: 'Google Sheets could not be reached. Check the connection or try again.' }, 502);
  }
}

export default { fetch: handle };
