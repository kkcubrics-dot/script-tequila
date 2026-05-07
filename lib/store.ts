import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getAuthedUser } from "@/lib/auth";
import { getSupabaseAdminClient, isSupabaseEnabled } from "@/lib/supabase";
import { AppSettings, AppState, ChatMessage, Folder, Note, NoteVersion, StructuredSections } from "@/lib/types";

const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "app.json");
const DEV_FALLBACK = process.env.NODE_ENV !== "production";

const defaultSettings: AppSettings = {
  provider: "openai-compatible",
  model: "deepseek-v4-flash",
  apiKey: "",
  baseUrl: "https://api.deepseek.com/v1",
  systemPrompt:
    "You are a focused screenplay writing copilot. Help with concise rewrites, summaries, structure, beats, dialogue polish, and next actions."
};

const defaultState = (): AppState => {
  const now = new Date().toISOString();
  const folderId = randomUUID();
  const noteId = randomUUID();

  return {
    folders: [
      {
        id: folderId,
        name: "Drafts",
        createdAt: now,
        updatedAt: now
      }
    ],
    notes: [
      {
        id: noteId,
        folderId,
        folder: "Drafts",
        title: "Story Premise",
        content:
          "A washed-up magician is forced to help his estranged daughter solve a disappearance in a desert casino town.",
        structuredSections: defaultStructuredSections(),
        createdAt: now,
        updatedAt: now
      }
    ],
    noteVersions: [],
    messages: [],
    settings: defaultSettings
  };
};

type DbNote = {
  id: string;
  user_id: string;
  folder_id?: string | null;
  folder: string | null;
  title: string;
  content: string;
  structured_sections: Partial<StructuredSections> | null;
  created_at?: string;
  updated_at: string;
};

type DbFolder = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type DbNoteVersion = {
  id: string;
  user_id: string;
  note_id: string;
  version_no: number;
  title: string;
  content: string;
  structured_sections: Partial<StructuredSections> | null;
  editor: string | null;
  created_at: string;
};

type DbMessage = {
  id: string;
  user_id: string;
  note_id: string | null;
  session_id: string | null;
  source: "human" | "model" | "agent" | "system";
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

type DbSettings = {
  id: string;
  user_id: string;
  provider: string;
  model: string;
  api_key: string;
  base_url: string;
  system_prompt: string;
  updated_at: string;
};

async function requireScopeUserId() {
  const user = await getAuthedUser();
  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return user.id;
}

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

function splitLegacyTitle(value: string) {
  const parts = value.split("/").map((item) => item.trim()).filter(Boolean);
  if (parts.length <= 1) return { folder: "", title: value.trim() || "Untitled Note" };
  return { folder: parts.slice(0, -1).join("/"), title: parts[parts.length - 1] };
}

function mapNoteFromDb(note: DbNote): Note {
  const parsed = splitLegacyTitle(note.title);
  const hasFolderColumn = note.folder !== null && note.folder !== undefined;
  return {
    id: note.id,
    folderId: note.folder_id ?? null,
    folder: (note.folder ?? parsed.folder).trim(),
    title: hasFolderColumn ? note.title : parsed.title,
    content: note.content,
    structuredSections: {
      ...defaultStructuredSections(),
      ...(note.structured_sections ?? {})
    },
    createdAt: note.created_at ?? note.updated_at,
    updatedAt: note.updated_at
  };
}

function mapFolderFromDb(folder: DbFolder): Folder {
  return {
    id: folder.id,
    name: folder.name,
    createdAt: folder.created_at,
    updatedAt: folder.updated_at
  };
}

function mapNoteVersionFromDb(version: DbNoteVersion): NoteVersion {
  return {
    id: version.id,
    noteId: version.note_id,
    versionNo: version.version_no,
    title: version.title,
    content: version.content,
    structuredSections: { ...defaultStructuredSections(), ...(version.structured_sections ?? {}) },
    editor: version.editor ?? "system",
    createdAt: version.created_at
  };
}

function mapMessageFromDb(message: DbMessage): ChatMessage {
  return {
    id: message.id,
    noteId: message.note_id,
    sessionId: message.session_id,
    source: message.source,
    role: message.role,
    content: message.content,
    createdAt: message.created_at
  };
}

async function readSupabaseState(userId: string): Promise<AppState> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return readFileState();
  }

  const [foldersRes, notesRes, messagesRes, settingsRes, versionsRes] = await Promise.all([
    client.from("folders").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("messages").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    client.from("settings").select("*").eq("user_id", userId).eq("id", "global").maybeSingle(),
    client.from("note_versions").select("*").eq("user_id", userId).order("version_no", { ascending: false })
  ]);

  if (foldersRes.error || notesRes.error || messagesRes.error || settingsRes.error || versionsRes.error) {
    throw new Error(
      foldersRes.error?.message ||
      notesRes.error?.message ||
      messagesRes.error?.message ||
      settingsRes.error?.message ||
      versionsRes.error?.message ||
      "Supabase read failed"
    );
  }

  const folders = (foldersRes.data ?? []).map((row) => mapFolderFromDb(row as DbFolder));
  const notes = (notesRes.data ?? []).map((row) => mapNoteFromDb(row as DbNote));
  const messages = (messagesRes.data ?? []).map((row) => mapMessageFromDb(row as DbMessage));
  const noteVersions = (versionsRes.data ?? []).map((row) => mapNoteVersionFromDb(row as DbNoteVersion));

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

  const normalized = normalizeState({ folders, notes, noteVersions, messages, settings });

  if (notes.length === 0 && folders.length === 0) {
    const seed = defaultState();
    await Promise.all(seed.folders.map((folder) => upsertFolder({ id: folder.id, name: folder.name })));
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
      const userId = await requireScopeUserId();
      return await readSupabaseState(userId);
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        throw error;
      }
      if (!DEV_FALLBACK) {
        throw error;
      }
      console.error("Supabase readState failed, fallback to file store in development:", error);
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

async function appendNoteVersionForState(
  state: AppState,
  note: Note,
  editor = "human"
) {
  const currentMax = state.noteVersions
    .filter((item) => item.noteId === note.id)
    .reduce((max, item) => (item.versionNo > max ? item.versionNo : max), 0);
  const version: NoteVersion = {
    id: randomUUID(),
    noteId: note.id,
    versionNo: currentMax + 1,
    title: note.title,
    content: note.content,
    structuredSections: note.structuredSections,
    editor,
    createdAt: new Date().toISOString()
  };
  state.noteVersions.unshift(version);
}

async function appendNoteVersion(input: {
  noteId: string;
  userId: string;
  title: string;
  content: string;
  structuredSections: StructuredSections;
  editor?: string;
}) {
  if (!isSupabaseEnabled()) return;
  const client = getSupabaseAdminClient();
  if (!client) return;

  const { data, error } = await client
    .from("note_versions")
    .select("version_no")
    .eq("note_id", input.noteId)
    .eq("user_id", input.userId)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const latest = data as { version_no?: number } | null;
  const nextVersionNo = (latest?.version_no ?? 0) + 1;

  const { error: insertError } = await client.from("note_versions").insert({
    id: randomUUID(),
    user_id: input.userId,
    note_id: input.noteId,
    version_no: nextVersionNo,
    title: input.title,
    content: input.content,
    structured_sections: input.structuredSections,
    editor: input.editor ?? "human",
    created_at: new Date().toISOString()
  });
  if (insertError) throw new Error(insertError.message);
}

export async function upsertFolder(input: { id?: string; name: string }) {
  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new Error("Folder name is required.");
  }

  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    const existingById = input.id ? state.folders.find((item) => item.id === input.id) : null;
    const existingByName = state.folders.find((item) => item.name === normalizedName);
    const existing = existingById ?? existingByName ?? null;
    const now = new Date().toISOString();
    const folder: Folder = {
      id: existing?.id ?? input.id ?? randomUUID(),
      name: normalizedName,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    const nextFolders = state.folders.filter((item) => item.id !== folder.id && item.name !== folder.name);
    nextFolders.push(folder);
    nextFolders.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    state.folders = nextFolders;
    await writeFileState(state);
    return folder;
  }

  const userId = await requireScopeUserId();
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase client unavailable");

  const now = new Date().toISOString();
  const existing = input.id
    ? await client.from("folders").select("*").eq("id", input.id).eq("user_id", userId).maybeSingle()
    : await client.from("folders").select("*").eq("name", normalizedName).eq("user_id", userId).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const row = existing.data as DbFolder | null;

  const payload = {
    id: row?.id ?? input.id ?? randomUUID(),
    user_id: userId,
    name: normalizedName,
    created_at: row?.created_at ?? now,
    updated_at: now
  };
  const { data, error } = await client.from("folders").upsert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return mapFolderFromDb(data as DbFolder);
}

export async function upsertNote(input: Partial<Note> & Pick<Note, "folder" | "title" | "content">) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    const existing = input.id ? state.notes.find((item) => item.id === input.id) : null;
    const folderName = input.folder.trim();
    let folderId = input.folderId ?? existing?.folderId ?? null;
    if (folderName) {
      const folder = await upsertFolder({ id: folderId ?? undefined, name: folderName });
      folderId = folder.id;
      const folderIndex = state.folders.findIndex((item) => item.id === folder.id);
      if (folderIndex >= 0) state.folders[folderIndex] = folder;
      else state.folders.push(folder);
    }
    const createdAt = input.createdAt ?? existing?.createdAt ?? new Date().toISOString();
    const note: Note = {
      id: input.id ?? randomUUID(),
      folderId,
      folder: input.folder.trim(),
      title: input.title,
      content: input.content,
      structuredSections: input.structuredSections ?? existing?.structuredSections ?? defaultStructuredSections(),
      createdAt,
      updatedAt: new Date().toISOString()
    };

    const index = state.notes.findIndex((item) => item.id === note.id);
    if (index >= 0) state.notes[index] = note;
    else state.notes.unshift(note);
    await appendNoteVersionForState(state, note);

    await writeFileState(state);
    return note;
  }

  const userId = await requireScopeUserId();

  try {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("Supabase client unavailable");

    let sections: StructuredSections | undefined = input.structuredSections
      ? { ...defaultStructuredSections(), ...input.structuredSections }
      : undefined;
    let createdAt = input.createdAt;
    let folderId = input.folderId;
    if (!sections && input.id) {
      const { data } = await client
        .from("notes")
        .select("structured_sections, created_at, folder_id")
        .eq("id", input.id)
        .eq("user_id", userId)
        .maybeSingle();
      const existing = data as DbNote | null;
      sections = { ...defaultStructuredSections(), ...((existing?.structured_sections ?? {}) as Partial<StructuredSections>) };
      createdAt = existing?.created_at ?? createdAt;
      folderId = existing?.folder_id ?? folderId;
    }

    const folderName = input.folder.trim();
    if (folderName) {
      const folder = await upsertFolder({ id: folderId ?? undefined, name: folderName });
      folderId = folder.id;
    } else {
      folderId = null;
    }

    const now = new Date().toISOString();
    const row = {
      id: input.id ?? randomUUID(),
      user_id: userId,
      folder_id: folderId,
      folder: input.folder.trim(),
      title: input.title,
      content: input.content,
      structured_sections: sections ?? defaultStructuredSections(),
      updated_at: now,
      ...(createdAt ? { created_at: createdAt } : {})
    };

    const upsertWithSelect = async () => {
      const { data, error } = await client.from("notes").upsert(row).select("*").single();
      if (error) throw new Error(error.message);
      const mapped = mapNoteFromDb(data as DbNote);
      await appendNoteVersion({
        noteId: mapped.id,
        userId,
        title: mapped.title,
        content: mapped.content,
        structuredSections: mapped.structuredSections
      });
      return mapped;
    };

    try {
      return await upsertWithSelect();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/created_at/i.test(message)) throw error;
      const fallbackRow = {
        id: input.id ?? randomUUID(),
        user_id: userId,
        folder_id: folderId,
        folder: input.folder.trim(),
        title: input.title,
        content: input.content,
        structured_sections: sections ?? defaultStructuredSections(),
        updated_at: now
      };
      const { data, error: fallbackError } = await client.from("notes").upsert(fallbackRow).select("*").single();
      if (fallbackError) throw new Error(fallbackError.message);
      const mapped = mapNoteFromDb(data as DbNote);
      await appendNoteVersion({
        noteId: mapped.id,
        userId,
        title: mapped.title,
        content: mapped.content,
        structuredSections: mapped.structuredSections
      });
      return { ...mapped, createdAt: createdAt ?? mapped.updatedAt };
    }
  } catch (error) {
    if (!DEV_FALLBACK) throw error;
    console.error("Supabase upsertNote failed, fallback to file store in development:", error);
    const state = await readFileState();
    const existing = input.id ? state.notes.find((item) => item.id === input.id) : null;
    const folderName = input.folder.trim();
    let folderId = input.folderId ?? existing?.folderId ?? null;
    if (folderName) {
      const folder = await upsertFolder({ id: folderId ?? undefined, name: folderName });
      folderId = folder.id;
      const folderIndex = state.folders.findIndex((item) => item.id === folder.id);
      if (folderIndex >= 0) state.folders[folderIndex] = folder;
      else state.folders.push(folder);
    }
    const createdAt = input.createdAt ?? existing?.createdAt ?? new Date().toISOString();
    const note: Note = {
      id: input.id ?? randomUUID(),
      folderId,
      folder: input.folder.trim(),
      title: input.title,
      content: input.content,
      structuredSections: input.structuredSections ?? existing?.structuredSections ?? defaultStructuredSections(),
      createdAt,
      updatedAt: new Date().toISOString()
    };
    const index = state.notes.findIndex((item) => item.id === note.id);
    if (index >= 0) state.notes[index] = note;
    else state.notes.unshift(note);
    await appendNoteVersionForState(state, note);
    await writeFileState(state);
    return note;
  }
}

export async function updateNoteStructuredSections(noteId: string, sections: StructuredSections) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    const index = state.notes.findIndex((item) => item.id === noteId);
    if (index < 0) {
      return null;
    }
    state.notes[index] = { ...state.notes[index], structuredSections: sections, updatedAt: new Date().toISOString() };
    await appendNoteVersionForState(state, state.notes[index], "agent");
    await writeFileState(state);
    return state.notes[index];
  }

  const userId = await requireScopeUserId();

  try {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("Supabase client unavailable");

    const { data, error } = await client
      .from("notes")
      .update({ structured_sections: sections, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    const mapped = mapNoteFromDb(data as DbNote);
    await appendNoteVersion({
      noteId: mapped.id,
      userId,
      title: mapped.title,
      content: mapped.content,
      structuredSections: mapped.structuredSections,
      editor: "agent"
    });
    return mapped;
  } catch (error) {
    if (!DEV_FALLBACK) throw error;
    console.error("Supabase updateNoteStructuredSections failed, fallback to file store in development:", error);
    const state = await readFileState();
    const index = state.notes.findIndex((item) => item.id === noteId);
    if (index < 0) return null;
    state.notes[index] = { ...state.notes[index], structuredSections: sections, updatedAt: new Date().toISOString() };
    await appendNoteVersionForState(state, state.notes[index], "agent");
    await writeFileState(state);
    return state.notes[index];
  }
}

export async function listNoteVersions(noteId: string) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    return state.noteVersions
      .filter((item) => item.noteId === noteId)
      .sort((a, b) => b.versionNo - a.versionNo);
  }

  const userId = await requireScopeUserId();
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { data, error } = await client
    .from("note_versions")
    .select("*")
    .eq("user_id", userId)
    .eq("note_id", noteId)
    .order("version_no", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapNoteVersionFromDb(row as DbNoteVersion));
}

export async function restoreNoteVersion(noteId: string, versionId: string) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    const version = state.noteVersions.find((item) => item.id === versionId && item.noteId === noteId);
    if (!version) return null;
    const note = state.notes.find((item) => item.id === noteId);
    if (!note) return null;
    const restored: Note = {
      ...note,
      title: version.title,
      content: version.content,
      structuredSections: version.structuredSections,
      updatedAt: new Date().toISOString()
    };
    state.notes = state.notes.map((item) => (item.id === noteId ? restored : item));
    await appendNoteVersionForState(state, restored, "restore");
    await writeFileState(state);
    return restored;
  }

  const userId = await requireScopeUserId();
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase client unavailable");

  const { data: versionData, error: versionError } = await client
    .from("note_versions")
    .select("*")
    .eq("user_id", userId)
    .eq("note_id", noteId)
    .eq("id", versionId)
    .maybeSingle();
  if (versionError) throw new Error(versionError.message);
  if (!versionData) return null;
  const version = mapNoteVersionFromDb(versionData as DbNoteVersion);

  const { data: noteData, error: noteError } = await client
    .from("notes")
    .update({
      title: version.title,
      content: version.content,
      structured_sections: version.structuredSections,
      updated_at: new Date().toISOString()
    })
    .eq("id", noteId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (noteError) throw new Error(noteError.message);
  if (!noteData) return null;
  const mapped = mapNoteFromDb(noteData as DbNote);
  await appendNoteVersion({
    noteId: mapped.id,
    userId,
    title: mapped.title,
    content: mapped.content,
    structuredSections: mapped.structuredSections,
    editor: "restore"
  });
  return mapped;
}

export async function saveSettings(settings: AppSettings) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    state.settings = settings;
    await writeFileState(state);
    return settings;
  }

  const userId = await requireScopeUserId();

  try {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("Supabase client unavailable");

    const row = {
      id: "global",
      user_id: userId,
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
  } catch (error) {
    if (!DEV_FALLBACK) throw error;
    console.error("Supabase saveSettings failed, fallback to file store in development:", error);
    const state = await readFileState();
    state.settings = settings;
    await writeFileState(state);
    return settings;
  }
}

export async function appendMessages(messages: ChatMessage[]) {
  if (!isSupabaseEnabled()) {
    const state = await readFileState();
    state.messages.push(...messages);
    await writeFileState(state);
    return messages;
  }

  const userId = await requireScopeUserId();

  try {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("Supabase client unavailable");

    const rows = messages.map((message) => ({
      id: message.id,
      user_id: userId,
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
  } catch (error) {
    if (!DEV_FALLBACK) throw error;
    console.error("Supabase appendMessages failed, fallback to file store in development:", error);
    const state = await readFileState();
    state.messages.push(...messages);
    await writeFileState(state);
    return messages;
  }
}

function normalizeState(input: Partial<AppState>): AppState {
  const fallback = defaultState();

  return {
    folders: (input.folders ?? fallback.folders)
      .map((folder) => ({
        id: folder.id ?? randomUUID(),
        name: folder.name?.trim() || "Untitled Folder",
        createdAt: folder.createdAt ?? folder.updatedAt ?? new Date().toISOString(),
        updatedAt: folder.updatedAt ?? folder.createdAt ?? new Date().toISOString()
      }))
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    notes: (input.notes ?? fallback.notes).map((note) => {
      const legacy = splitLegacyTitle((note as Note & { title: string }).title);
      return {
        ...note,
        folderId: note.folderId ?? null,
        folder: (note.folder ?? legacy.folder).trim(),
        title: (note.title ?? legacy.title).trim() || "Untitled Note",
        createdAt: note.createdAt ?? note.updatedAt ?? new Date().toISOString(),
        updatedAt: note.updatedAt ?? note.createdAt ?? new Date().toISOString(),
        structuredSections: {
          ...defaultStructuredSections(),
          ...(note.structuredSections ?? {})
        }
      };
    }),
    noteVersions: (input.noteVersions ?? fallback.noteVersions).map((version, index) => ({
      id: version.id ?? randomUUID(),
      noteId: version.noteId,
      versionNo: version.versionNo ?? index + 1,
      title: version.title ?? "Untitled Note",
      content: version.content ?? "",
      structuredSections: { ...defaultStructuredSections(), ...(version.structuredSections ?? {}) },
      editor: version.editor ?? "unknown",
      createdAt: version.createdAt ?? new Date().toISOString()
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
