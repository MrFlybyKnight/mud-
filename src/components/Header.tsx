
import React from 'react';
import { Button } from '@/components/ui/button';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { Mic, MicOff } from 'lucide-react';

const Header: React.FC = () => {
  const { isMonitoring, toggleMonitoring, isTalking, toggleTalking } = useMonitoring();

  return (
    <header className="pt-4 pb-6 px-4">
      <div className="container max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center">Chatter Watch</h1>
        <p className="text-muted-foreground text-center mb-6">
          Smart monitoring for speech and heart rate
        </p>
        
        <div className="flex justify-center gap-4 flex-wrap">
          <Button 
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
          >
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
          
          {isMonitoring && (
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
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
