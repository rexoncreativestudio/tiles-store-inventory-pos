// src/app/api/admin/users/create/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
// headers is not directly used in the body of this file.
// import { headers } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, role, branch_id } = body;

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

  const { data: newUser, error: createUserError } = await serviceRoleSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, branch_id },
  });

  if (createUserError) {
    console.error('API: Failed to create user via service_role.', createUserError);
    return NextResponse.json({ error: createUserError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'User created successfully', userId: newUser.user?.id }, { status: 200 });
}