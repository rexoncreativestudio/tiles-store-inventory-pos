import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

// The context parameter should be a single object containing 'params'.
// The explicit type annotation for 'context' is removed or set to 'any'
// to resolve a known type error in Next.js 15.x.x builds.
export async function PUT(
  request: Request,
  context: any // Changed from { params: { id: string } } to any to fix build error
) {
  const userIdToUpdate = context.params.id;

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

  // Ensure Supabase service role keys are set
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Supabase keys (URL or SERVICE_ROLE_KEY) are not set!');
    return NextResponse.json({ error: 'Server configuration error: Supabase keys missing.' }, { status: 500 });
  }

  // Initialize Supabase client with service role key for elevated privileges
  const serviceRoleSupabase = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {}
  );

  // Remove fields that should not be updated (e.g., 'id' which is part of the route params)
  delete updateData.id;

  // Perform the user update operation in the database
  const { data: updatedUser, error: updateError } = await serviceRoleSupabase
    .from('users')
    .update(updateData)
    .eq('id', userIdToUpdate)
    .single();

  if (updateError) {
    console.error('API: Failed to update user.', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Return a success response with the updated user data
  return NextResponse.json({
    message: `User ${userIdToUpdate} updated successfully`,
    user: updatedUser,
  }, { status: 200 });
}
