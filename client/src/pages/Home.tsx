import { useState } from "react";
import Header from "@/components/Header";
import ControlPanel from "@/components/ControlPanel";
import MessageForm from "@/components/MessageForm";
import StatusPanel from "@/components/StatusPanel";
import { SessionStatus, ConnectionType, MessageFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { toast } = useToast();
  
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isActive: false,
    messageCount: 0,
    startTime: null,
    connectionMethod: 'creds'
  });

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<ConnectionType>('creds');
  
  const handleStartSession = async (formData: MessageFormData) => {
    try {
      const response = await apiRequest('POST', '/api/whatsapp/session/start', {
        ...formData,
        connectionType
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.sessionId);
        setSessionStatus({
          isActive: true,
          messageCount: 0,
          startTime: new Date().toISOString(),
          connectionMethod: connectionType
        });
        
        toast({
          title: "Succes",
          description: "Sesiune de mesagerie pornită cu succes!",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Eroare",
          description: data.message || "Nu s-a putut porni sesiunea",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "A apărut o eroare la pornirea sesiunii",
      });
    }
  };
  
  const handleStopSession = async () => {
    if (!sessionId) return;
    
    try {
      const response = await apiRequest('POST', '/api/whatsapp/session/stop', {
        sessionId
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSessionStatus({
          ...sessionStatus,
          isActive: false
        });
        
        toast({
          title: "Sesiune oprită",
          description: "Sesiune de mesagerie oprită cu succes",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Eroare",
          description: data.message || "Nu s-a putut opri sesiunea",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "A apărut o eroare la oprirea sesiunii",
      });
    }
  };

  // Poll for message count updates when session is active
  const pollMessageCount = async () => {
    if (sessionId && sessionStatus.isActive) {
      try {
        const response = await fetch(`/api/whatsapp/session/status?sessionId=${sessionId}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setSessionStatus(prev => ({
            ...prev,
            messageCount: data.messageCount
          }));
        }
      } catch (error) {
        console.error("Error polling message count:", error);
      }
    }
  };

  // Set up polling interval when session is active
  useState(() => {
    let interval: number | undefined;
    
    if (sessionStatus.isActive) {
      interval = window.setInterval(pollMessageCount, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="w-full max-w-md mx-auto py-4 px-4">
        <ControlPanel 
          isSessionActive={sessionStatus.isActive} 
          onStartMessaging={() => {
            toast({
              title: "Info",
              description: "Completați formularul și apăsați START SESSION",
            });
          }} 
          onStopMessaging={handleStopSession} 
        />
        
        <MessageForm 
          connectionType={connectionType}
          setConnectionType={setConnectionType}
          onSubmit={handleStartSession}
          disabled={sessionStatus.isActive}
        />
        
        {(sessionStatus.isActive || sessionStatus.messageCount > 0) && (
          <StatusPanel status={sessionStatus} />
        )}
      </main>
    </div>
  );
}
