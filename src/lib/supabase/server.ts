import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Make the function async
export async function createServerSupabaseClient() {
  // Await the cookies() call, even though it's technically synchronous,
  // this resolves the TypeScript error for some environments.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Now cookieStore.get() should be correctly typed
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Now cookieStore.set() should be correctly typed
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `cookies().set()` method can only be called in a Server Component or Route Handler.
            // This error is typically harmless if you're only reading cookies.
            console.warn("Could not set cookie in server client:", error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Now cookieStore.set() should be correctly typed
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            console.warn("Could not remove cookie in server client:", error);
          }
        },
      },
    }
  );
}