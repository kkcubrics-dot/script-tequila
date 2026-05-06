import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getSupabaseAdminClient, isSupabaseEnabled } from "@/lib/supabase";
import { AppSettings, AppState, ChatMessage, Note, Project, StructuredSections } from "@/lib/types";

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "app.json");

const defaultSettings: AppSettings = {
  provider: "openai-compatible",
  model: "gpt-4o-mini",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  systemPrompt:
    "You are a focused screenplay writing copilot. Help with concise rewrites, summaries, structure, beats, dialogue polish, and next actions."
};

const defaultState = (): AppState => {
  const now = new Date().toISOString();
  const projectId = randomUUID();
  const noteId = randomUUID();

  return {
    projects: [
      {
        id: projectId,
        name: "Untitled Script",
        description: "A scratch project for story ideas and scene drafts.",
        logline: "A washed-up magician helps his estranged daughter solve a disappearance in a desert casino town.",
        genre: "Neo-noir mystery",
        tone: "Dry, tense, character-driven",
        targetLength: "Feature, 100 pages",
        createdAt: now
      }
    ],
    notes: [
      {
        id: noteId,
        projectId,
        title: "Story Premise",
        content:
          "A washed-up magician is forced to help his estranged daughter solve a disappearance in a desert casino town.",
        structuredSections: defaultStructuredSections(),
        updatedAt: now
      }
    ],
    messages: [],
    settings: defaultSettings
  };
};

type DbProject = {
  id: string;
  name: string;
  description: string | null;
  logline: string | null;
  genre: string | null;
  tone: string | null;
  target_length: string | null;
  created_at: string;
};

type DbNote = {
  id: string;
  project_id: string;
  title: string;
  content: string;
  structured_sections: Partial<StructuredSections> | null;
  updated_at: string;
};

type DbMessage = {
  id: string;
  project_id: string | null;
  note_id: string | null;
  session_id: string | null;
  source: "human" | "model" | "agent" | "system";
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

type DbSettings = {
  id: string;
  provider: string;
  model: string;
  api_key: string;
  base_url: string;
  system_prompt: string;
  updated_at: string;
};

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultState(), null, 2), "utf8");
  }
}

async function readFileState(): Promise<AppState> {
  await ensureStoreFile();
  const raw = await readFile(DATA_FILE, "utf8");
  return normalizeState(JSON.parse(raw) as Partial<AppState>);
}

async function writeFileState(nextState: AppState) {
  await ensureStoreFile();
  await writeFile(DATA_FILE, JSON.stringify(nextState, null, 2), "utf8");
}

function mapProjectFromDb(project: DbProject): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? "",
    logline: project.logline ?? "",
    genre: project.genre ?? "",
    tone: project.tone ?? "",
    targetLength: project.target_length ?? "",
    createdAt: project.created_at
  };
}

function mapNoteFromDb(note: DbNote): Note {
  return {
    id: note.id,
    projectId: note.project_id,
    title: note.title,
    content: note.content,
    structuredSections: {
      ...defaultStructuredSections(),
      ...(note.structured_sections ?? {})
    },
    updatedAt: note.updated_at
  };
}

function mapMessageFromDb(message: DbMessage): ChatMessage {
  return {
    id: message.id,
    projectId: message.project_id,
    noteId: message.note_id,
    sessionId: message.session_id,
    source: message.source,
    role: message.role,
    content: message.content,
    createdAt: message.created_at
  };
}

async function readSupabaseState(): Promise<AppState> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return readFileState();
  }

  const [projectsRes, notesRes, messagesRes, settingsRes] = await Promise.all([
    client.from("projects").select("*").order("created_at", { ascending: false }),
    client.from("notes").select("*").order("updated_at", { ascending: false }),
    client.from("messages").select("*").order("created_at", { ascending: true }),
    client.from("settings").select("*").eq("id", "global").maybeSingle()
  ]);

  if (projectsRes.error || notesRes.error || messagesRes.error || settingsRes.error) {
    throw new Error(
      projectsRes.error?.message ||
        notesRes.error?.message ||
        messagesRes.error?.message ||
        settingsRes.error?.message ||
        "Supabase read failed"
    );
  }

  const projects = (projectsRes.data ?? []).map((row) => mapProjectFromDb(row as DbProject));
  const notes = (notesRes.data ?? []).map((row) => mapNoteFromDb(row as DbNote));
  const messages = (messagesRes.data ?? []).map((row) => mapMessageFromDb(row as DbMessage));

  const settingsRow = settingsRes.data as DbSettings | null;
  const settings: AppSettings = settingsRow
    ? {
        provider: settingsRow.provider,
        model: settingsRow.model,
        apiKey: settingsRow.api_key,
        baseUrl: settingsRow.base_url,
        systemPrompt: settingsRow.system_prompt
      }
    : defaultSettings;

  const normalized = normalizeState({ projects, notes, messages, settings });

  // First run auto-seed for empty project space.
  if (projects.length === 0 && notes.length === 0) {
    const seed = defaultState();
    await Promise.all(seed.projects.map((project) => upsertProject(project)));
    await Promise.all(seed.notes.map((note) => upsertNote(note)));
    if (!settingsRow) {
      await saveSettings(seed.settings);
    }
    return normalizeState(seed);
  }

  return normalized;
}

export async function readState(): Promise<AppState> {
  if (isSupabaseEnabled()) {
    try {
      return await readSupabaseState();
    } catch (error) {
      console.error("Supabase readState failed, fallback to file store:", error);
      return readFileState();
    }
  }
  return readFileState();
}

export async function writeState(nextState: AppState) {
  if (!isSupabaseEnabled()) {
    return writeFileState(nextState);
  }

  throw new Error("writeState is not supported with Supabase backend. Use dedicated upsert APIs.");
}

export async function upsertProject(input: Partial<Project> & Pick<Project, "name">) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    const now = new Date().toISOString();
    const project: Project = {
      id: input.id ?? randomUUID(),
      name: input.name,
      description: input.description ?? "",
      logline: input.logline ?? "",
      genre: input.genre ?? "",
      tone: input.tone ?? "",
      targetLength: input.targetLength ?? "",
      createdAt: input.createdAt ?? now
    };

    const index = state.projects.findIndex((item) => item.id === project.id);
    if (index >= 0) state.projects[index] = project;
    else state.projects.unshift(project);

    await writeFileState(state);
    return project;
  }

  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase client unavailable");

  const now = new Date().toISOString();
  const row = {
    id: input.id ?? randomUUID(),
    name: input.name,
    description: input.description ?? "",
    logline: input.logline ?? "",
    genre: input.genre ?? "",
    tone: input.tone ?? "",
    target_length: input.targetLength ?? "",
    created_at: input.createdAt ?? now
  };

  const { data, error } = await client.from("projects").upsert(row).select("*").single();
  if (error) throw new Error(error.message);
  return mapProjectFromDb(data as DbProject);
}

export async function upsertNote(input: Partial<Note> & Pick<Note, "projectId" | "title" | "content">) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    const existing = input.id ? state.notes.find((item) => item.id === input.id) : null;
    const note: Note = {
      id: input.id ?? randomUUID(),
      projectId: input.projectId,
      title: input.title,
      content: input.content,
      structuredSections: input.structuredSections ?? existing?.structuredSections ?? defaultStructuredSections(),
      updatedAt: new Date().toISOString()
    };

    const index = state.notes.findIndex((item) => item.id === note.id);
    if (index >= 0) state.notes[index] = note;
    else state.notes.unshift(note);

    await writeFileState(state);
    return note;
  }

  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase client unavailable");

  let sections: StructuredSections | undefined = input.structuredSections
    ? { ...defaultStructuredSections(), ...input.structuredSections }
    : undefined;
  if (!sections && input.id) {
    const { data } = await client.from("notes").select("structured_sections").eq("id", input.id).maybeSingle();
    const existing = (data as DbNote | null)?.structured_sections as Partial<StructuredSections> | undefined;
    sections = { ...defaultStructuredSections(), ...(existing ?? {}) };
  }

  const row = {
    id: input.id ?? randomUUID(),
    project_id: input.projectId,
    title: input.title,
    content: input.content,
    structured_sections: sections ?? defaultStructuredSections(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client.from("notes").upsert(row).select("*").single();
  if (error) throw new Error(error.message);
  return mapNoteFromDb(data as DbNote);
}

export async function updateNoteStructuredSections(noteId: string, sections: StructuredSections) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    const index = state.notes.findIndex((item) => item.id === noteId);
    if (index < 0) {
      return null;
    }
    state.notes[index] = { ...state.notes[index], structuredSections: sections, updatedAt: new Date().toISOString() };
    await writeFileState(state);
    return state.notes[index];
  }

  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { data, error } = await client
    .from("notes")
    .update({ structured_sections: sections, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapNoteFromDb(data as DbNote);
}

export async function saveSettings(settings: AppSettings) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    state.settings = settings;
    await writeFileState(state);
    return settings;
  }

  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase client unavailable");

  const row = {
    id: "global",
    provider: settings.provider,
    model: settings.model,
    api_key: settings.apiKey,
    base_url: settings.baseUrl,
    system_prompt: settings.systemPrompt,
    updated_at: new Date().toISOString()
  };

  const { error } = await client.from("settings").upsert(row);
  if (error) throw new Error(error.message);

  return settings;
}

export async function appendMessages(messages: ChatMessage[]) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    state.messages.push(...messages);
    await writeFileState(state);
    return messages;
  }

  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase client unavailable");

  const rows = messages.map((message) => ({
    id: message.id,
    project_id: message.projectId,
    note_id: message.noteId,
    session_id: message.sessionId,
    source: message.source,
    role: message.role,
    content: message.content,
    created_at: message.createdAt
  }));

  const { error } = await client.from("messages").insert(rows);
  if (error) throw new Error(error.message);

  return messages;
}

function normalizeState(input: Partial<AppState>): AppState {
  const fallback = defaultState();

  return {
    projects: (input.projects ?? fallback.projects).map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      logline: project.logline ?? project.description ?? "",
      genre: project.genre ?? "",
      tone: project.tone ?? "",
      targetLength: project.targetLength ?? "",
      createdAt: project.createdAt
    })),
    notes: (input.notes ?? fallback.notes).map((note) => ({
      ...note,
      structuredSections: {
        ...defaultStructuredSections(),
        ...(note.structuredSections ?? {})
      }
    })),
    messages: (input.messages ?? fallback.messages).map((message) => ({
      ...message,
      sessionId: message.sessionId ?? null,
      source: message.source ?? (message.role === "assistant" ? "model" : "human")
    })),
    settings: {
      ...fallback.settings,
      ...input.settings
    }
  };
}

function defaultStructuredSections(): StructuredSections {
  return {
    scene: "",
    characters: "",
    objective: "",
    conflict: "",
    beats: "",
    dialogueNotes: "",
    revisionTasks: ""
  };
}
