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
  
  const apiKey = getRCToken();
  if (!apiKey) {
    console.error('RevenueCat API key not found');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  isConfigured = true;
  console.log('RevenueCat configured successfully');
}

configureRevenueCat();

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const offeringsQuery = useQuery({
    queryKey: ['revenuecat-offerings'],
    queryFn: async () => {
      try {
        const offerings = await Purchases.getOfferings();
        console.log('Offerings fetched:', offerings);
        return offerings;
      } catch (error) {
        console.error('Error fetching offerings:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const customerInfoQuery = useQuery({
    queryKey: ['revenuecat-customer-info'],
    queryFn: async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        console.log('Customer info fetched:', info);
        setCustomerInfo(info);
        return info;
      } catch (error) {
        console.error('Error fetching customer info:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60,
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
