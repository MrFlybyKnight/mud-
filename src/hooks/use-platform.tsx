
import { useEffect, useState } from 'react';

export type PlatformType = 'ios' | 'android' | 'web';

export function usePlatform() {
  const [platform, setPlatform] = useState<PlatformType>('web');

  useEffect(() => {
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (/iphone|ipad|ipod|ios/.test(userAgent)) {
        setPlatform('ios');
      } else if (/android/.test(userAgent)) {
        setPlatform('android');
      } else {
        setPlatform('web');
      }
    };

    detectPlatform();
  }, []);

  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';
  const isMobile = isIOS || isAndroid;
  
  return {
    platform,
    isIOS,
    isAndroid,
    isMobile
  };
}
