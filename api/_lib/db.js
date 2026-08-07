import { createClient } from '@libsql/client';

export function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL?.trim(),
    authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
  });
}
