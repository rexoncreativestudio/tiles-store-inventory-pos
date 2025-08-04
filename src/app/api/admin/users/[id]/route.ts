export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

export async function PUT(
  request: NextRequest,
  // FIX: The 'params' object in a Route Handler is a plain object, not a Promise.
  // The context type has been corrected to reflect this.
  context: { params: { id: string } }
) {
  // FIX: Access the 'id' directly from context.params.
  // No 'await' is needed here because it's not a Promise.
  const userIdToUpdate = context.params.id;

  let updateData: Record<string, any>;
  try {
    updateData = await request.json();
  } catch (_err) {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
    error: currentUserError
  } = await supabase.auth.getUser();

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

  // Prevent client from modifying protected fields
  delete updateData.id;
  delete updateData.role;

  const { data: updatedUser, error: updateError } = await serviceRoleSupabase
    .from('users')
    .update(updateData)
    .eq('id', userIdToUpdate)
    .single();

  if (updateError) {
    console.error('API: Error updating user:', updateError);
    return NextResponse.json({ error: `Failed to update user: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json(
    { message: 'User updated successfully', user: updatedUser },
    { status: 200 }
  );
}
