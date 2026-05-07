export type Note = {
  id: string;
  folderId: string | null;
  folder: string;
  title: string;
  content: string;
  structuredSections: StructuredSections;
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteVersion = {
  id: string;
  noteId: string;
  versionNo: number;
  title: string;
  content: string;
  structuredSections: StructuredSections;
  editor: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  noteId: string | null;
  sessionId: string | null;
  source: "human" | "model" | "agent" | "system";
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type StructuredSections = {
  scene: string;
  characters: string;
  objective: string;
  conflict: string;
  beats: string;
  dialogueNotes: string;
  revisionTasks: string;
};

export type AppSettings = {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  systemPrompt: string;
};

export type AppState = {
  folders: Folder[];
  notes: Note[];
  noteVersions: NoteVersion[];
  messages: ChatMessage[];
  settings: AppSettings;
};
