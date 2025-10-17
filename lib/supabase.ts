import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = 'https://tbpjusypaidmkeeewcpj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicGp1c3lwYWlkbWtlZWV3Y3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDc0MzksImV4cCI6MjA3NjA4MzQzOX0.WFo08h-1iHU6XgvcjkdJ_xzbzfE6b1B495of6ITUBYY';

console.log('[Supabase] Initializing client');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
