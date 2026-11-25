export type NoteCategory = 
  | 'Σκέψη'
  | 'Επιχειρηματική Ιδέα'
  | 'Στόχος'
  | 'Πρόβλημα'
  | 'Project'
  | 'Γρήγορη Σημείωση';

export interface ActionItem {
  id: string;
  text: string;
  done: boolean;
}

export interface IdeaNote {
  id: string;
  title?: string;
  text: string;
  category: NoteCategory;
  createdAt: string;
  image?: string | null;
  aiResponse?: string | null;
  modelUsed?: string;
  actionItems?: ActionItem[];
  pinned?: boolean;
}

export type ChatRole = 'strategic_advisor' | 'action_coach' | 'creative_brainstormer' | 'devils_advocate';

export type ModelSpeed = 'complex' | 'balanced' | 'fast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}
