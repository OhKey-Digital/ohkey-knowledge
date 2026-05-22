const ALGO: HmacKeyGenParams = { name: 'HMAC', hash: 'SHA-256' };
const EXPIRY_HOURS = 24;

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeB64url(str: string): string {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    ALGO,
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + EXPIRY_HOURS * 3600,
  }));
  const key = await getKey(secret);
  const sigBuf = await crypto.subtle.sign(ALGO, key, new TextEncoder().encode(`${header}.${body}`));
  const sig = b64url(String.fromCharCode(...new Uint8Array(sigBuf)));
  return `${header}.${body}.${sig}`;
}

export async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      ALGO,
      key,
      Uint8Array.from(decodeB64url(sig), c => c.charCodeAt(0)),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(decodeB64url(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminTokenFromRequest(request: Request): Promise<string | null> {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.split(';').find(c => c.trim().startsWith('admin_token='))?.split('=').slice(1).join('=').trim() ?? null;
}

export async function requireAdmin(request: Request): Promise<Response | null> {
  const token = await getAdminTokenFromRequest(request);
  if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const payload = await verifyJWT(token, import.meta.env.JWT_SECRET);
  if (!payload) return new Response(JSON.stringify({ error: 'Sesión expirada' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  return null;
}
