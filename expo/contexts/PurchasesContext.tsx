import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
const isExpoGo = Constants.appOwnership === 'expo';

let Purchases: any = null;
let LOG_LEVEL: any = null;
let isConfigured = false;

if (isNative) {
  try {
    const rnp = require('react-native-purchases');
    Purchases = rnp.default;
    LOG_LEVEL = rnp.LOG_LEVEL;
  } catch (e) {
    console.log('react-native-purchases not available');
  }
}

function getRCToken() {
  if (__DEV__)
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  });
}

function configureRevenueCat() {
  if (isConfigured || !isNative || !Purchases || isExpoGo) return;

  const apiKey = getRCToken();
  if (!apiKey) {
    console.log('RevenueCat API key not found, skipping configuration');
    return;
  }

  try {
    if (LOG_LEVEL) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey });
    isConfigured = true;
    console.log('RevenueCat configured successfully');
  } catch (error: any) {
    console.log('RevenueCat configuration failed:', error?.message ?? String(error));
  }
}

try {
  configureRevenueCat();
} catch (error: any) {
  console.log('RevenueCat init error:', error?.message ?? String(error));
}

export type PurchasesPackageType = any;

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  const offeringsQuery = useQuery({
    queryKey: ['revenuecat-offerings'],
    queryFn: async () => {
      if (!isConfigured || !Purchases) return null;
      try {
        const offerings = await Purchases.getOfferings();
        console.log('Offerings fetched successfully');
        return offerings;
      } catch (error: any) {
        console.log('Error fetching offerings:', error?.message ?? JSON.stringify(error));
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    enabled: isConfigured && isNative && !isExpoGo,
  });

  const customerInfoQuery = useQuery({
    queryKey: ['revenuecat-customer-info'],
    queryFn: async () => {
      if (!isConfigured || !Purchases) return null;
      try {
        const info = await Purchases.getCustomerInfo();
        console.log('Customer info fetched successfully');
        setCustomerInfo(info);
        return info;
      } catch (error: any) {
        console.log('Error fetching customer info:', error?.message ?? JSON.stringify(error));
        return null;
      }
    },
    staleTime: 1000 * 60,
    enabled: isConfigured && isNative && !isExpoGo,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: any) => {
      if (!Purchases) throw new Error('Purchases not available');
      console.log('Purchasing package:', pkg.identifier);
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      return info;
    },
    onSuccess: (info: any) => {
      console.log('Purchase successful');
      setCustomerInfo(info);
      queryClient.invalidateQueries({ queryKey: ['revenuecat-customer-info'] });
      queryClient.invalidateQueries({ queryKey: ['revenuecat-offerings'] });
    },
    onError: (error: any) => {
      console.log('Purchase error:', error?.message ?? String(error));
      if (error?.userCancelled) {
        console.log('User cancelled the purchase');
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!Purchases) throw new Error('Purchases not available');
      console.log('Restoring purchases...');
      const info = await Purchases.restorePurchases();
      return info;
    },
    onSuccess: (info: any) => {
      console.log('Restore successful');
      setCustomerInfo(info);
      queryClient.invalidateQueries({ queryKey: ['revenuecat-customer-info'] });
      queryClient.invalidateQueries({ queryKey: ['revenuecat-offerings'] });
    },
    onError: (error: any) => {
      console.log('Restore error:', error?.message ?? String(error));
    },
  });

  useEffect(() => {
    if (customerInfoQuery.data) {
      setCustomerInfo(customerInfoQuery.data);
    }
  }, [customerInfoQuery.data]);

  const isPremium = useCallback(() => {
    if (!customerInfo) return false;
    return Object.keys(customerInfo.entitlements?.active ?? {}).length > 0;
  }, [customerInfo]);

  const hasEntitlement = useCallback((entitlementId: string) => {
    if (!customerInfo) return false;
    return customerInfo.entitlements?.active?.[entitlementId] !== undefined;
  }, [customerInfo]);

  return {
    offerings: offeringsQuery.data ?? null,
    customerInfo,
    isPremium: isPremium(),
    hasEntitlement,
    isLoading: isNative ? (offeringsQuery.isLoading || customerInfoQuery.isLoading) : false,
    purchase: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    restore: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    refetchCustomerInfo: () => queryClient.invalidateQueries({ queryKey: ['revenuecat-customer-info'] }),
  };
});
