import { useEffect, useState } from "react";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import { SessionStatus } from "@/lib/types";

interface StatusPanelProps {
  status: SessionStatus;
}

export default function StatusPanel({ status }: StatusPanelProps) {
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  
  // Format elapsed time
  useEffect(() => {
    if (!status.startTime) return;
    
    const calculateElapsedTime = () => {
      const start = new Date(status.startTime!).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      
      const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      
      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    };
    
    calculateElapsedTime();
    const interval = setInterval(calculateElapsedTime, 1000);
    
    return () => clearInterval(interval);
  }, [status.startTime, status.isActive]);
  
  return (
    <div className="bg-surface rounded-md shadow-md p-5 mt-6">
      <h3 className="font-medium text-lg mb-3">Stare Sesiune</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Status:</span>
          <span className={`font-medium ${status.isActive ? 'text-green-500' : 'text-red-500'}`}>
            {status.isActive ? (
              <span className="flex items-center">
                <CheckCircleIcon className="mr-1" size={16} />
                Activ
              </span>
            ) : (
              <span className="flex items-center">
                <XCircleIcon className="mr-1" size={16} />
                Inactiv
              </span>
            )}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Mesaje trimise:</span>
          <span className="font-medium">{status.messageCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Timp activ:</span>
          <span className="font-medium">{elapsedTime}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Metoda de conectare:</span>
          <span className="font-medium">{status.connectionMethod === 'creds' ? 'creds.json' : 'ID Telefon'}</span>
        </div>
      </div>
    </div>
  );
}
