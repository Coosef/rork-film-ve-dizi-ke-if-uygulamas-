import { protectedProcedure } from '@/backend/trpc/create-context';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

export default protectedProcedure
  .input(
    z.object({
      username: z.string().optional(),
      bio: z.string().optional(),
      avatar_url: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[tRPC] Update profile for:', ctx.user.email);

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ctx.user.id)
      .select()
      .single();

    if (error) {
      console.error('[tRPC] Error updating profile:', error);
      throw error;
    }

    return data;
  });
