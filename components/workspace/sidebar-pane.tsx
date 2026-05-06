import { Note } from "@/lib/types";
import { IconEdit, IconFolder, IconMove, IconPlus, IconStar } from "@/components/ui/icons";

type TreeFolder = { path: string; name: string; depth: number };
type Session = { id: string; updatedAt: string; preview: string; count: number };

type SidebarPaneProps = {
  isChatLayout: boolean;
  projects: Array<{ id: string; name: string }>;
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  noteSearch: string;
  setNoteSearch: (v: string) => void;
  selectedFolder: string;
  setSelectedFolder: (v: string) => void;
  folders: TreeFolder[];
  filteredNotes: Note[];
  activeNoteId?: string;
  favorites: Record<string, true>;
  sessions: Session[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string) => void;
  splitTitlePath: (title: string) => { folder: string; baseName: string };
  onCreateProject: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onToggleFavorite: (id: string) => void;
  onRenameNote: (note: Note) => void;
  onMoveNote: (note: Note) => void;
  onSelectNote: (id: string) => void;
};

export function SidebarPane(props: SidebarPaneProps) {
  const {
    isChatLayout, projects, activeProjectId, setActiveProjectId, noteSearch, setNoteSearch,
    selectedFolder, setSelectedFolder, folders, filteredNotes, activeNoteId, favorites,
    sessions, activeSessionId, setActiveSessionId, splitTitlePath,
    onCreateProject, onCreateFolder, onCreateNote, onToggleFavorite, onRenameNote, onMoveNote, onSelectNote
  } = props;

  return (
    <aside className="sidebar card">
      <header className="sidebarHead">
        <div>
          <p className="label">Script Tequila</p>
          <h1>{isChatLayout ? "Chat History" : "Project Tree"}</h1>
        </div>
        {!isChatLayout && <button className="iconOnly" onClick={onCreateProject} title="New project" aria-label="New project"><IconPlus width={15} height={15} /></button>}
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
          <section className="projectSwitch">
            {projects.map((project) => (
              <button
                key={project.id}
                className={project.id === activeProjectId ? "projectChip active" : "projectChip"}
                onClick={() => setActiveProjectId(project.id)}
              >
                {project.name}
              </button>
            ))}
          </section>

          <div className="treeActions">
            <button className="iconOnly ghost" onClick={onCreateFolder} title="New folder" aria-label="New folder"><IconFolder width={15} height={15} /></button>
            <button className="iconOnly ghost" onClick={onCreateNote} title="New note" aria-label="New note"><IconEdit width={15} height={15} /></button>
          </div>

          <input value={noteSearch} onChange={(e) => setNoteSearch(e.target.value)} placeholder="Search notes..." />

          <section className="tree cardSoft">
            <button className={selectedFolder === "" ? "treeRow active" : "treeRow"} onClick={() => setSelectedFolder("")}>All Notes</button>
            {folders.map((folder) => (
              <button key={folder.path} className={selectedFolder === folder.path ? "treeRow active" : "treeRow"} onClick={() => setSelectedFolder(folder.path)} style={{ paddingLeft: `${12 + folder.depth * 14}px` }}>{folder.name}</button>
            ))}
            {filteredNotes.map((note) => {
              const { baseName, folder } = splitTitlePath(note.title);
              return (
                <div key={note.id} className={note.id === activeNoteId ? "noteRow active" : "noteRow"}>
                  <button className="notePick" onClick={() => onSelectNote(note.id)}><strong>{baseName}</strong><span>{folder || "Root"}</span></button>
                  <div className="miniActions">
                    <button className={`iconBtn ${favorites[note.id] ? "activeStar" : ""}`} onClick={() => onToggleFavorite(note.id)} title="Favorite"><IconStar width={13} height={13} /></button>
                    <button className="iconBtn" onClick={() => onRenameNote(note)} title="Rename" aria-label="Rename"><IconEdit width={13} height={13} /></button>
                    <button className="iconBtn" onClick={() => onMoveNote(note)} title="Move" aria-label="Move"><IconMove width={13} height={13} /></button>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </aside>
  );
}
