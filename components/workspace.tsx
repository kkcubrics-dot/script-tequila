"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { postApi } from "@/lib/api-client";
import { AppState, AppSettings, ChatMessage, Note, Project } from "@/lib/types";
import { LayoutPreset } from "@/components/workspace/layout-presets";
import { TopBar } from "@/components/workspace/top-bar";
import { SidebarPane } from "@/components/workspace/sidebar-pane";
import { NotePane } from "@/components/workspace/note-pane";
import { ChatPane } from "@/components/workspace/chat-pane";

type WorkspaceProps = { initialState: AppState };
type TreeFolder = { path: string; name: string; depth: number };

const quickPrompts = [
  "总结当前笔记的结构问题并给出3条可执行修改。",
  "把这一段对白改成更有潜台词的版本。",
  "把当前场景拆成节拍并标注情绪转折。"
];

function splitTitlePath(title: string) {
  const parts = title.split("/").map((item) => item.trim()).filter(Boolean);
  if (parts.length <= 1) return { folder: "", baseName: title.trim() || "Untitled Note" };
  return { folder: parts.slice(0, -1).join("/"), baseName: parts[parts.length - 1] };
}

export function Workspace({ initialState }: WorkspaceProps) {
  const [projects, setProjects] = useState(initialState.projects);
  const [notes, setNotes] = useState(initialState.notes);
  const [messages, setMessages] = useState(initialState.messages);
  const [settings, setSettings] = useState(initialState.settings);
  const [activeProjectId, setActiveProjectId] = useState(initialState.projects[0]?.id ?? "");
  const [activeNoteId, setActiveNoteId] = useState(initialState.notes.find((n) => n.projectId === initialState.projects[0]?.id)?.id ?? "");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [includeNote, setIncludeNote] = useState(true);
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("write-assist");
  const [status, setStatus] = useState("Ready");
  const [noteSearch, setNoteSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [favorites, setFavorites] = useState<Record<string, true>>({});
  const [draftState, setDraftState] = useState<"saved" | "dirty" | "saving">("saved");
  const [selectionContext, setSelectionContext] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(true);
  const [isPending, startTransition] = useTransition();

  const projectNotes = useMemo(() => notes.filter((n) => n.projectId === activeProjectId), [activeProjectId, notes]);
  const folders = useMemo(() => {
    const set = new Set<string>();
    projectNotes.forEach((note) => {
      const { folder } = splitTitlePath(note.title);
      if (!folder) return;
      const chunks = folder.split("/");
      chunks.forEach((_, idx) => set.add(chunks.slice(0, idx + 1).join("/")));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b)).map((path) => ({ path, name: path.split("/").pop() || path, depth: path.split("/").length - 1 })) as TreeFolder[];
  }, [projectNotes]);

  const filteredNotes = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    return projectNotes.filter((note) => {
      const { folder, baseName } = splitTitlePath(note.title);
      const matchFolder = selectedFolder ? folder === selectedFolder || folder.startsWith(`${selectedFolder}/`) : true;
      const matchSearch = q ? baseName.toLowerCase().includes(q) || folder.toLowerCase().includes(q) || note.content.toLowerCase().includes(q) : true;
      return matchFolder && matchSearch;
    }).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [noteSearch, projectNotes, selectedFolder]);

  const activeNote = filteredNotes.find((n) => n.id === activeNoteId) ?? projectNotes.find((n) => n.id === activeNoteId) ?? filteredNotes[0] ?? null;
  const sessions = useMemo(() => {
    const scoped = messages.filter((m) => m.projectId === activeProjectId && m.sessionId);
    const map = new Map<string, { id: string; updatedAt: string; preview: string; count: number }>();
    scoped.forEach((msg) => {
      if (!msg.sessionId) return;
      const existing = map.get(msg.sessionId);
      const preview = msg.role === "user" && msg.content.trim() ? msg.content.trim().slice(0, 52) : existing?.preview || "New chat";
      if (!existing) map.set(msg.sessionId, { id: msg.sessionId, updatedAt: msg.createdAt, preview, count: 1 });
      else map.set(msg.sessionId, { ...existing, updatedAt: existing.updatedAt > msg.createdAt ? existing.updatedAt : msg.createdAt, preview, count: existing.count + 1 });
    });
    return Array.from(map.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [activeProjectId, messages]);

  const activeMessages = messages.filter((m) => m.projectId === activeProjectId && (m.sessionId ?? null) === (activeSessionId ?? null));
  const draftStats = useMemo(() => {
    const content = activeNote?.content.trim() ?? "";
    return { words: content ? content.split(/\s+/).length : 0, characters: content.length };
  }, [activeNote?.content]);

  useEffect(() => { if (!activeNote && filteredNotes[0]) setActiveNoteId(filteredNotes[0].id); }, [activeNote, filteredNotes]);
  useEffect(() => { if (!activeSessionId && sessions[0]) setActiveSessionId(sessions[0].id); }, [activeSessionId, sessions]);
  useEffect(() => { setShowRightDrawer(layoutPreset === "write-assist" || layoutPreset === "chat-reference"); }, [layoutPreset]);

  async function handleCreateProject() {
    try {
      const name = window.prompt("Project name", "New Project"); if (!name?.trim()) return;
      const project = await postApi<Project>("/api/projects", { name: name.trim(), description: "", logline: "", genre: "", tone: "", targetLength: "" });
      const note = await postApi<Note>("/api/notes", { projectId: project.id, title: "Drafts/Untitled Note", content: "" });
      setProjects((c) => [project, ...c]); setNotes((c) => [note, ...c]); setActiveProjectId(project.id); setActiveNoteId(note.id); setStatus("Project created");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Create project failed"); }
  }

  function handleCreateFolder() {
    const folder = window.prompt("Folder path", selectedFolder || "Drafts"); if (!folder?.trim()) return;
    setSelectedFolder(folder.trim().replace(/^\/+|\/+$/g, "")); setStatus("Folder selected");
  }

  async function handleCreateNote() {
    try {
      if (!activeProjectId) return;
      const title = window.prompt("Note title", "Untitled Note"); if (!title?.trim()) return;
      const fullTitle = selectedFolder ? `${selectedFolder}/${title.trim()}` : title.trim();
      const note = await postApi<Note>("/api/notes", { projectId: activeProjectId, title: fullTitle, content: "" });
      setNotes((c) => [note, ...c]); setActiveNoteId(note.id); setStatus("Note created");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Create note failed"); }
  }

  function handleToggleFavorite(noteId: string) { setFavorites((c) => { const n = { ...c }; if (n[noteId]) delete n[noteId]; else n[noteId] = true; return n; }); }
  function handleNoteFieldChange(field: "title" | "content", value: string) { if (!activeNote) return; setDraftState("dirty"); setNotes((c) => c.map((n) => (n.id === activeNote.id ? { ...n, [field]: value } : n))); }

  function persistNote() {
    if (!activeNote) return;
    startTransition(async () => {
      setDraftState("saving"); setStatus("Saving note...");
      try { const saved = await postApi<Note>("/api/notes", activeNote); setNotes((c) => c.map((n) => (n.id === saved.id ? saved : n))); setDraftState("saved"); setStatus("Note saved"); }
      catch (error) { setDraftState("dirty"); setStatus(error instanceof Error ? error.message : "Note save failed"); }
    });
  }

  async function handleRenameNote(note: Note) { const t = window.prompt("Rename note", note.title); if (!t?.trim() || t.trim() === note.title) return; const saved = await postApi<Note>("/api/notes", { ...note, title: t.trim() }); setNotes((c) => c.map((n) => (n.id === saved.id ? saved : n))); setStatus("Note renamed"); }
  async function handleMoveNote(note: Note) { const { folder, baseName } = splitTitlePath(note.title); const target = window.prompt("Move to folder", folder || "Drafts"); if (target === null) return; const saved = await postApi<Note>("/api/notes", { ...note, title: target.trim() ? `${target.trim()}/${baseName}` : baseName }); setNotes((c) => c.map((n) => (n.id === saved.id ? saved : n))); setStatus("Note moved"); }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setStatus("Saving settings...");
      try { const saved = await postApi<AppSettings>("/api/settings", settings); setSettings(saved); setStatus("Settings saved"); }
      catch (error) { setStatus(error instanceof Error ? error.message : "Settings save failed"); }
    });
  }

  function createSession() { const id = crypto.randomUUID(); setActiveSessionId(id); setChatInput(""); setLayoutPreset("chat"); setStatus("New chat created"); }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!chatInput.trim()) return;
    setStatus("Waiting for model..."); const input = chatInput; setChatInput("");
    try {
      const response = await postApi<{ userMessage: ChatMessage; assistantMessage: ChatMessage; sessionId: string }>("/api/chat", { projectId: activeProjectId || null, noteId: includeNote ? activeNote?.id ?? null : null, message: input, includeNote, sessionId: activeSessionId });
      setActiveSessionId(response.sessionId); setMessages((c) => [...c, response.userMessage, response.assistantMessage]); setStatus("Response received");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Chat failed"); }
  }

  async function insertAssistantReply(replyText: string, mode: "append" | "replace") {
    if (!activeNote) return;
    const selected = selectionContext.trim();
    const appended = `${activeNote.content.trimEnd()}${activeNote.content.trim() ? "\n\n" : ""}${replyText.trim()}\n`;
    const replaced = selected ? activeNote.content.replace(selected, replyText.trim()) : appended;
    const draft: Note = { ...activeNote, content: mode === "replace" ? replaced : appended };
    setNotes((c) => c.map((n) => (n.id === draft.id ? draft : n))); setLayoutPreset("write-assist");
    try { const saved = await postApi<Note>("/api/notes", draft); setNotes((c) => c.map((n) => (n.id === saved.id ? saved : n))); setStatus("Applied to note"); setDraftState("saved"); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Apply failed"); }
  }

  const workspaceClass = `workspace workspace-${layoutPreset}`;
  const isChatLayout = layoutPreset === "chat" || layoutPreset === "chat-reference";

  return (
    <main className={workspaceClass}>
      <TopBar status={status} layoutPreset={layoutPreset} onPresetChange={setLayoutPreset} onToggleSettings={() => setShowSettings((v) => !v)} />

      <SidebarPane
        isChatLayout={isChatLayout}
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        noteSearch={noteSearch}
        setNoteSearch={setNoteSearch}
        selectedFolder={selectedFolder}
        setSelectedFolder={setSelectedFolder}
        folders={folders}
        filteredNotes={filteredNotes}
        activeNoteId={activeNote?.id}
        favorites={favorites}
        sessions={sessions}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        splitTitlePath={splitTitlePath}
        onCreateProject={handleCreateProject}
        onCreateFolder={handleCreateFolder}
        onCreateNote={handleCreateNote}
        onToggleFavorite={handleToggleFavorite}
        onRenameNote={handleRenameNote}
        onMoveNote={handleMoveNote}
        onSelectNote={setActiveNoteId}
      />

      <NotePane
        isChatLayout={isChatLayout}
        showRightDrawer={showRightDrawer}
        activeNote={activeNote}
        selectionContext={selectionContext}
        draftState={draftState}
        draftStats={draftStats}
        isPending={isPending}
        onToggleDrawer={() => setShowRightDrawer((v) => !v)}
        onPersist={persistNote}
        onAskAI={() => { if (!selectionContext.trim()) return; setChatInput(`请改写这段内容并说明修改理由：\n\n${selectionContext.trim()}`); setLayoutPreset("chat"); }}
        onFieldChange={handleNoteFieldChange}
        onSelectText={setSelectionContext}
        splitTitlePath={splitTitlePath}
      />

      <ChatPane
        isChatLayout={isChatLayout}
        showRightDrawer={showRightDrawer}
        sessions={sessions}
        activeSessionId={activeSessionId}
        activeMessages={activeMessages}
        includeNote={includeNote}
        chatInput={chatInput}
        isPending={isPending}
        selectionContext={selectionContext}
        quickPrompts={quickPrompts}
        setActiveSessionId={setActiveSessionId}
        setIncludeNote={setIncludeNote}
        setChatInput={setChatInput}
        onCreateSession={createSession}
        onToggleDrawer={() => setShowRightDrawer((v) => !v)}
        onSend={handleSendMessage}
        onInsert={insertAssistantReply}
      />

      {showSettings && (
        <form className="settingsFloat card" onSubmit={handleSaveSettings}>
          <label className="controlLabel">API Key<input type="password" value={settings.apiKey} onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} /></label>
          <label className="controlLabel">Model<select value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}><option value="deepseek-v4-flash">deepseek-v4-flash</option><option value="deepseek-v4-pro">deepseek-v4-pro</option><option value="gpt-4o-mini">gpt-4o-mini</option><option value="gpt-4.1-mini">gpt-4.1-mini</option><option value="gpt-4.1">gpt-4.1</option></select></label>
          <label className="controlLabel">Base URL<input value={settings.baseUrl} onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })} /></label>
          <div className="headActions"><button className="ghost" type="button" onClick={() => setShowSettings(false)}>Close</button><button type="submit" disabled={isPending}>Save</button></div>
        </form>
      )}

      {!showRightDrawer && <button className="drawerToggle ghost" onClick={() => setShowRightDrawer(true)}>Open side panel</button>}
    </main>
  );
}
