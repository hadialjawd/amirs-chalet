// This file talks only to our own authenticated API (/api/*) — it never touches
// the database directly. Database credentials live server-side only now; see
// api/_lib/db.js. (Previously this file used @libsql/client/web with credentials
// baked into the client bundle, which meant anyone could extract full DB access
// from the deployed JS. Don't reintroduce that.)

const TOKEN_KEY = 'amirs-chalet-token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function hasSession() {
  return !!getToken();
}

// For the few call sites (e.g. sendBeacon-style fire-and-forget calls) that need
// the Authorization header directly instead of going through apiFetch below.
export function getAuthHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function logout() {
  setToken(null);
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new CustomEvent('amirs-chalet:unauthorized'));
  }

  return res;
}

// ============ AUTH ============

export async function login(email, password) {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Login failed. Please try again.' };
    }
    setToken(data.token);
    return { success: true, email: data.email };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

export async function changePassword(newPassword) {
  const res = await apiFetch('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'change-password', newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update password.');
  }
  return true;
}

// ============ RESERVATIONS ============

export async function getReservations() {
  try {
    const res = await apiFetch('/api/reservations');
    if (!res.ok) return [];
    const data = await res.json();
    return data.reservations;
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }
}

export async function addReservation(reservation) {
  const res = await apiFetch('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(reservation),
  });
  if (!res.ok) throw new Error('Failed to add reservation.');
  const data = await res.json();
  return data.reservation;
}

export async function updateReservation(id, reservation) {
  const res = await apiFetch('/api/reservations', {
    method: 'PUT',
    body: JSON.stringify({ id, ...reservation }),
  });
  if (!res.ok) throw new Error('Failed to update reservation.');
  const data = await res.json();
  return data.reservation;
}

export async function deleteReservation(id) {
  const res = await apiFetch('/api/reservations', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Failed to delete reservation.');
  return true;
}

export async function toggleDepositStatus(id, depositPaid) {
  const res = await apiFetch('/api/reservations', {
    method: 'PATCH',
    body: JSON.stringify({ id, field: 'depositPaid', value: depositPaid }),
  });
  if (!res.ok) throw new Error('Failed to toggle deposit status.');
  return true;
}

export async function toggleFullPaymentStatus(id, fullPaymentPaid) {
  const res = await apiFetch('/api/reservations', {
    method: 'PATCH',
    body: JSON.stringify({ id, field: 'fullPaymentPaid', value: fullPaymentPaid }),
  });
  if (!res.ok) throw new Error('Failed to toggle full payment status.');
  return true;
}

// ============ EXPENSES ============

export async function getExpenses() {
  try {
    const res = await apiFetch('/api/expenses');
    if (!res.ok) return [];
    const data = await res.json();
    return data.expenses;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
}

export async function addExpense(expense) {
  const res = await apiFetch('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  });
  if (!res.ok) throw new Error('Failed to add expense.');
  const data = await res.json();
  return data.expense;
}

export async function updateExpense(id, expense) {
  const res = await apiFetch('/api/expenses', {
    method: 'PUT',
    body: JSON.stringify({ id, ...expense }),
  });
  if (!res.ok) throw new Error('Failed to update expense.');
  const data = await res.json();
  return data.expense;
}

export async function deleteExpense(id) {
  const res = await apiFetch('/api/expenses', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Failed to delete expense.');
  return true;
}

// ============ SETTINGS ============

export async function getSetting(key, defaultValue = null) {
  try {
    const res = await apiFetch('/api/settings');
    if (!res.ok) return defaultValue;
    const data = await res.json();
    return String(data.depositPercent);
  } catch (error) {
    console.error('Error fetching setting:', error);
    return defaultValue;
  }
}

export async function setSetting(key, value) {
  const res = await apiFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ depositPercent: Number(value) }),
  });
  if (!res.ok) throw new Error('Failed to save setting.');
  return true;
}

// ============ PUSH NOTIFICATIONS ============

export async function savePushSubscription(email, subscription) {
  const res = await apiFetch('/api/push-subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription }),
  });
  if (!res.ok) throw new Error('Failed to save push subscription.');
  return true;
}

export async function deletePushSubscription(endpoint) {
  const res = await apiFetch('/api/push-subscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
  return res.ok;
}
