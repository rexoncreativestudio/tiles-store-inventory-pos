import { createBrowserClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, val: string, options: CookieOptions) => {
          const value = val;
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: CookieOptions) => {
          const value = '';
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
      },
    }
  );

  await supabase.auth.getSession(); // Refresh session

  const { data: { session } } = await supabase.auth.getSession();

  // If user is authenticated and trying to access the root path ('/'),
  // redirect them to the dashboard overview.
  if (session && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard/overview', request.nextUrl.origin));
  }

  // If user is NOT authenticated and trying to access a protected dashboard route,
  // redirect them to the login page.
  // Updated protected routes to match the new structure
  const protectedDashboardRoutes = [
    '/dashboard',
    '/dashboard/overview',
    '/dashboard/products',
    '/dashboard/users',
    // Add other protected dashboard paths here
  ];

  if (!session && protectedDashboardRoutes.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/', request.nextUrl.origin)); // Redirect to login
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};