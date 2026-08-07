// One-off setup script: runs the Google OAuth "installed app" loopback flow
// to get a refresh token for amir.chalet@gmail.com, then creates a dedicated
// "Amir's Chalet Bookings" calendar and prints the values to add to .env /
// Vercel env vars (GOOGLE_REFRESH_TOKEN, GOOGLE_CALENDAR_ID) — also writes
// them into the local .env directly so you don't have to copy-paste.
//
// Usage: node scripts/authorize-google-calendar.mjs
// Reads GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET from .env in the project root.

import http from 'http';
import fs from 'fs';

const envPath = new URL('../.env', import.meta.url);
const envText = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envText.split('\n').filter(Boolean)
    .map(l => l.split('=')).map(([k, ...v]) => [k, v.join('=')])
);

if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  console.error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env — add those first.');
  process.exit(1);
}

const server = http.createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const redirectUri = `http://127.0.0.1:${port}`;

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');
authUrl.searchParams.set('login_hint', 'amir.chalet@gmail.com');

console.log('\nOpen this URL in a browser signed into amir.chalet@gmail.com:\n');
console.log(authUrl.toString());
console.log('\nWaiting for you to approve access...\n');

const code = await new Promise((resolve, reject) => {
  server.on('request', (req, res) => {
    const url = new URL(req.url, redirectUri);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    res.setHeader('Content-Type', 'text/html');
    if (error) {
      res.end(`<h2>Authorization failed: ${error}</h2>You can close this tab.`);
      reject(new Error(`Google returned error: ${error}`));
      return;
    }
    res.end('<h2>Authorized. You can close this tab.</h2>');
    resolve(code);
  });
});
server.close();

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
  }),
});
const tokenData = await tokenRes.json();
if (!tokenRes.ok) {
  console.error('Token exchange failed:', tokenData);
  process.exit(1);
}
if (!tokenData.refresh_token) {
  console.error('Google did not return a refresh token. If you have authorized this app before, revoke access at https://myaccount.google.com/permissions and try again.');
  process.exit(1);
}

console.log('Got refresh token. Creating dedicated calendar...');

const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${tokenData.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ summary: "Amir's Chalet Bookings", timeZone: 'Asia/Beirut' }),
});
const calData = await calRes.json();
if (!calRes.ok) {
  console.error('Calendar creation failed:', calData);
  process.exit(1);
}

console.log(`\nCreated calendar "${calData.summary}" (${calData.id})\n`);

const updatedEnv = envText
  .replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${tokenData.refresh_token}`)
  .replace(/^GOOGLE_CALENDAR_ID=.*$/m, `GOOGLE_CALENDAR_ID=${calData.id}`);
fs.writeFileSync(envPath, updatedEnv);

console.log('.env updated with GOOGLE_REFRESH_TOKEN and GOOGLE_CALENDAR_ID.');
console.log('Also add these two to your Vercel project env vars:\n');
console.log(`GOOGLE_REFRESH_TOKEN=${tokenData.refresh_token}`);
console.log(`GOOGLE_CALENDAR_ID=${calData.id}`);
