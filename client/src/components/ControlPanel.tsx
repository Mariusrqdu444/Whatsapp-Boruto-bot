import { Button } from "@/components/ui/button";
import { PlayIcon, StopCircle } from "lucide-react";

interface ControlPanelProps {
  isSessionActive: boolean;
  onStartMessaging: () => void;
  onStopMessaging: () => void;
}

export default function ControlPanel({ 
  isSessionActive, 
  onStartMessaging, 
  onStopMessaging 
}: ControlPanelProps) {
  return (
    <div className="bg-surface rounded-md shadow-sm mb-6 p-4">
      <div className="flex justify-center space-x-4">
        <Button
          variant="default"
          className="rounded-full"
          onClick={onStartMessaging}
          disabled={isSessionActive}
        >
          <PlayIcon className="mr-1" size={16} />
          START MESSAGING
        </Button>

        <Button
          variant="destructive"
          className="rounded-full"
          onClick={onStopMessaging}
          disabled={!isSessionActive}
        >
          <StopCircle className="mr-1" size={16} />
          STOP MESSAGING
        </Button>
      </div>
    </div>
  );
}