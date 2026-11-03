// Includes the SDK default X-Client-Info header. Omitting it causes browsers
// to block functions.invoke at preflight before the authenticated handler runs.
export const publicationCors = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
