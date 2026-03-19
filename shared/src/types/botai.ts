export interface BotAIEntry {
  id: string;
  name: string;
  description: string;
  filename: string;
  isBuiltin: boolean;
  isActive: boolean;
  uploadedBy: string | null;
  uploadedAt: string;
  version: number;
  fileSize: number;
}
