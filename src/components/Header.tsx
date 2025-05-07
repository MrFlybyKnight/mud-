
import React from 'react';
import { Button } from '@/components/ui/button';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { Mic, MicOff, Heart, Moon, Sun } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { useTheme } from '@/contexts/ThemeContext';

const Header: React.FC = () => {
  const { isMonitoring, toggleMonitoring, isTalking, toggleTalking } = useMonitoring();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="container max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" />
          <h1 className="text-lg font-bold">ChatterWatch</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
          <NotificationCenter />
          <Button 
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
          >
            {isMonitoring ? "Pause Monitoring" : "Resume Monitoring"}
          </Button>
          
          <Button 
            onClick={toggleTalking}
            variant="outline"
            className={isTalking ? "bg-accent" : ""}
          >
            {isTalking ? (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Simulating Speech
              </>
            ) : (
              <>
                <MicOff className="mr-2 h-4 w-4" />
                Silent Mode
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
