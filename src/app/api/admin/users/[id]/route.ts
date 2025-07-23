// src/app/api/admin/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server'; // Import the RLS-enabled client
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'; // Import original createClient for service_role


export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userIdToDelete = params.id;
  const supabase = await createServerSupabaseClient(); // Client for current user's authentication (RLS-enabled)

  // 1. Authenticate the request: Ensure an admin user is making this call
  const { data: { user: currentUser }, error: currentUserError } = await supabase.auth.getUser();

  if (currentUserError || !currentUser) {
    console.error('API: Unauthorized - No current user or error fetching user.', currentUserError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (profileError || currentUserProfile?.role !== 'admin') {
    console.error('API: Forbidden - User is not an admin. Role:', currentUserProfile?.role);
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // 2. Perform deletion using the service_role client (securely)
  // CRITICAL FIX: Create a *new* Supabase client instance using the service_role key directly.
  // This client will bypass RLS.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Supabase keys (URL or SERVICE_ROLE_KEY) are not set!');
    return NextResponse.json({ error: 'Server configuration error: Supabase keys missing.' }, { status: 500 });
  }

  const serviceRoleSupabase = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      // Pass the auth object here if you need to mimic user context for RLS,
      // but for admin.deleteUser, service_role bypasses RLS entirely.
      // So, no specific auth options are needed for the service role client itself.
    }
  );

  // Perform the deletion of the user from Supabase Auth
  const { error: deleteError } = await serviceRoleSupabase.auth.admin.deleteUser(userIdToDelete);

  if (deleteError) {
    console.error('API: Failed to delete user from Auth.', deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // The 'on_auth_user_created' trigger (specifically, its ON DELETE CASCADE on the FK)
  // or your custom 'handle_new_user' logic should handle the public.users table deletion.

  return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
}