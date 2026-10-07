import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { BRAND } from '../lib/brand';

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  return isOffline;
}
