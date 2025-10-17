import { protectedProcedure } from '@/backend/trpc/create-context';
import { supabase } from '@/lib/supabase';

export default protectedProcedure.query(async ({ ctx }) => {
  console.log('[tRPC] Get user profile for:', ctx.user.email);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', ctx.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[tRPC] Error fetching profile:', error);
    throw error;
  }

  if (!data) {
    const defaultProfile = {
      id: ctx.user.id,
      username: ctx.user.email?.split('@')[0] || 'User',
      bio: '',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert(defaultProfile)
      .select()
      .single();

    if (createError) {
      console.error('[tRPC] Error creating profile:', createError);
      throw createError;
    }

    return newProfile;
  }

  return data;
});
