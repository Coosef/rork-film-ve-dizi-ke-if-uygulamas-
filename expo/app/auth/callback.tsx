import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const access_token = params.access_token as string;
        const refresh_token = params.refresh_token as string;

        if (access_token && refresh_token) {
          console.log('[AuthCallback] Setting session from callback');
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.error('[AuthCallback] Error setting session:', error);
            router.replace('/auth/login');
            return;
          }

          console.log('[AuthCallback] Session set successfully');
          router.replace('/');
        } else {
          console.log('[AuthCallback] No tokens found, redirecting to login');
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('[AuthCallback] Callback error:', error);
        router.replace('/auth/login');
      }
    };

    handleCallback();
  }, [params, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
      <Text style={styles.text}>Giriş yapılıyor...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.dark.text,
  },
});
