import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userIdToUpdate = params.id;

  // Parse request body (assumes JSON)
  let updateData: Record<string, any>;
  try {
    updateData = await request.json();
  } catch (_err) {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user: currentUser }, error: currentUserError } = await supabase.auth.getUser();

  if (currentUserError || !currentUser) {
    console.error('API: Unauthorized - No current user or error fetching user.', currentUserError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
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

  // Update user in your database (example: users table)
  const serviceRoleSupabase = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {}
  );

  // Remove fields that should not be updated
  delete updateData.id;

  const { data: updatedUser, error: updateError } = await serviceRoleSupabase
    .from('users')
    .update(updateData)
    .eq('id', userIdToUpdate)
    .single();

  if (updateError) {
    console.error('API: Failed to update user.', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `User ${userIdToUpdate} updated successfully`,
    user: updatedUser,
  }, { status: 200 });
} 