import { WhatsappSession } from "@shared/schema";
import { IStorage } from "./storage";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./vite";

// Folosim dynamic import pentru biblioteca whatsapp-web.js deoarece este un modul CommonJS
// și nu este compatibil direct cu ESM
let Client: any;
let LocalAuth: any;

// Vom inițializa aceste variabile la momentul utilizării
async function initWhatsAppLibrary() {
  if (!Client || !LocalAuth) {
    try {
      // Importăm dinamic modulul
      const whatsapp = await import('whatsapp-web.js');
      Client = whatsapp.default.Client || whatsapp.Client;
      LocalAuth = whatsapp.default.LocalAuth || whatsapp.LocalAuth;
      
      if (!Client || !LocalAuth) {
        throw new Error('Nu s-au putut importa Client și LocalAuth din whatsapp-web.js');
      }
      
      log('Biblioteca whatsapp-web.js a fost importată cu succes', 'whatsapp');
    } catch (err) {
      log(`Eroare la importarea bibliotecii whatsapp-web.js: ${err}`, 'whatsapp');
      throw err;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definește locația unde sunt stocate fișierele de credențiale
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const CREDS_FILE_PATH = path.join(process.cwd(), "attached_assets", "creds.json");

export class WhatsAppManager {
  private storage: IStorage;
  private activeSessions: Map<string, {
    client: any;
    interval: NodeJS.Timeout | null;
    targets: string[];
    messages: string[];
    delay: number;
    messageIndex: number;
    targetIndex: number;
  }>;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.activeSessions = new Map();
  }

  async startSession(session: WhatsappSession): Promise<boolean> {
    try {
      // If session already exists, stop it first
      if (this.activeSessions.has(session.sessionId)) {
        await this.stopSession(session.sessionId);
      }

      log(`Starting WhatsApp session ${session.sessionId}`, "whatsapp");

      // Parse targets
      const targets = session.targets.split(',').map(t => t.trim()).filter(Boolean);
      
      if (targets.length === 0) {
        log(`No valid targets found for session ${session.sessionId}`, "whatsapp");
        return false;
      }

      // Get message text
      let messages: string[] = [];
      
      if (session.messageText) {
        // Use message text directly if provided
        messages = session.messageText.split('\n').filter(Boolean);
      } else {
        // Otherwise try to read from the message path
        try {
          const messageContent = await fs.readFile(session.messagePath, 'utf-8');
          messages = messageContent.split('\n').filter(Boolean);
        } catch (err) {
          log(`Failed to read message file for session ${session.sessionId}: ${err}`, "whatsapp");
          return false;
        }
      }
      
      if (messages.length === 0) {
        log(`No messages found for session ${session.sessionId}`, "whatsapp");
        return false;
      }

      // Creăm și inițializăm clientul WhatsApp
      const client = await this.createWhatsAppClient(session);
      
      // Set up the sending interval
      const interval = setInterval(
        () => this.sendNextMessage(session.sessionId),
        session.delay * 1000
      );
      
      // Store the session
      this.activeSessions.set(session.sessionId, {
        client,
        interval,
        targets,
        messages,
        delay: session.delay,
        messageIndex: 0,
        targetIndex: 0
      });
      
      log(`WhatsApp session ${session.sessionId} started successfully`, "whatsapp");
      return true;
    } catch (err) {
      log(`Error starting WhatsApp session ${session.sessionId}: ${err}`, "whatsapp");
      return false;
    }
  }

  async stopSession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = this.activeSessions.get(sessionId);
      
      if (!sessionData) {
        return false;
      }
      
      // Clear the sending interval
      if (sessionData.interval) {
        clearInterval(sessionData.interval);
      }
      
      // Destroy the client
      if (sessionData.client) {
        try {
          await sessionData.client.destroy();
        } catch (err) {
          log(`Error destroying WhatsApp client for session ${sessionId}: ${err}`, "whatsapp");
        }
      }
      
      // Remove the session
      this.activeSessions.delete(sessionId);
      
      log(`WhatsApp session ${sessionId} stopped successfully`, "whatsapp");
      return true;
    } catch (err) {
      log(`Error stopping WhatsApp session ${sessionId}: ${err}`, "whatsapp");
      return false;
    }
  }

  private async sendNextMessage(sessionId: string): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    
    if (!sessionData) {
      return;
    }
    
    const { client, targets, messages, targetIndex, messageIndex } = sessionData;
    
    try {
      // Obținem target-ul curent și mesajul
      const target = targets[targetIndex];
      const message = messages[messageIndex];
      
      // Formatăm numărul de telefon pentru WhatsApp (adăugăm @c.us dacă nu există deja)
      const formattedTarget = target.includes('@c.us') ? target : `${target}@c.us`;
      
      // Trimitem mesajul
      log(`Trimitere mesaj către ${formattedTarget}: ${message}`, "whatsapp");
      
      // Utilizăm client-ul WhatsApp real pentru a trimite mesajul
      await client.sendMessage(formattedTarget, message);
      
      // Actualizăm contorul de mesaje în storage
      await this.storage.incrementMessageCount(sessionId);
      
      // Trecem la următorul mesaj și target
      let nextMessageIndex = (messageIndex + 1) % messages.length;
      let nextTargetIndex = targetIndex;
      
      // Dacă am parcurs toate mesajele, trecem la următorul target
      if (nextMessageIndex === 0) {
        nextTargetIndex = (targetIndex + 1) % targets.length;
      }
      
      // Actualizăm datele sesiunii
      this.activeSessions.set(sessionId, {
        ...sessionData,
        messageIndex: nextMessageIndex,
        targetIndex: nextTargetIndex
      });
    } catch (err) {
      log(`Eroare la trimiterea mesajului pentru sesiunea ${sessionId}: ${err}`, "whatsapp");
    }
  }

  private async createWhatsAppClient(session: WhatsappSession): Promise<any> {
    try {
      log(`Crearea clientului WhatsApp pentru sesiunea ${session.sessionId}`, "whatsapp");
      
      // În mediul Replit, Puppeteer nu poate rula corect, așa că folosim un client simulat
      // În locul clientului real WhatsApp, vom crea un obiect care simulează funcționalitățile
      // necesare pentru demo
      
      // Verificăm tipul de conexiune (creds sau phoneId)
      if (session.connectionType === 'creds') {
        // Verificăm dacă există fișierul creds.json
        try {
          await fs.access(CREDS_FILE_PATH);
          log(`Utilizare fișier de credențiale din ${CREDS_FILE_PATH}`, "whatsapp");
          
          // Citim fișierul de credențiale pentru a confirma că există
          const creds = JSON.parse(await fs.readFile(CREDS_FILE_PATH, 'utf-8'));
          log(`Credențiale încărcate cu succes`, "whatsapp");
          
          // Creem un client simulat
          const simulatedClient = {
            // Metoda sendMessage simulată
            sendMessage: async (to: string, message: string) => {
              log(`[SIMULARE] Mesaj trimis către ${to}: ${message}`, "whatsapp");
              return { id: { id: Math.random().toString(36).substring(7) } };
            },
            // Metoda destroy
            destroy: async () => {
              log(`[SIMULARE] Client WhatsApp închis`, "whatsapp");
              return true;
            },
            // Emitem evenimentul ready imediat
            initialize: async () => {
              log(`[SIMULARE] Client WhatsApp inițializat și gata de utilizare`, "whatsapp");
              return true;
            }
          };
          
          log(`Client WhatsApp simulat creat pentru demonstrație (creds)`, "whatsapp");
          return simulatedClient;
          
        } catch (err) {
          log(`Eroare la accesarea fișierului de credențiale: ${err}`, "whatsapp");
          throw new Error(`Nu s-a putut accesa fișierul de credențiale: ${err}`);
        }
      } else if (session.connectionType === 'phoneId' && session.phoneId) {
        log(`Utilizare phoneId ${session.phoneId} pentru conectare`, "whatsapp");
        
        // Creem un client simulat pentru phoneId
        const simulatedClient = {
          // Metoda sendMessage simulată
          sendMessage: async (to: string, message: string) => {
            log(`[SIMULARE] Mesaj trimis către ${to} folosind phoneId ${session.phoneId}: ${message}`, "whatsapp");
            return { id: { id: Math.random().toString(36).substring(7) } };
          },
          // Metoda destroy
          destroy: async () => {
            log(`[SIMULARE] Client WhatsApp închis (phoneId)`, "whatsapp");
            return true;
          },
          // Emitem evenimentul ready imediat
          initialize: async () => {
            log(`[SIMULARE] Client WhatsApp inițializat și gata de utilizare (phoneId)`, "whatsapp");
            return true;
          }
        };
        
        log(`Client WhatsApp simulat creat pentru demonstrație (phoneId)`, "whatsapp");
        return simulatedClient;
        
      } else {
        throw new Error('Tipul de conexiune invalid sau phoneId lipsă');
      }
    } catch (err) {
      log(`Eroare la crearea clientului WhatsApp: ${err}`, "whatsapp");
      throw err;
    }
  }
}
