
import React from 'react';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { getPlatformIcons } from '@/utils/platformUtils';
import { Apple, Smartphone } from 'lucide-react';

export type IconSize = 'small' | 'medium' | 'large';

interface PlatformIconProps {
  className?: string;
  color?: string;
  size?: IconSize;
}

export const PlatformLogo: React.FC<PlatformIconProps> = ({
  className = '',
  color,
  size = 'medium'
}) => {
  const { platform, isIOS, isAndroid } = usePlatformContext();
  const { iconSize } = getPlatformIcons(platform);
  
  const sizeValue = iconSize[size];
  
  if (isIOS) {
    return <Apple className={className} color={color} size={sizeValue} />;
  }
  
  if (isAndroid) {
    return <Smartphone className={className} color={color} size={sizeValue} />;
  }
  
  // Default fallback shows both icons
  return (
    <div className="flex items-center">
      <Apple className={className} color={color} size={sizeValue} />
      <span className="mx-1">/</span>
      <Smartphone className={className} color={color} size={sizeValue} />
    </div>
  );
};
