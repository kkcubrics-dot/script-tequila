import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { AppSettings, AppState, ChatMessage, Note, Project } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
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
        updatedAt: now
      }
    ],
    messages: [],
    settings: defaultSettings
  };
};

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultState(), null, 2), "utf8");
  }
}

export async function readState(): Promise<AppState> {
  await ensureStoreFile();
  const raw = await readFile(DATA_FILE, "utf8");
  return normalizeState(JSON.parse(raw) as Partial<AppState>);
}

export async function writeState(nextState: AppState) {
  await ensureStoreFile();
  await writeFile(DATA_FILE, JSON.stringify(nextState, null, 2), "utf8");
}

export async function upsertProject(input: Partial<Project> & Pick<Project, "name">) {
  const state = await readState();
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
  if (index >= 0) {
    state.projects[index] = project;
  } else {
    state.projects.unshift(project);
  }

  await writeState(state);
  return project;
}

export async function upsertNote(input: Partial<Note> & Pick<Note, "projectId" | "title" | "content">) {
  const state = await readState();
  const note: Note = {
    id: input.id ?? randomUUID(),
    projectId: input.projectId,
    title: input.title,
    content: input.content,
    updatedAt: new Date().toISOString()
  };

  const index = state.notes.findIndex((item) => item.id === note.id);
  if (index >= 0) {
    state.notes[index] = note;
  } else {
    state.notes.unshift(note);
  }

  await writeState(state);
  return note;
}

export async function saveSettings(settings: AppSettings) {
  const state = await readState();
  state.settings = settings;
  await writeState(state);
  return settings;
}

export async function appendMessages(messages: ChatMessage[]) {
  const state = await readState();
  state.messages.push(...messages);
  await writeState(state);
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
    notes: input.notes ?? fallback.notes,
    messages: input.messages ?? fallback.messages,
    settings: {
      ...fallback.settings,
      ...input.settings
    }
  };
}
