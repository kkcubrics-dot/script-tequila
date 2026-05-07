import { useMemo, useState } from "react";
import { Note } from "@/lib/types";
import { IconEdit, IconFolder, IconMove, IconStar } from "@/components/ui/icons";

type Session = { id: string; updatedAt: string; preview: string; count: number };

type SidebarPaneProps = {
  isChatLayout: boolean;
  selectedFolder: string;
  setSelectedFolder: (v: string) => void;
  notes: Note[];
  folders: string[];
  activeNoteId?: string;
  favorites: Record<string, true>;
  sessions: Session[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onCreateNote: () => void;
  onToggleFavorite: (id: string) => void;
  onRenameNote: (note: Note) => void;
  onMoveNote: (note: Note) => void;
  onSelectNote: (id: string) => void;
};

export function SidebarPane(props: SidebarPaneProps) {
  const {
    isChatLayout,
    selectedFolder,
    setSelectedFolder,
    notes,
    folders,
    activeNoteId,
    favorites,
    sessions,
    activeSessionId,
    setActiveSessionId,
    onCreateFolder,
    onCreateNote,
    onToggleFavorite,
    onRenameNote,
    onMoveNote,
    onSelectNote
  } = props;

  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, true>>({});
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [pendingFolderName, setPendingFolderName] = useState("");

  const folderNames = useMemo(() => {
    const set = new Set<string>();
    folders.forEach((folder) => {
      if (folder.trim()) set.add(folder.trim());
    });
    notes.forEach((note) => {
      const folder = note.folder.trim();
      if (folder) set.add(folder);
    });
    return Array.from(set);
  }, [folders, notes]);

  const notesByFolder = useMemo(() => {
    const map = new Map<string, Note[]>();
    notes.forEach((note) => {
      const key = note.folder.trim();
      const list = map.get(key) ?? [];
      list.push(note);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));
    return map;
  }, [notes]);

  function commitCreateFolder() {
    const name = pendingFolderName.trim().replace(/^\/+|\/+$/g, "");
    if (!name) {
      setCreatingFolder(false);
      setPendingFolderName("");
      return;
    }
    onCreateFolder(name);
    setCreatingFolder(false);
    setPendingFolderName("");
  }

  function renderNoteRow(note: Note, left: number) {
    return (
      <div key={note.id} className={note.id === activeNoteId ? "noteRow active" : "noteRow"} style={{ marginLeft: `${left}px` }}>
        <button className="notePick" onClick={() => onSelectNote(note.id)}><strong>{note.title}</strong></button>
        <div className="miniActions">
          <button className={`iconBtn ${favorites[note.id] ? "activeStar" : ""}`} onClick={() => onToggleFavorite(note.id)} title="Favorite"><IconStar width={13} height={13} /></button>
          <button className="iconBtn" onClick={() => onRenameNote(note)} title="Rename" aria-label="Rename"><IconEdit width={13} height={13} /></button>
          <button className="iconBtn" onClick={() => onMoveNote(note)} title="Move" aria-label="Move"><IconMove width={13} height={13} /></button>
        </div>
      </div>
    );
  }

  return (
    <aside className="sidebar card">
      <header className="sidebarHead">
        <div>
          <p className="label">{isChatLayout ? "Conversations" : "Folder Tree"}</p>
          <h1>{isChatLayout ? "Recent Chats" : "Notes"}</h1>
        </div>
      </header>

      {isChatLayout ? (
        <section className="tree cardSoft">
          {sessions.map((session) => (
            <button key={session.id} className={activeSessionId === session.id ? "sessionItem active" : "sessionItem"} onClick={() => setActiveSessionId(session.id)}>
              <strong>{session.preview || "New chat"}</strong>
              <span>{new Date(session.updatedAt).toLocaleString()}</span>
            </button>
          ))}
        </section>
      ) : (
        <>
          <div className="treeActions">
            <button className="iconOnly ghost" onClick={() => { setCreatingFolder(true); setPendingFolderName(""); }} title="New folder" aria-label="New folder"><IconFolder width={15} height={15} /></button>
            <button className="iconOnly ghost" onClick={onCreateNote} title="New note" aria-label="New note"><IconEdit width={15} height={15} /></button>
          </div>

          <section className="tree cardSoft">
            {folderNames.map((folderName) => {
              const isCollapsed = !!collapsedFolders[folderName];
              const folderNotes = isCollapsed ? [] : (notesByFolder.get(folderName) ?? []);
              return (
                <div key={folderName}>
                  <button
                    className={selectedFolder === folderName ? "treeRow active folderRow" : "treeRow folderRow"}
                    onClick={() => setSelectedFolder(folderName)}
                    style={{ paddingLeft: "12px" }}
                  >
                    <span
                      className={isCollapsed ? "caret collapsed" : "caret"}
                      onClick={(event) => {
                        event.stopPropagation();
                        setCollapsedFolders((curr) => {
                          const next = { ...curr };
                          if (next[folderName]) delete next[folderName];
                          else next[folderName] = true;
                          return next;
                        });
                      }}
                    >
                      ▾
                    </span>
                    <span>{folderName}</span>
                  </button>
                  {folderNotes.map((note) => renderNoteRow(note, 26))}
                </div>
              );
            })}

            {(notesByFolder.get("") ?? []).map((note) => renderNoteRow(note, 12))}

            {creatingFolder && (
              <div className="treeRow folderInlineInput" style={{ paddingLeft: "12px" }}>
                <input
                  autoFocus
                  value={pendingFolderName}
                  onChange={(e) => setPendingFolderName(e.target.value)}
                  onBlur={commitCreateFolder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitCreateFolder();
                    if (e.key === "Escape") { setCreatingFolder(false); setPendingFolderName(""); }
                  }}
                  placeholder="New folder"
                />
              </div>
            )}
          </section>
        </>
      )}
    </aside>
  );
}
