export interface InventoryItem {
  Localidade: string;
  Cidade: string;
  Patrimônio: string;
  Descrição: string;
  Localização: string;
  Status: string;
  Marca: string;
  Modelo: string;
  [key: string]: string;
}

export type InspectionStatus = 'conforme' | 'nao_conforme' | 'nao_localizado' | 'localizacao_incorreta';

export interface InspectionResult {
  itemId: string;
  status: InspectionStatus;
  evidence?: string; // base64 image
  notes?: string;
  timestamp: string;
}

export interface InspectionSession {
  id: string;
  locality: string;
  city?: string;
  date: string;
  sampleMode: 'aleatoria' | 'sistematica' | 'manual' | 'completo';
  items: InventoryItem[];
  results: Record<string, InspectionResult>;
  completed: boolean;
  inspectorName?: string;
  inspectorEmail?: string;
}

export interface CorrectiveAction {
  id: string;
  sessionId: string;
  patrimony: string;
  description: string;
  locality: string;
  city?: string;
  date: string;
  resolved: boolean;
  resolutionDate?: string;
  notes?: string;
  userId: string;
}
