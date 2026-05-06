"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";

import { AppState, AppSettings, ChatMessage, Note, Project } from "@/lib/types";

type WorkspaceProps = {
  initialState: AppState;
};

type ViewMode = "focus-write" | "focus-chat" | "split";
type TreeFolder = { path: string; name: string; depth: number };

const quickPrompts = [
  "总结当前笔记的结构问题并给出3条可执行修改。",
  "把这一段对白改成更有潜台词的版本。",
  "把当前场景拆成节拍并标注情绪转折。"
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { error?: { code?: string; message?: string } };
      if (payload.error?.message) message = payload.error.message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

function splitTitlePath(title: string) {
  const parts = title
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return { folder: "", baseName: title.trim() || "Untitled Note" };
  }
  return {
    folder: parts.slice(0, -1).join("/"),
    baseName: parts[parts.length - 1]
  };
}

function withFolder(title: string, folder: string) {
  const { baseName } = splitTitlePath(title);
  return folder.trim() ? `${folder.trim()}/${baseName}` : baseName;
}

export function Workspace({ initialState }: WorkspaceProps) {
  const [projects, setProjects] = useState(initialState.projects);
  const [notes, setNotes] = useState(initialState.notes);
  const [messages, setMessages] = useState(initialState.messages);
  const [settings, setSettings] = useState(initialState.settings);
  const [activeProjectId, setActiveProjectId] = useState(initialState.projects[0]?.id ?? "");
  const [activeNoteId, setActiveNoteId] = useState(
    initialState.notes.find((item) => item.projectId === initialState.projects[0]?.id)?.id ?? ""
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [includeNote, setIncludeNote] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("focus-write");
  const [status, setStatus] = useState("Ready");
  const [noteSearch, setNoteSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [favorites, setFavorites] = useState<Record<string, true>>({});
  const [draftState, setDraftState] = useState<"saved" | "dirty" | "saving">("saved");
  const [selectionContext, setSelectionContext] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeProject = projects.find((item) => item.id === activeProjectId) ?? null;
  const projectNotes = useMemo(
    () => notes.filter((item) => item.projectId === activeProjectId),
    [activeProjectId, notes]
  );

  const folders = useMemo(() => {
    const set = new Set<string>();
    projectNotes.forEach((note) => {
      const { folder } = splitTitlePath(note.title);
      if (!folder) return;
      const chunks = folder.split("/");
      chunks.forEach((_, idx) => set.add(chunks.slice(0, idx + 1).join("/")));
    });

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((path) => ({
        path,
        name: path.split("/").pop() || path,
        depth: path.split("/").length - 1
      })) as TreeFolder[];
  }, [projectNotes]);

  const filteredNotes = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    return projectNotes
      .filter((note) => {
        const { folder, baseName } = splitTitlePath(note.title);
        const matchFolder = selectedFolder ? folder === selectedFolder || folder.startsWith(`${selectedFolder}/`) : true;
        const matchSearch = q
          ? baseName.toLowerCase().includes(q) || folder.toLowerCase().includes(q) || note.content.toLowerCase().includes(q)
          : true;
        return matchFolder && matchSearch;
      })
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [noteSearch, projectNotes, selectedFolder]);

  const activeNote = filteredNotes.find((item) => item.id === activeNoteId) ?? projectNotes.find((item) => item.id === activeNoteId) ?? filteredNotes[0] ?? null;

  const sessions = useMemo(() => {
    const scoped = messages.filter((item) => item.projectId === activeProjectId && item.sessionId);
    const map = new Map<string, { id: string; updatedAt: string; preview: string; count: number }>();

    scoped.forEach((msg) => {
      if (!msg.sessionId) return;
      const existing = map.get(msg.sessionId);
      const preview = msg.role === "user" && msg.content.trim() ? msg.content.trim().slice(0, 52) : existing?.preview || "New chat";
      if (!existing) {
        map.set(msg.sessionId, { id: msg.sessionId, updatedAt: msg.createdAt, preview, count: 1 });
      } else {
        map.set(msg.sessionId, {
          ...existing,
          updatedAt: existing.updatedAt > msg.createdAt ? existing.updatedAt : msg.createdAt,
          preview,
          count: existing.count + 1
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [activeProjectId, messages]);

  const activeMessages = messages.filter(
    (item) => item.projectId === activeProjectId && (item.sessionId ?? null) === (activeSessionId ?? null)
  );

  const lastAssistantMessage = [...activeMessages].reverse().find((item) => item.role === "assistant");

  const draftStats = useMemo(() => {
    const content = activeNote?.content.trim() ?? "";
    const words = content ? content.split(/\s+/).length : 0;
    const characters = content.length;
    return { words, characters };
  }, [activeNote?.content]);

  const recentNotes = useMemo(
    () => [...projectNotes].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 8),
    [projectNotes]
  );

  useEffect(() => {
    if (!activeNote && filteredNotes[0]) setActiveNoteId(filteredNotes[0].id);
  }, [activeNote, filteredNotes]);

  useEffect(() => {
    if (!activeSessionId && sessions[0]) setActiveSessionId(sessions[0].id);
  }, [activeSessionId, sessions]);

  async function handleCreateProject() {
    const name = window.prompt("Project name", "New Project");
    if (!name?.trim()) return;

    const project = await postJson<Project>("/api/projects", {
      name: name.trim(),
      description: "",
      logline: "",
      genre: "",
      tone: "",
      targetLength: ""
    });
    const note = await postJson<Note>("/api/notes", {
      projectId: project.id,
      title: "Drafts/Untitled Note",
      content: ""
    });

    setProjects((current) => [project, ...current]);
    setNotes((current) => [note, ...current]);
    setActiveProjectId(project.id);
    setActiveNoteId(note.id);
    setStatus("Project created");
  }

  async function handleCreateFolder() {
    const folder = window.prompt("Folder path", selectedFolder || "Drafts");
    if (!folder?.trim()) return;
    setSelectedFolder(folder.trim().replace(/^\/+|\/+$/g, ""));
    setStatus("Folder selected");
  }

  async function handleCreateNote() {
    if (!activeProjectId) return;
    const title = window.prompt("Note title", "Untitled Note");
    if (!title?.trim()) return;

    const fullTitle = selectedFolder ? `${selectedFolder}/${title.trim()}` : title.trim();
    const note = await postJson<Note>("/api/notes", {
      projectId: activeProjectId,
      title: fullTitle,
      content: ""
    });

    setNotes((current) => [note, ...current]);
    setActiveNoteId(note.id);
    setStatus("Note created");
  }

  function handleToggleFavorite(noteId: string) {
    setFavorites((current) => {
      const next = { ...current };
      if (next[noteId]) delete next[noteId];
      else next[noteId] = true;
      return next;
    });
  }

  function handleNoteFieldChange(field: "title" | "content", value: string) {
    if (!activeNote) return;
    setDraftState("dirty");
    setNotes((current) => current.map((item) => (item.id === activeNote.id ? { ...item, [field]: value } : item)));
  }

  function persistNote() {
    if (!activeNote) return;

    startTransition(async () => {
      setDraftState("saving");
      setStatus("Saving note...");
      try {
        const saved = await postJson<Note>("/api/notes", activeNote);
        setNotes((current) => current.map((item) => (item.id === saved.id ? saved : item)));
        setDraftState("saved");
        setStatus("Note saved");
      } catch (error) {
        setDraftState("dirty");
        setStatus(error instanceof Error ? error.message : "Note save failed");
      }
    });
  }

  async function handleRenameNote(note: Note) {
    const nextTitle = window.prompt("Rename note", note.title);
    if (!nextTitle?.trim() || nextTitle.trim() === note.title) return;
    const saved = await postJson<Note>("/api/notes", { ...note, title: nextTitle.trim() });
    setNotes((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    setStatus("Note renamed");
  }

  async function handleMoveNote(note: Note) {
    const { folder, baseName } = splitTitlePath(note.title);
    const targetFolder = window.prompt("Move to folder", folder || "Drafts");
    if (targetFolder === null) return;
    const saved = await postJson<Note>("/api/notes", {
      ...note,
      title: targetFolder.trim() ? `${targetFolder.trim()}/${baseName}` : baseName
    });
    setNotes((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    setStatus("Note moved");
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setStatus("Saving settings...");
      try {
        const saved = await postJson<AppSettings>("/api/settings", settings);
        setSettings(saved);
        setStatus("Settings saved");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Settings save failed");
      }
    });
  }

  function createSession() {
    const id = crypto.randomUUID();
    setActiveSessionId(id);
    setChatInput("");
    setViewMode("focus-chat");
    setStatus("New chat created");
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatInput.trim()) return;

    setStatus("Waiting for model...");
    const input = chatInput;
    setChatInput("");

    try {
      const response = await postJson<{ userMessage: ChatMessage; assistantMessage: ChatMessage; sessionId: string }>(
        "/api/chat",
        {
          projectId: activeProjectId || null,
          noteId: includeNote ? activeNote?.id ?? null : null,
          message: input,
          includeNote,
          sessionId: activeSessionId
        }
      );
      setActiveSessionId(response.sessionId);
      setMessages((current) => [...current, response.userMessage, response.assistantMessage]);
      setStatus("Response received");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Chat failed");
    }
  }

  async function insertAssistantReply(replyText: string, mode: "append" | "replace") {
    if (!activeNote) return;

    const selected = selectionContext.trim();
    const appended = `${activeNote.content.trimEnd()}${activeNote.content.trim() ? "\n\n" : ""}${replyText.trim()}\n`;
    const replaced = selected ? activeNote.content.replace(selected, replyText.trim()) : appended;
    const content = mode === "replace" ? replaced : appended;
    const draft: Note = { ...activeNote, content };

    setNotes((current) => current.map((item) => (item.id === draft.id ? draft : item)));
    setViewMode("focus-write");

    try {
      const saved = await postJson<Note>("/api/notes", draft);
      setNotes((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setStatus("Applied to note");
      setDraftState("saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Apply failed");
    }
  }

  const workspaceClass = `workspace workspace-${viewMode}`;

  return (
    <main className={workspaceClass}>
      <aside className="sidebar card">
        <header className="sidebarHead">
          <div>
            <p className="label">Script Tequila</p>
            <h1>Project Tree</h1>
          </div>
          <button className="iconOnly" onClick={handleCreateProject} title="New project" aria-label="New project">＋</button>
        </header>

        <label className="controlLabel">
          Project
          <select value={activeProjectId} onChange={(e) => setActiveProjectId(e.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <div className="treeActions">
          <button className="iconOnly ghost" onClick={handleCreateFolder} title="New folder" aria-label="New folder">📁</button>
          <button className="iconOnly ghost" onClick={handleCreateNote} title="New note" aria-label="New note">📝</button>
        </div>

        <input
          value={noteSearch}
          onChange={(e) => setNoteSearch(e.target.value)}
          placeholder="Search notes..."
        />

        <section className="tree cardSoft">
          <button className={selectedFolder === "" ? "treeRow active" : "treeRow"} onClick={() => setSelectedFolder("")}>All Notes</button>
          {folders.map((folder) => (
            <button
              key={folder.path}
              className={selectedFolder === folder.path ? "treeRow active" : "treeRow"}
              onClick={() => setSelectedFolder(folder.path)}
              style={{ paddingLeft: `${12 + folder.depth * 14}px` }}
            >
              {folder.name}
            </button>
          ))}

          {filteredNotes.map((note) => {
            const { baseName, folder } = splitTitlePath(note.title);
            return (
              <div key={note.id} className={note.id === activeNote?.id ? "noteRow active" : "noteRow"}>
                <button className="notePick" onClick={() => setActiveNoteId(note.id)}>
                  <strong>{baseName}</strong>
                  <span>{folder || "Root"}</span>
                </button>
                <div className="miniActions">
                  <button className="iconBtn" onClick={() => handleToggleFavorite(note.id)} title="Favorite">{favorites[note.id] ? "★" : "☆"}</button>
                  <button className="iconBtn" onClick={() => handleRenameNote(note)} title="Rename" aria-label="Rename">✎</button>
                  <button className="iconBtn" onClick={() => handleMoveNote(note)} title="Move" aria-label="Move">↪</button>
                </div>
              </div>
            );
          })}
        </section>

        <section className="timeline cardSoft">
          <h3>Recent History</h3>
          {recentNotes.map((note) => {
            const { baseName } = splitTitlePath(note.title);
            return (
              <button key={note.id} className="timelineRow" onClick={() => setActiveNoteId(note.id)}>
                <strong>{baseName}</strong>
                <span>{new Date(note.updatedAt).toLocaleString()}</span>
              </button>
            );
          })}
        </section>
      </aside>

      <section className="writePane card">
        <header className="paneHead">
          <div>
            <p className="label">Human Workspace</p>
            <h2>{activeNote ? splitTitlePath(activeNote.title).baseName : "No note"}</h2>
          </div>
          <div className="headActions">
            <span className="status">{draftState === "dirty" ? "Unsaved" : draftState === "saving" ? "Saving..." : "Saved"}</span>
            <span className="status">{draftStats.words} words</span>
            <button className="iconOnly ghost" onClick={() => setViewMode("focus-write")} title="Set as main" aria-label="Set as main">◱</button>
            <button className="iconOnly ghost" onClick={persistNote} disabled={!activeNote || isPending} title="Save note" aria-label="Save note">✓</button>
          </div>
        </header>

        {activeNote ? (
          <>
            <input
              className="titleInput"
              value={activeNote.title}
              onChange={(e) => handleNoteFieldChange("title", e.target.value)}
              onBlur={persistNote}
            />
            <textarea
              className="editor"
              value={activeNote.content}
              onChange={(e) => handleNoteFieldChange("content", e.target.value)}
              onSelect={(e) => {
                const target = e.target as HTMLTextAreaElement;
                setSelectionContext(target.value.slice(target.selectionStart, target.selectionEnd));
              }}
              onBlur={persistNote}
              placeholder="Write and edit your note here..."
            />
            <div className="assistRail cardSoft">
              <div>
                <strong>AI Assist</strong>
                <p>{selectionContext ? "Selected text ready for AI context." : "Select text to ask targeted questions."}</p>
              </div>
              <div className="assistActions">
                <button className="ghost" onClick={() => {
                  if (!selectionContext.trim()) return;
                  setChatInput(`请改写这段内容并说明修改理由：\n\n${selectionContext.trim()}`);
                  setViewMode("focus-chat");
                }} disabled={!selectionContext.trim()}>
                  Ask AI
                </button>
                <button className="iconOnly ghost" onClick={() => setViewMode("split")} title="Split view" aria-label="Split view">⫴</button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty">Select or create a note.</div>
        )}
      </section>

      <section className="chatPane card">
        <header className="paneHead">
          <div>
            <p className="label">AI Chat</p>
            <h2>Conversations</h2>
          </div>
          <div className="headActions">
            <button className="iconOnly ghost" onClick={createSession} title="New chat" aria-label="New chat">＋</button>
            <button className="iconOnly ghost" onClick={() => setViewMode("focus-chat")} title="Set as main" aria-label="Set as main">◰</button>
            <button className="iconOnly ghost" onClick={() => setViewMode("split")} title="Split view" aria-label="Split view">⫴</button>
          </div>
        </header>

        <div className="chatLayout">
          <aside className="sessionList cardSoft">
            {sessions.map((session) => (
              <button
                key={session.id}
                className={activeSessionId === session.id ? "sessionItem active" : "sessionItem"}
                onClick={() => setActiveSessionId(session.id)}
              >
                <strong>{session.preview || "New chat"}</strong>
                <span>{new Date(session.updatedAt).toLocaleString()}</span>
              </button>
            ))}
          </aside>

          <section className="chatMain">
            <div className="chatTools">
              <label className="toggle">
                <input type="checkbox" checked={includeNote} onChange={(e) => setIncludeNote(e.target.checked)} />
                Bind current note context
              </label>
                <button className="iconOnly ghost" onClick={() => setShowSettings((v) => !v)} title="Model config" aria-label="Model config">⚙</button>
              </div>

            <div className="promptRail">
              {quickPrompts.map((prompt) => (
                <button key={prompt} className="promptBtn" onClick={() => setChatInput(prompt)}>{prompt}</button>
              ))}
            </div>

            <div className="stream">
              {activeMessages.length === 0 ? (
                <div className="empty">Start a new conversation.</div>
              ) : (
                activeMessages.map((message) => (
                  <article key={message.id} className={`bubble ${message.role}`}>
                    <span>{message.role}</span>
                    <p>{message.content}</p>
                    {message.role === "assistant" && (
                      <div className="assistActions">
                        <button className="iconOnly ghost" onClick={() => insertAssistantReply(message.content, "append")} title="Insert to note" aria-label="Insert to note">↓</button>
                        <button className="iconOnly ghost" onClick={() => insertAssistantReply(message.content, "replace")} disabled={!selectionContext.trim()} title="Replace selection" aria-label="Replace selection">⇄</button>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>

            <form className="chatForm" onSubmit={handleSendMessage}>
              <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message AI..." />
              <button className="iconOnly" type="submit" disabled={!chatInput.trim() || isPending} title="Send" aria-label="Send">➤</button>
            </form>

            {showSettings && (
              <form className="settings cardSoft" onSubmit={handleSaveSettings}>
                <label className="controlLabel">API Key<input type="password" value={settings.apiKey} onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} /></label>
                <label className="controlLabel">Model
                  <select value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}>
                    <option value="deepseek-v4-flash">deepseek-v4-flash</option>
                    <option value="deepseek-v4-pro">deepseek-v4-pro</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                    <option value="gpt-4.1">gpt-4.1</option>
                  </select>
                </label>
                <label className="controlLabel">Base URL<input value={settings.baseUrl} onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })} /></label>
                <button className="iconOnly ghost" type="submit" disabled={isPending} title="Save model config" aria-label="Save model config">✓</button>
              </form>
            )}
          </section>
        </div>
      </section>

      <footer className="topStatusBar">
        <div className="modeSwitcher">
          <button className={viewMode === "focus-write" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => setViewMode("focus-write")} title="Write mode" aria-label="Write mode">✍</button>
          <button className={viewMode === "split" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => setViewMode("split")} title="Split mode" aria-label="Split mode">⫴</button>
          <button className={viewMode === "focus-chat" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => setViewMode("focus-chat")} title="Chat mode" aria-label="Chat mode">◎</button>
        </div>
        <span>{status}</span>
        <span>{activeProject?.name || "No project"}</span>
      </footer>
    </main>
  );
}
