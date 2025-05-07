
import React, { createContext, useContext, ReactNode } from 'react';
import { usePlatform, PlatformType } from '@/hooks/use-platform';
import { useIsMobile } from '@/hooks/use-mobile';

interface PlatformContextType {
  platform: PlatformType;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const platformInfo = usePlatform();
  const isMobileViewport = useIsMobile();
  
  // Combine the device platform detection with viewport size detection
  const value = {
    ...platformInfo,
    isMobile: platformInfo.isMobile || isMobileViewport
  };
  
  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatformContext() {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatformContext must be used within a PlatformProvider');
  }
  return context;
}
