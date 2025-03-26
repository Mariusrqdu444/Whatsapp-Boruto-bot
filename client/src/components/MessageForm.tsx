import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderIcon, InfoIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ConnectionType, MessageFormData } from "@/lib/types";

const messageFormSchema = z.object({
  phoneNumber: z.string().min(1, "Numărul de telefon este obligatoriu"),
  phoneId: z.string().optional(),
  targets: z.string().min(1, "Introduceți cel puțin un grup sau număr țintă"),
  messagePath: z.string().min(1, "Selectați fișierul cu mesaje"),
  delay: z.number().min(1, "Întârzierea minimă este de 1 secundă").default(10)
});

interface MessageFormProps {
  connectionType: ConnectionType;
  setConnectionType: (type: ConnectionType) => void;
  onSubmit: (data: MessageFormData) => void;
  disabled: boolean;
}

export default function MessageForm({ 
  connectionType, 
  setConnectionType, 
  onSubmit,
  disabled
}: MessageFormProps) {
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadingCreds, setUploadingCreds] = useState<boolean>(false);
  
  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      phoneNumber: "",
      phoneId: "",
      targets: "",
      messagePath: "",
      messageText: "",
      delay: 10
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'message' | 'creds') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const formData = new FormData();
    
    if (type === 'message') {
      setUploadingFile(true);
      formData.append('file', file);
      formData.append('type', type);
      
      try {
        const response = await fetch('/api/whatsapp/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
          form.setValue('messagePath', data.filePath);
          
          // Load file content for preview
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            setMessageText(content);
          };
          reader.readAsText(file);
          
          toast({
            title: "Succes",
            description: "Fișier de mesaje încărcat cu succes"
          });
        } else {
          toast({
            variant: "destructive",
            title: "Eroare",
            description: data.message || "Eroare la încărcarea fișierului"
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "A apărut o eroare la încărcarea fișierului de mesaje"
        });
      } finally {
        setUploadingFile(false);
      }
    } else {
      // Încărcare fișier creds.json
      setUploadingCreds(true);
      formData.append('creds', file); // Folosim 'creds' ca nume de field pentru uploadCreds middleware
      
      try {
        // Folosim endpoint-ul special pentru creds.json
        const response = await fetch('/api/whatsapp/creds/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Stocăm session ID-ul generat
          if (data.sessionId) {
            localStorage.setItem('whatsapp_session_id', data.sessionId);
          }
          
          toast({
            title: "Succes",
            description: "Fișier creds.json încărcat cu succes"
          });
        } else {
          toast({
            variant: "destructive",
            title: "Eroare",
            description: data.message || "Eroare la încărcarea fișierului creds.json"
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "A apărut o eroare la încărcarea fișierului creds.json"
        });
      } finally {
        setUploadingCreds(false);
      }
    }
    
    // Reset the input value so the same file can be uploaded again if needed
    e.target.value = '';
  };

  const handleSubmit = (data: MessageFormData) => {
    if (connectionType === 'creds') {
      // Verificăm dacă a fost încărcat fișierul creds.json
      const sessionId = localStorage.getItem('whatsapp_session_id');
      if (!sessionId) {
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Te rugăm să încarci fișierul creds.json mai întâi"
        });
        return;
      }
      
      // Verificăm dacă a fost selectat fișierul de mesaje
      if (!data.messagePath) {
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Te rugăm să selectezi fișierul cu mesaje"
        });
        return;
      }
    }
    
    if (connectionType === 'phoneId' && !data.phoneId) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Te rugăm să introduci ID-ul telefonului"
      });
      return;
    }
    
    // Verificăm dacă există targets
    if (!data.targets) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Te rugăm să introduci cel puțin un număr de telefon țintă"
      });
      return;
    }
    
    // Trimitem datele cu session ID (dacă există)
    const sessionId = localStorage.getItem('whatsapp_session_id');
    onSubmit({
      ...data,
      messageText,
      sessionId: sessionId ? sessionId : undefined  // Folosim ternary pentru a converti null în undefined
    });
  };

  return (
    <div className="bg-surface rounded-md shadow-md p-5">
      <h2 className="text-center text-xl font-medium mb-6">OFFLINE WHATSAPP CHAT</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Connection Type Selection */}
          <div className="mb-5">
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <Button
                type="button"
                className={`flex-1 py-2 text-center rounded-none ${connectionType === 'creds' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setConnectionType('creds')}
              >
                Creds.json
              </Button>
              <Button
                type="button"
                className={`flex-1 py-2 text-center rounded-none ${connectionType === 'phoneId' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setConnectionType('phoneId')}
              >
                Telefon ID
              </Button>
            </div>
          </div>
          
          {/* Phone Number Field */}
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-600">Numărul tău</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="4075XXXXXXX" 
                    {...field} 
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Credentials Fields - conditional rendering based on connection type */}
          {connectionType === 'creds' ? (
            <div className="form-group">
              <FormLabel className="block text-sm text-gray-600 mb-1">Input creds.json</FormLabel>
              <div className="relative">
                <Input 
                  type="text" 
                  readOnly 
                  value="creds.json" 
                  className="pr-10" 
                  disabled={disabled || uploadingCreds}
                />
                <label htmlFor="credsFile" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary cursor-pointer">
                  <FolderIcon size={20} className="text-primary" />
                </label>
                <input 
                  id="credsFile" 
                  type="file" 
                  className="hidden" 
                  accept=".json" 
                  onChange={(e) => handleFileUpload(e, 'creds')} 
                  disabled={disabled || uploadingCreds}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500 flex items-center">
                <InfoIcon size={12} className="mr-1" />
                <span>Fișier necesar pentru autentificare WhatsApp</span>
              </div>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="phoneId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-gray-600">ID Telefon Meta Business</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="557888314082190" 
                      {...field} 
                      disabled={disabled}
                    />
                  </FormControl>
                  <div className="mt-1 text-xs text-gray-500 flex items-center">
                    <InfoIcon size={12} className="mr-1" />
                    <span>ID-ul numărului din Meta for Business</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {/* Targets Field */}
          <FormField
            control={form.control}
            name="targets"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-600">Grup</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ID-uri grup sau numere țintă" 
                    {...field} 
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Message File Path Field */}
          <FormField
            control={form.control}
            name="messagePath"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-600">Cale fișier mesaj</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input 
                      placeholder="Selectează fișierul cu mesaje" 
                      {...field} 
                      readOnly 
                      className="pr-10" 
                      disabled={disabled || uploadingFile}
                    />
                  </FormControl>
                  <label htmlFor="messageFile" className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer">
                    <FolderIcon size={20} className="text-primary" />
                  </label>
                  <input 
                    id="messageFile" 
                    type="file" 
                    className="hidden" 
                    accept=".txt" 
                    onChange={(e) => handleFileUpload(e, 'message')} 
                    disabled={disabled || uploadingFile}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Delay Field */}
          <FormField
            control={form.control}
            name="delay"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-600">Întârziere (secunde)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={1} 
                    {...field} 
                    onChange={e => field.onChange(Number(e.target.value))}
                    value={field.value}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full py-3 mt-2" 
            disabled={disabled || form.formState.isSubmitting}
          >
            START SESSION
          </Button>
        </form>
      </Form>
    </div>
  );
}
