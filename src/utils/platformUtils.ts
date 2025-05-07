
import { PlatformType } from '@/hooks/use-platform';

export const getPlatformColors = (platform: PlatformType) => {
  switch (platform) {
    case 'ios':
      return {
        primary: 'hsl(211, 100%, 50%)', // iOS blue
        accent: 'hsl(211, 100%, 40%)',
        background: 'hsl(210, 20%, 98%)',
        card: 'hsl(0, 0%, 100%)',
        success: 'hsl(130, 70%, 40%)', // iOS green
        warning: 'hsl(40, 100%, 50%)', // iOS yellow
        error: 'hsl(352, 100%, 54%)' // iOS red
      };
    case 'android':
      return {
        primary: 'hsl(264, 100%, 50%)', // Material purple
        accent: 'hsl(264, 100%, 40%)',
        background: 'hsl(0, 0%, 98%)',
        card: 'hsl(0, 0%, 100%)',
        success: 'hsl(122, 39%, 49%)', // Material green
        warning: 'hsl(36, 100%, 50%)', // Material orange
        error: 'hsl(4, 90%, 58%)' // Material red
      };
    default:
      return {
        primary: 'hsl(220, 100%, 50%)',
        accent: 'hsl(220, 100%, 40%)',
        background: 'hsl(0, 0%, 98%)',
        card: 'hsl(0, 0%, 100%)',
        success: 'hsl(120, 60%, 50%)',
        warning: 'hsl(45, 100%, 50%)',
        error: 'hsl(0, 100%, 50%)'
      };
  }
};

export const getPlatformIcons = (platform: PlatformType) => {
  // Return object containing platform-specific icon sizes and styles
  const baseSize = platform === 'ios' ? 22 : 24;
  
  return {
    iconSize: {
      small: baseSize - 4,
      medium: baseSize,
      large: baseSize + 4
    },
    iconStyle: {
      // iOS icons tend to be a bit thinner
      strokeWidth: platform === 'ios' ? 1.5 : 2,
      // Android uses more rounded corners
      rounded: platform === 'android' ? 'rounded-full' : 'rounded-md'
    }
  };
};

export const getPlatformFeedback = (platform: PlatformType) => {
  return {
    // iOS tends to have shorter feedback messages
    messageLength: platform === 'ios' ? 'short' : 'normal',
    // Android Material Design uses more elevation/shadow
    elevation: platform === 'android' ? 'shadow-md' : 'shadow-sm'
  };
};

export const platformClass = (platform: PlatformType, options: {
  base?: string;
  ios?: string;
  android?: string;
}) => {
  const { base = '', ios = '', android = '' } = options;
  
  let platformSpecific = '';
  if (platform === 'ios' && ios) {
    platformSpecific = ios;
  } else if (platform === 'android' && android) {
    platformSpecific = android;
  }
  
  return `${base} ${platformSpecific}`.trim();
};
