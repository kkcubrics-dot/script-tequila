export type Project = {
  id: string;
  name: string;
  description: string;
  logline: string;
  genre: string;
  tone: string;
  targetLength: string;
  createdAt: string;
};

export type Note = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  projectId: string | null;
  noteId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type AppSettings = {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  systemPrompt: string;
};

export type AppState = {
  projects: Project[];
  notes: Note[];
  messages: ChatMessage[];
  settings: AppSettings;
};
