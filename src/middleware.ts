import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Roles that can access backoffice
const BACKOFFICE_ROLES = ['accountant', 'editor', 'admin', 'riemer'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // DEV BYPASS MODE - Only for local development!
  const devBypass = process.env.DEV_BYPASS_AUTH === 'true';
  if (devBypass) {
    const devRole = process.env.DEV_USER_ROLE || 'riemer';
    console.log(`🔓 DEV MODE: Bypassing auth as role "${devRole}"`);

    // Check if dev role can access backoffice
    if (!BACKOFFICE_ROLES.includes(devRole)) {
      return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000'));
    }

    // Attach role to response headers for use in components
    response.headers.set('x-user-role', devRole);
    return response;
  }

  // PRODUCTION AUTH
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

  // No profile or insufficient role - access denied, redirect to main site
  if (!profile || !BACKOFFICE_ROLES.includes(profile.role)) {
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000'));
  }

  // Attach role to response headers for use in components
  response.headers.set('x-user-role', profile.role);

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
