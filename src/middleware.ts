import { defineMiddleware } from 'astro:middleware';
import { verifyJWT } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin/') && pathname !== '/api/admin/auth';

  if (isAdminPage || isAdminApi) {
    const token = context.cookies.get('admin_token')?.value;

    if (!token) {
      if (isAdminApi) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      return context.redirect('/admin/login');
    }

    const payload = await verifyJWT(token, import.meta.env.JWT_SECRET);
    if (!payload) {
      if (isAdminApi) return new Response(JSON.stringify({ error: 'Sesión expirada' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      return context.redirect('/admin/login');
    }
  }

  return next();
});
