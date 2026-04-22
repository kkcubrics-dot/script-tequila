"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";

import { AppState, AppSettings, ChatMessage, Note, Project } from "@/lib/types";

type WorkspaceProps = {
  initialState: AppState;
};

const quickPrompts = [
  "Rewrite the current note with sharper scene tension while preserving the core events.",
  "Break this scene into beats and call out where the emotional turn happens.",
  "Polish the dialogue so every line has subtext and a distinct character voice.",
  "Identify weak stakes, passive choices, and pacing drag in the current note."
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return (await response.json()) as T;
}

export function Workspace({ initialState }: WorkspaceProps) {
  const [projects, setProjects] = useState(initialState.projects);
  const [notes, setNotes] = useState(initialState.notes);
  const [messages, setMessages] = useState(initialState.messages);
  const [settings, setSettings] = useState(initialState.settings);
  const [activeTab, setActiveTab] = useState<"notes" | "chat" | "config">("notes");
  const [activeProjectId, setActiveProjectId] = useState(initialState.projects[0]?.id ?? "");
  const [activeNoteId, setActiveNoteId] = useState(
    initialState.notes.find((item) => item.projectId === initialState.projects[0]?.id)?.id ?? ""
  );
  const [chatInput, setChatInput] = useState("");
  const [includeNote, setIncludeNote] = useState(true);
  const [status, setStatus] = useState("Ready");
  const [isPending, startTransition] = useTransition();

  const activeProject = projects.find((item) => item.id === activeProjectId) ?? null;
  const activeProjectNotes = useMemo(
    () =>
      notes
        .filter((item) => item.projectId === activeProjectId)
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [activeProjectId, notes]
  );
  const activeNote =
    activeProjectNotes.find((item) => item.id === activeNoteId) ?? activeProjectNotes[0] ?? null;
  const activeMessages = messages.filter(
    (item) => item.projectId === activeProjectId && item.noteId === (activeNote?.id ?? null)
  );
  const lastAssistantMessage = [...activeMessages]
    .reverse()
    .find((item) => item.role === "assistant");
  const draftStats = useMemo(() => {
    const content = activeNote?.content.trim() ?? "";
    const words = content ? content.split(/\s+/).length : 0;
    const characters = content.length;
    const readMinutes = Math.max(1, Math.ceil(words / 180));

    return { words, characters, readMinutes };
  }, [activeNote?.content]);

  useEffect(() => {
    const firstNote = activeProjectNotes[0];
    if (firstNote && !activeNote) {
      setActiveNoteId(firstNote.id);
      return;
    }
    if (!firstNote && activeNoteId) {
      setActiveNoteId("");
    }
  }, [activeNote, activeNoteId, activeProjectNotes]);

  async function handleCreateProject() {
    const name = window.prompt("Project name", "New Notebook");
    if (!name?.trim()) {
      return;
    }

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
      title: "Untitled Note",
      content: ""
    });

    setProjects((current) => [project, ...current]);
    setNotes((current) => [note, ...current]);
    setActiveProjectId(project.id);
    setActiveNoteId(note.id);
    setActiveTab("notes");
    setStatus("Project created");
  }

  async function handleCreateNote() {
    if (!activeProjectId) {
      return;
    }

    const title = window.prompt("Note title", "Untitled Note");
    if (!title?.trim()) {
      return;
    }

    const note = await postJson<Note>("/api/notes", {
      projectId: activeProjectId,
      title: title.trim(),
      content: ""
    });

    setNotes((current) => [note, ...current]);
    setActiveNoteId(note.id);
    setStatus("Note created");
  }

  function handleNoteFieldChange(field: "title" | "content", value: string) {
    if (!activeNote) {
      return;
    }

    setNotes((current) =>
      current.map((item) => (item.id === activeNote.id ? { ...item, [field]: value } : item))
    );
  }

  function handleProjectFieldChange(field: keyof Pick<Project, "description" | "logline" | "genre" | "tone" | "targetLength">, value: string) {
    if (!activeProject) {
      return;
    }

    setProjects((current) =>
      current.map((item) => (item.id === activeProject.id ? { ...item, [field]: value } : item))
    );
  }

  function persistProject() {
    if (!activeProject) {
      return;
    }

    startTransition(async () => {
      setStatus("Saving project...");
      try {
        const saved = await postJson<Project>("/api/projects", activeProject);
        setProjects((current) => current.map((item) => (item.id === saved.id ? saved : item)));
        setStatus("Project saved");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Project save failed");
      }
    });
  }

  function persistNote() {
    if (!activeNote) {
      return;
    }

    startTransition(async () => {
      setStatus("Saving note...");
      try {
        const saved = await postJson<Note>("/api/notes", activeNote);
        setNotes((current) => current.map((item) => (item.id === saved.id ? saved : item)));
        setStatus("Note saved");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Note save failed");
      }
    });
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

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatInput.trim()) {
      return;
    }

    setStatus("Waiting for model...");
    const input = chatInput;
    setChatInput("");

    try {
      const response = await postJson<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        "/api/chat",
        {
          projectId: activeProjectId || null,
          noteId: activeNote?.id ?? null,
          message: input,
          includeNote
        }
      );
      setMessages((current) => [...current, response.userMessage, response.assistantMessage]);
      setStatus("Response received");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Chat failed");
    }
  }

  async function insertAssistantReply(replyText: string) {
    if (!activeNote) {
      setStatus("Select a note first");
      return;
    }

    const mergedContent = `${activeNote.content.trimEnd()}${
      activeNote.content.trim() ? "\n\n" : ""
    }${replyText.trim()}\n`;
    const draft: Note = { ...activeNote, content: mergedContent };

    setNotes((current) => current.map((item) => (item.id === draft.id ? draft : item)));
    setActiveTab("notes");
    setStatus("Inserting reply...");

    try {
      const saved = await postJson<Note>("/api/notes", draft);
      setNotes((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setStatus("Inserted into note");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Insert failed");
    }
  }

  function applyGeminiDefaults() {
    setSettings((current) => ({
      ...current,
      provider: "gemini",
      model: "gemini-2.5-flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai"
    }));
  }

  return (
    <main className="shell">
      <section className="panel sidebar">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Script Tequila</p>
            <h1>Projects</h1>
          </div>
          <button onClick={handleCreateProject}>New project</button>
        </div>

        <div className="list">
          {projects.map((project) => (
            <button
              key={project.id}
              className={project.id === activeProjectId ? "listItem active" : "listItem"}
              onClick={() => {
                setActiveProjectId(project.id);
                setActiveTab("notes");
              }}
            >
              <strong>{project.name}</strong>
              <span>{project.description || "No description yet"}</span>
            </button>
          ))}
        </div>

        <div className="panelHeader notesHeader">
          <h2>Notes</h2>
          <button onClick={handleCreateNote}>New note</button>
        </div>

        <div className="list">
          {activeProjectNotes.map((note) => (
            <button
              key={note.id}
              className={note.id === activeNote?.id ? "listItem active" : "listItem"}
              onClick={() => setActiveNoteId(note.id)}
            >
              <strong>{note.title}</strong>
              <span>{new Date(note.updatedAt).toLocaleString()}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel workspacePanel">
        <div className="panelHeader mainHeader">
          <div>
            <p className="eyebrow">Notebook IDE</p>
            <h2>{activeProject?.name ?? "No project"}</h2>
          </div>
          <div className="statusRow">
            <span>{status}</span>
            <button
              className="secondaryButton"
              onClick={persistNote}
              disabled={!activeNote || isPending}
            >
              Save note
            </button>
          </div>
        </div>

        <div className="tabBar" role="tablist" aria-label="Workspace views">
          <button
            type="button"
            className={activeTab === "notes" ? "tabButton active" : "tabButton"}
            onClick={() => setActiveTab("notes")}
          >
            Notes
          </button>
          <button
            type="button"
            className={activeTab === "chat" ? "tabButton active" : "tabButton"}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            type="button"
            className={activeTab === "config" ? "tabButton active" : "tabButton"}
            onClick={() => setActiveTab("config")}
          >
            Config
          </button>
        </div>

        {activeTab === "notes" ? (
          <section className="tabView noteView" aria-label="Notes view">
            {activeNote ? (
              <>
                <div className="noteHeader">
                  <input
                    className="titleInput"
                    value={activeNote.title}
                    onChange={(event) => handleNoteFieldChange("title", event.target.value)}
                    onBlur={persistNote}
                    placeholder="Note title"
                  />
                  <dl className="draftStats" aria-label="Draft statistics">
                    <div>
                      <dt>Words</dt>
                      <dd>{draftStats.words}</dd>
                    </div>
                    <div>
                      <dt>Chars</dt>
                      <dd>{draftStats.characters}</dd>
                    </div>
                    <div>
                      <dt>Read</dt>
                      <dd>{draftStats.readMinutes}m</dd>
                    </div>
                  </dl>
                </div>
                <textarea
                  className="noteArea"
                  value={activeNote.content}
                  onChange={(event) => handleNoteFieldChange("content", event.target.value)}
                  onBlur={persistNote}
                  placeholder="Write your notes here."
                />
              </>
            ) : (
              <div className="emptyState">Create a note to start drafting.</div>
            )}
          </section>
        ) : null}

        {activeTab === "chat" ? (
          <section className="tabView chatView" aria-label="Chat view">
            <div className="chatToolbar">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={includeNote}
                  onChange={(event) => setIncludeNote(event.target.checked)}
                />
                Include current note
              </label>
              <button
                type="button"
                className="secondaryButton"
                onClick={() => lastAssistantMessage && insertAssistantReply(lastAssistantMessage.content)}
                disabled={!lastAssistantMessage || !activeNote}
              >
                Insert last reply
              </button>
            </div>

            <div className="promptRail" aria-label="Quick prompts">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="promptButton"
                  type="button"
                  onClick={() => setChatInput(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="chatStream">
              {activeMessages.length === 0 ? (
                <div className="emptyState">
                  Ask for summaries, rewrites, or action items, then insert replies into notes.
                </div>
              ) : (
                activeMessages.map((message) => (
                  <article key={message.id} className={`bubble ${message.role}`}>
                    <span>{message.role}</span>
                    <p>{message.content}</p>
                    {message.role === "assistant" ? (
                      <button
                        type="button"
                        className="inlineAction"
                        onClick={() => insertAssistantReply(message.content)}
                        disabled={!activeNote}
                      >
                        Insert to note
                      </button>
                    ) : null}
                  </article>
                ))
              )}
            </div>

            <form className="chatForm" onSubmit={handleSendMessage}>
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Ask Gemini to rewrite, summarize, or brainstorm."
              />
              <button type="submit" disabled={isPending || !chatInput.trim()}>
                Send
              </button>
            </form>
          </section>
        ) : null}

        {activeTab === "config" ? (
          <section className="tabView configView" aria-label="Config view">
            <form className="settingsCard" onSubmit={handleSaveSettings}>
              <div className="settingsHeader">
                <h3>Model API</h3>
                <button type="button" className="secondaryButton" onClick={applyGeminiDefaults}>
                  Use Gemini defaults
                </button>
              </div>

              <div className="settingsGrid">
                <label>
                  API Key
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
                    placeholder="AIza... or compatible API key"
                  />
                </label>
                <label>
                  Model
                  <select
                    value={settings.model}
                    onChange={(event) => setSettings({ ...settings, model: event.target.value })}
                  >
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  </select>
                </label>
                <label>
                  Base URL
                  <input
                    value={settings.baseUrl}
                    onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })}
                  />
                </label>
              </div>

              <label>
                System Prompt
                <textarea
                  className="promptArea"
                  value={settings.systemPrompt}
                  onChange={(event) => setSettings({ ...settings, systemPrompt: event.target.value })}
                />
              </label>
              <button className="secondaryButton" type="submit" disabled={isPending}>
                Save config
              </button>
            </form>

            {activeProject ? (
              <section className="briefPanel" aria-label="Project brief">
                <div className="briefHeader">
                  <h3>Project Context</h3>
                  <button className="secondaryButton" type="button" onClick={persistProject} disabled={isPending}>
                    Save context
                  </button>
                </div>
                <div className="briefGrid">
                  <label>
                    Logline
                    <textarea
                      value={activeProject.logline}
                      onChange={(event) => handleProjectFieldChange("logline", event.target.value)}
                      onBlur={persistProject}
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={activeProject.description}
                      onChange={(event) => handleProjectFieldChange("description", event.target.value)}
                      onBlur={persistProject}
                    />
                  </label>
                  <label>
                    Genre
                    <input
                      value={activeProject.genre}
                      onChange={(event) => handleProjectFieldChange("genre", event.target.value)}
                      onBlur={persistProject}
                    />
                  </label>
                  <label>
                    Tone
                    <input
                      value={activeProject.tone}
                      onChange={(event) => handleProjectFieldChange("tone", event.target.value)}
                      onBlur={persistProject}
                    />
                  </label>
                  <label>
                    Target length
                    <input
                      value={activeProject.targetLength}
                      onChange={(event) => handleProjectFieldChange("targetLength", event.target.value)}
                      onBlur={persistProject}
                    />
                  </label>
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        <div className="statusFoot">
          <span>Provider: {settings.provider || "gemini"}</span>
          <span>Model: {settings.model}</span>
          <span>{activeProjectNotes.length} notes</span>
          <span>{activeMessages.length} chat messages</span>
        </div>
      </section>

      <section className="panel mobileConfigHint">
        <h3>Quick Config</h3>
        <p>Switch to the Config tab to update Gemini API settings.</p>
        <button type="button" onClick={() => setActiveTab("config")}>
          Open Config Tab
        </button>
      </section>
    </main>
  );
}
