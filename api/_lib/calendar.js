// One-way sync: reservations -> a dedicated Google Calendar, so bookings show
// up on Google's own Android Calendar widget without us building a native one.
// Every function here catches its own errors and returns null on failure —
// callers in reservations.js must never let a Google API hiccup block a
// reservation save (see api/_lib/push.js for the same resilience pattern).

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_ID = () => encodeURIComponent(process.env.GOOGLE_CALENDAR_ID?.trim());
const EVENTS_URL = (eventId = '') =>
  `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID()}/events${eventId ? `/${eventId}` : ''}`;

async function getAccessToken() {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.GOOGLE_CLIENT_ID?.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN?.trim(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

function reservationToEvent(reservation) {
  const paymentStatus = reservation.fullPaymentPaid
    ? 'Fully paid'
    : reservation.depositPaid
      ? `Deposit paid ($${reservation.depositAmount})`
      : `Deposit pending ($${reservation.depositAmount})`;

  const description = [
    `${reservation.guests} guest${reservation.guests > 1 ? 's' : ''}`,
    reservation.guestPhone || null,
    `$${reservation.pricePerNight}/night x ${reservation.nights} night${reservation.nights > 1 ? 's' : ''} = $${reservation.totalPrice}`,
    paymentStatus,
  ].filter(Boolean).join('\n');

  return {
    summary: reservation.guestName,
    description,
    start: { dateTime: `${reservation.checkIn}T20:00:00`, timeZone: 'Asia/Beirut' },
    end: { dateTime: `${reservation.checkOut}T18:00:00`, timeZone: 'Asia/Beirut' },
  };
}

export async function createCalendarEvent(reservation) {
  try {
    const accessToken = await getAccessToken();
    const res = await fetch(EVENTS_URL(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reservationToEvent(reservation)),
    });
    if (!res.ok) {
      console.error('Google Calendar create failed:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.id;
  } catch (error) {
    console.error('Google Calendar create error:', error);
    return null;
  }
}

export async function updateCalendarEvent(eventId, reservation) {
  if (!eventId) return createCalendarEvent(reservation);
  try {
    const accessToken = await getAccessToken();
    const res = await fetch(EVENTS_URL(eventId), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reservationToEvent(reservation)),
    });
    if (res.status === 404 || res.status === 410) {
      // Event was deleted on the Google side independently — recreate it.
      return createCalendarEvent(reservation);
    }
    if (!res.ok) {
      console.error('Google Calendar update failed:', res.status, await res.text());
      return eventId;
    }
    return eventId;
  } catch (error) {
    console.error('Google Calendar update error:', error);
    return eventId;
  }
}

// Lists every event in the calendar so reservations.js can both pick up
// anything added directly in Google Calendar AND notice anything removed
// there. Unlike the other functions here, this one THROWS on failure rather
// than swallowing it — the caller uses "no events" to infer "these
// reservations were deleted," so a failed API call must never be mistaken
// for a genuinely empty calendar (that would wipe out every synced
// reservation). No timeMin: reservations can be edited/deleted from the
// calendar side regardless of how far in the past or future they are.
export async function listCalendarEvents() {
  const accessToken = await getAccessToken();
  const url = new URL(EVENTS_URL());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');
  url.searchParams.set('fields', 'items(id,summary,start,end,status)');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new Error(`Google Calendar list failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.items || [];
}

export async function deleteCalendarEvent(eventId) {
  if (!eventId) return;
  try {
    const accessToken = await getAccessToken();
    const res = await fetch(EVENTS_URL(eventId), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.error('Google Calendar delete failed:', res.status, await res.text());
    }
  } catch (error) {
    console.error('Google Calendar delete error:', error);
  }
}
