import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

export async function DELETE(request: Request) {
  // Parse the user ID from the URL
  const url = new URL(request.url);
  // Assumes the route is /api/admin/users/[id], so [id] is the last segment
  const pathSegments = url.pathname.split('/');
  const userIdToDelete = pathSegments[pathSegments.length - 1];

  const supabase = await createServerSupabaseClient();

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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Supabase keys (URL or SERVICE_ROLE_KEY) are not set!');
    return NextResponse.json({ error: 'Server configuration error: Supabase keys missing.' }, { status: 500 });
  }

  const serviceRoleSupabase = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {}
  );

  const { error: deleteError } = await serviceRoleSupabase.auth.admin.deleteUser(userIdToDelete);

  if (deleteError) {
    console.error('API: Failed to delete user from Auth.', deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
}