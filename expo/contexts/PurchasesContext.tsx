import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesPackage,
} from 'react-native-purchases';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

function getRCToken() {
  if (__DEV__ || Platform.OS === 'web')
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  });
}

let isConfigured = false;

function configureRevenueCat() {
  if (isConfigured) return;
  
  if (Platform.OS === 'web') {
    console.log('RevenueCat not supported on web, skipping configuration');
    return;
  }

  const apiKey = getRCToken();
  if (!apiKey) {
    console.warn('RevenueCat API key not found, skipping configuration');
    return;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    isConfigured = true;
    console.log('RevenueCat configured successfully');
  } catch (error) {
    console.warn('RevenueCat configuration failed:', error);
  }
}

try {
  configureRevenueCat();
} catch (error) {
  console.warn('RevenueCat init error:', error);
}

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const offeringsQuery = useQuery({
    queryKey: ['revenuecat-offerings'],
    queryFn: async () => {
      if (!isConfigured) {
        console.log('RevenueCat not configured, skipping offerings fetch');
        return null;
      }
      try {
        const offerings = await Purchases.getOfferings();
        console.log('Offerings fetched:', offerings);
        return offerings;
      } catch (error) {
        console.warn('Error fetching offerings:', error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    enabled: isConfigured,
  });

  const customerInfoQuery = useQuery({
    queryKey: ['revenuecat-customer-info'],
    queryFn: async () => {
      if (!isConfigured) {
        console.log('RevenueCat not configured, skipping customer info fetch');
        return null;
      }
      try {
        const info = await Purchases.getCustomerInfo();
        console.log('Customer info fetched:', info);
        setCustomerInfo(info);
        return info;
      } catch (error) {
        console.warn('Error fetching customer info:', error);
        return null;
      }
    },
    staleTime: 1000 * 60,
    enabled: isConfigured,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      console.log('Purchasing package:', pkg.identifier);
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      return info;
    },
    onSuccess: (info) => {
      console.log('Purchase successful:', info);
      setCustomerInfo(info);
      queryClient.invalidateQueries({ queryKey: ['revenuecat-customer-info'] });
      queryClient.invalidateQueries({ queryKey: ['revenuecat-offerings'] });
    },
    onError: (error: any) => {
      console.error('Purchase error:', error);
      if (error.userCancelled) {
        console.log('User cancelled the purchase');
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      console.log('Restoring purchases...');
      const info = await Purchases.restorePurchases();
      return info;
    },
    onSuccess: (info) => {
      console.log('Restore successful:', info);
      setCustomerInfo(info);
      queryClient.invalidateQueries({ queryKey: ['revenuecat-customer-info'] });
      queryClient.invalidateQueries({ queryKey: ['revenuecat-offerings'] });
    },
    onError: (error) => {
      console.error('Restore error:', error);
    },
  });

  useEffect(() => {
    if (customerInfoQuery.data) {
      setCustomerInfo(customerInfoQuery.data);
    }
  }, [customerInfoQuery.data]);

  const isPremium = () => {
    if (!customerInfo) return false;
    return Object.keys(customerInfo.entitlements.active).length > 0;
  };

  const hasEntitlement = (entitlementId: string) => {
    if (!customerInfo) return false;
    return customerInfo.entitlements.active[entitlementId] !== undefined;
  };

  return {
    offerings: offeringsQuery.data,
    customerInfo,
    isPremium: isPremium(),
    hasEntitlement,
    isLoading: offeringsQuery.isLoading || customerInfoQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    restore: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    refetchCustomerInfo: () => queryClient.invalidateQueries({ queryKey: ['revenuecat-customer-info'] }),
  };
});
