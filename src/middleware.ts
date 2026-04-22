import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // TEMPORARILY DISABLED FOR TESTING - Re-enable after configuring auth!
  // The Supabase client needs authenticated sessions for RLS to work properly

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // TODO: Re-enable this once SMTP is configured and you can log in
  // For now, allowing unauthenticated access for testing the migration

  /* AUTH DISABLED - UNCOMMENT TO RE-ENABLE:

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // No session - redirect to main site login
  if (!session) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000'));
  }

  // Check user role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  // Roles that can access backoffice
  const backofficeRoles = ['accountant', 'editor', 'admin', 'riemer'];

  // No profile or insufficient role - access denied, redirect to main site
  if (!profile || !backofficeRoles.includes(profile.role)) {
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000'));
  }

  // Attach role to response headers for use in components
  response.headers.set('x-user-role', profile.role);

  */

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
