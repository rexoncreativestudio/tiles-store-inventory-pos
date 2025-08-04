// src/app/api/admin/users/[id]/update/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

export async function PUT(
  request: Request,
  // Changed from `{ params }: { params: { id: string } }` to `context: any`
  // to resolve the TypeScript build error related to Next.js 15.x.x type inference.
  context: any
) {
  const userIdToUpdate = context.params.id; // Access params from the context object
  const body = await request.json();
  const { email, role, branch_id, password } = body;

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
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const serviceRoleSupabase = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const updateAuthUserPayload: {
    email?: string;
    password?: string;
    user_metadata?: { role: string; branch_id: string | null };
  } = {
    email: email,
    user_metadata: { role, branch_id }, // Always set user_metadata
  };

  if (password && password.trim().length > 0) {
    updateAuthUserPayload.password = password;
  }

  const { error: authUpdateError } = await serviceRoleSupabase.auth.admin.updateUserById(
    userIdToUpdate,
    updateAuthUserPayload
  );

  if (authUpdateError) {
    console.error('API: Failed to update user in Auth.', authUpdateError);
    return NextResponse.json({ error: authUpdateError.message }, { status: 500 });
  }

  const { error: dbUpdateError } = await supabase
    .from('users')
    .update({ email, role, branch_id })
    .eq('id', userIdToUpdate);

  if (dbUpdateError) {
    console.error('API: Failed to update user in public.users table (RLS might be blocking this).', dbUpdateError);
    return NextResponse.json({ error: dbUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'User updated successfully' }, { status: 200 });
}
