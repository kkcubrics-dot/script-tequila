"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { postApi } from "@/lib/api-client";
import { AppState, AppSettings, ChatMessage, Folder, Note } from "@/lib/types";
import { LayoutPreset } from "@/components/workspace/layout-presets";
import { TopBar } from "@/components/workspace/top-bar";
import { SidebarPane } from "@/components/workspace/sidebar-pane";
import { NotePane } from "@/components/workspace/note-pane";
import { ChatPane } from "@/components/workspace/chat-pane";
import { NoteActionDialog, NoteActionMode } from "@/components/workspace/note-action-dialog";
import { SettingsDialog } from "@/components/workspace/settings-dialog";

type WorkspaceProps = { initialState: AppState };

export function Workspace({ initialState }: WorkspaceProps) {
  const [notes, setNotes] = useState(initialState.notes);
  const [messages, setMessages] = useState(initialState.messages);
  const [settings, setSettings] = useState(initialState.settings);
  const [activeNoteId, setActiveNoteId] = useState(initialState.notes[0]?.id ?? "");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [includeNote, setIncludeNote] = useState(true);
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("write-assist");
  const [status, setStatus] = useState("Ready");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [foldersState, setFoldersState] = useState<Folder[]>(initialState.folders ?? []);
  const [favorites, setFavorites] = useState<Record<string, true>>({});
  const [draftState, setDraftState] = useState<"saved" | "dirty" | "saving">("saved");
  const [selectionContext, setSelectionContext] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [noteDialogMode, setNoteDialogMode] = useState<NoteActionMode>("create");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteDialogValue, setNoteDialogValue] = useState("");
  const [noteDialogTargetId, setNoteDialogTargetId] = useState<string | null>(null);
  const [noteDialogTargetFolder, setNoteDialogTargetFolder] = useState("");
  const [isPending, startTransition] = useTransition();

  const folders = useMemo(() => {
    const map = new Map<string, { createdAt: string; updatedAt: string }>();
    notes.forEach((note) => {
      const name = note.folder.trim();
      if (!name) return;
      const current = map.get(name);
      const nextMeta = {
        createdAt: current ? (current.createdAt < note.createdAt ? current.createdAt : note.createdAt) : note.createdAt,
        updatedAt: current ? (current.updatedAt > note.updatedAt ? current.updatedAt : note.updatedAt) : note.updatedAt
      };
      map.set(name, nextMeta);
    });
    foldersState.forEach((folder) => {
      const name = folder.name.trim();
      if (!name.trim()) return;
      const current = map.get(name);
      const meta = { createdAt: folder.createdAt, updatedAt: folder.updatedAt };
      if (!current) map.set(name, meta);
      else {
        map.set(name, {
          createdAt: current.createdAt < meta.createdAt ? current.createdAt : meta.createdAt,
          updatedAt: current.updatedAt > meta.updatedAt ? current.updatedAt : meta.updatedAt
        });
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => +new Date(a[1].createdAt) - +new Date(b[1].createdAt))
      .map(([name]) => name);
  }, [foldersState, notes]);

  function getUniqueFolderName(rawName: string) {
    const normalized = rawName.trim().replace(/^\/+|\/+$/g, "");
    if (!normalized) return "";

    const existing = new Set(
      Array.from(
        new Set(
          [...folders, ...foldersState.map((folder) => folder.name), ...notes.map((note) => note.folder)]
            .map((name) => name.trim())
            .filter(Boolean)
        )
      )
    );

    if (!existing.has(normalized)) return normalized;

    let index = 2;
    while (existing.has(`${normalized} (${index})`)) index += 1;
    return `${normalized} (${index})`;
  }

  const filteredNotes = useMemo(
    () =>
      notes
        .filter((note) => {
          if (!selectedFolder) return true;
          const folder = note.folder.trim();
          return folder === selectedFolder || folder.startsWith(`${selectedFolder}/`);
        })
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [notes, selectedFolder]
  );

  const activeNote = filteredNotes.find((n) => n.id === activeNoteId) ?? notes.find((n) => n.id === activeNoteId) ?? filteredNotes[0] ?? null;

  const sessions = useMemo(() => {
    const scoped = messages.filter((m) => m.sessionId);
    const map = new Map<string, { id: string; updatedAt: string; preview: string; count: number }>();
    scoped.forEach((msg) => {
      if (!msg.sessionId) return;
      const existing = map.get(msg.sessionId);
      const preview = msg.role === "user" && msg.content.trim() ? msg.content.trim().slice(0, 52) : existing?.preview || "New chat";
      if (!existing) map.set(msg.sessionId, { id: msg.sessionId, updatedAt: msg.createdAt, preview, count: 1 });
      else map.set(msg.sessionId, { ...existing, updatedAt: existing.updatedAt > msg.createdAt ? existing.updatedAt : msg.createdAt, preview, count: existing.count + 1 });
    });
    return Array.from(map.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [messages]);

  const activeMessages = messages.filter((m) => (m.sessionId ?? null) === (activeSessionId ?? null));
  const draftStats = useMemo(() => {
    const content = activeNote?.content.trim() ?? "";
    return { words: content ? content.split(/\s+/).length : 0, characters: content.length };
  }, [activeNote?.content]);

  useEffect(() => { if (!activeNote && filteredNotes[0]) setActiveNoteId(filteredNotes[0].id); }, [activeNote, filteredNotes]);
  useEffect(() => { if (!activeSessionId && sessions[0]) setActiveSessionId(sessions[0].id); }, [activeSessionId, sessions]);
  useEffect(() => { setShowRightDrawer(layoutPreset === "write-assist" || layoutPreset === "chat-reference"); }, [layoutPreset]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 960px)");
    function syncCompactState(nextCompact: boolean) {
      setIsCompact(nextCompact);
      setSidebarOpen((current) => (nextCompact ? current : false));
    }
    syncCompactState(media.matches);
    function handleChange(event: MediaQueryListEvent) {
      syncCompactState(event.matches);
    }
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  async function handleCreateFolder(name: string) {
    const uniqueName = getUniqueFolderName(name);
    if (!uniqueName) return;
    try {
      const folder = await postApi<Folder>("/api/folders", { name: uniqueName });
      setFoldersState((curr) => {
        const next = [...curr.filter((item) => item.id !== folder.id && item.name !== folder.name), folder];
        next.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        return next;
      });
      setSelectedFolder(folder.name);
      setStatus(uniqueName === name.trim() ? "Folder created" : `Folder created as ${uniqueName}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Create folder failed");
    }
  }

  async function createNoteWithTitle(title: string, folderPath?: string) {
    try {
      const targetFolderPath = (folderPath ?? selectedFolder).trim();
      const folder = foldersState.find((item) => item.name === targetFolderPath) ?? null;
      const note = await postApi<Note>("/api/notes", {
        folderId: folder?.id ?? null,
        folder: targetFolderPath,
        title: title.trim(),
        content: ""
      });
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

  async function renameNoteWithTitle(noteId: string, title: string) {
    const note = notes.find((item) => item.id === noteId);
    if (!note || !title.trim() || title.trim() === note.title) return;
    const saved = await postApi<Note>("/api/notes", { ...note, title: title.trim() });
    setNotes((c) => c.map((n) => (n.id === saved.id ? saved : n)));
    setStatus("Note renamed");
  }

  async function moveNoteToFolder(noteId: string, target: string) {
    const note = notes.find((item) => item.id === noteId);
    if (!note) return;
    const normalizedTarget = target.trim();
    const folder = foldersState.find((item) => item.name === normalizedTarget) ?? null;
    const saved = await postApi<Note>("/api/notes", { ...note, folderId: folder?.id ?? null, folder: normalizedTarget });
    setNotes((c) => c.map((n) => (n.id === saved.id ? saved : n)));
    setStatus("Note moved");
  }

  function openCreateNoteDialog(folderPath?: string) {
    setNoteDialogMode("create");
    setNoteDialogTargetId(null);
    setNoteDialogTargetFolder((folderPath ?? selectedFolder).trim());
    setNoteDialogValue("Untitled Note");
    setNoteDialogOpen(true);
  }

  function openRenameNoteDialog(note: Note) {
    setNoteDialogMode("rename");
    setNoteDialogTargetId(note.id);
    setNoteDialogValue(note.title);
    setNoteDialogOpen(true);
  }

  function openMoveNoteDialog(note: Note) {
    setNoteDialogMode("move");
    setNoteDialogTargetId(note.id);
    setNoteDialogValue(note.folder || "Drafts");
    setNoteDialogOpen(true);
  }

  async function handleNoteDialogSubmit(value: string) {
    if (noteDialogMode === "create") {
      await createNoteWithTitle(value, noteDialogTargetFolder);
      return;
    }
    if (!noteDialogTargetId) return;
    if (noteDialogMode === "rename") {
      await renameNoteWithTitle(noteDialogTargetId, value);
      return;
    }
    await moveNoteToFolder(noteDialogTargetId, value);
  }

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
      const response = await postApi<{ userMessage: ChatMessage; assistantMessage: ChatMessage; sessionId: string }>("/api/chat", { noteId: includeNote ? activeNote?.id ?? null : null, message: input, includeNote, sessionId: activeSessionId });
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
  const sidebarShellClass = isCompact ? `sidebarShell ${sidebarOpen ? "open" : ""}` : "sidebarShell";

  return (
    <main className={workspaceClass}>
      <TopBar
        status={status}
        layoutPreset={layoutPreset}
        isCompact={isCompact}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onPresetChange={setLayoutPreset}
        onToggleSettings={() => setShowSettings((v) => !v)}
      />

      <div className={sidebarShellClass}>
        <SidebarPane
          isChatLayout={isChatLayout}
          selectedFolder={selectedFolder}
          setSelectedFolder={(value) => {
            setSelectedFolder(value);
            if (isCompact) setSidebarOpen(false);
          }}
          notes={notes}
          folders={folders}
          activeNoteId={activeNote?.id}
          favorites={favorites}
          sessions={sessions}
          activeSessionId={activeSessionId}
          setActiveSessionId={(value) => {
            setActiveSessionId(value);
            if (isCompact) setSidebarOpen(false);
          }}
          onCreateFolder={handleCreateFolder}
          onCreateNote={(folderPath) => {
            openCreateNoteDialog(folderPath);
            if (isCompact) setSidebarOpen(false);
          }}
          onToggleFavorite={handleToggleFavorite}
          onRenameNote={openRenameNoteDialog}
          onMoveNote={openMoveNoteDialog}
          onSelectNote={(value) => {
            setActiveNoteId(value);
            if (isCompact) setSidebarOpen(false);
          }}
          onCreateSession={() => {
            createSession();
            if (isCompact) setSidebarOpen(false);
          }}
        />
      </div>
      {isCompact && sidebarOpen && <button className="sidebarScrim" type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />}

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
        splitTitlePath={() => ({ folder: activeNote?.folder ?? "", baseName: activeNote?.title ?? "" })}
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
        setActiveSessionId={setActiveSessionId}
        setIncludeNote={setIncludeNote}
        setChatInput={setChatInput}
        onCreateSession={createSession}
        onToggleDrawer={() => setShowRightDrawer((v) => !v)}
        onSend={handleSendMessage}
        onInsert={insertAssistantReply}
      />

      {!showRightDrawer && <button className="drawerToggle ghost" onClick={() => setShowRightDrawer(true)}>Open side panel</button>}
      <SettingsDialog
        open={showSettings}
        settings={settings}
        isPending={isPending}
        onOpenChange={setShowSettings}
        onChange={setSettings}
        onSubmit={handleSaveSettings}
      />
      <NoteActionDialog
        open={noteDialogOpen}
        mode={noteDialogMode}
        initialValue={noteDialogValue}
        title={noteDialogMode === "create" ? "Create note" : noteDialogMode === "rename" ? "Rename note" : "Move note"}
        description={
          noteDialogMode === "create"
            ? "Create a new note in the current folder."
            : noteDialogMode === "rename"
              ? "Update the title for this note."
              : "Move this note into another folder path."
        }
        confirmLabel={noteDialogMode === "create" ? "Create" : noteDialogMode === "rename" ? "Rename" : "Move"}
        onSubmit={handleNoteDialogSubmit}
        onOpenChange={setNoteDialogOpen}
      />
    </main>
  );
}
