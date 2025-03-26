export interface MessageFormData {
  phoneNumber: string;
  phoneId: string;
  targets: string;
  messagePath: string;
  messageText: string;
  delay: number;
}

export type ConnectionType = 'creds' | 'phoneId';

export interface SessionStatus {
  isActive: boolean;
  messageCount: number;
  startTime: string | null;
  connectionMethod: ConnectionType;
}

export interface SessionResponse {
  success: boolean;
  message: string;
  sessionId?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  filePath?: string;
}
