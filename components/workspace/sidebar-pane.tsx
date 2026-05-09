import { useEffect, useMemo, useState } from "react";
import { Note } from "@/lib/types";
import { IconChat, IconEdit, IconFolder, IconMove, IconSpark, IconStar } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupHeader,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem
} from "@/components/ui/sidebar";

type Session = { id: string; updatedAt: string; preview: string; count: number };
type FolderTreeNode = { name: string; path: string; children: FolderTreeNode[] };

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
  onCreateNote: (folderPath?: string) => void;
  onToggleFavorite: (id: string) => void;
  onRenameNote: (note: Note) => void;
  onMoveNote: (note: Note) => void;
  onSelectNote: (id: string) => void;
  onCreateSession: () => void;
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
    onSelectNote,
    onCreateSession
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

  const folderTree = useMemo(() => {
    const root = new Map<string, FolderTreeNode>();

    function ensureNode(container: Map<string, FolderTreeNode>, path: string, name: string) {
      const existing = container.get(path);
      if (existing) return existing;
      const node: FolderTreeNode = { name, path, children: [] };
      container.set(path, node);
      return node;
    }

    const ordered = [...folderNames].sort((a, b) => a.localeCompare(b));
    ordered.forEach((folderName) => {
      const parts = folderName.split("/").filter(Boolean);
      let parentMap = root;
      let parentNode: FolderTreeNode | null = null;
      parts.forEach((part, index) => {
        const path = parts.slice(0, index + 1).join("/");
        const current = ensureNode(parentMap, path, part);
        if (parentNode && !parentNode.children.includes(current)) parentNode.children.push(current);
        parentNode = current;
        parentMap = new Map(current.children.map((child) => [child.path, child]));
      });
    });

    function sortNodes(nodes: FolderTreeNode[]) {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((node) => sortNodes(node.children));
    }

    const tree = Array.from(root.values()).filter((node) => !node.path.includes("/"));
    sortNodes(tree);
    return tree;
  }, [folderNames]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("tequila.sidebar.collapsed");
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, true>;
      setCollapsedFolders(parsed);
    } catch {
      // Ignore invalid local storage payloads.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tequila.sidebar.collapsed", JSON.stringify(collapsedFolders));
  }, [collapsedFolders]);

  useEffect(() => {
    if (!selectedFolder) return;
    setCollapsedFolders((current) => {
      const segments = selectedFolder.split("/").filter(Boolean);
      if (segments.length === 0) return current;
      let changed = false;
      const next = { ...current };
      segments.forEach((_, index) => {
        const path = segments.slice(0, index + 1).join("/");
        if (next[path]) {
          delete next[path];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [selectedFolder]);

  useEffect(() => {
    const activeFolder = notes.find((note) => note.id === activeNoteId)?.folder.trim();
    if (!activeFolder) return;
    setCollapsedFolders((current) => {
      const segments = activeFolder.split("/").filter(Boolean);
      let changed = false;
      const next = { ...current };
      segments.forEach((_, index) => {
        const path = segments.slice(0, index + 1).join("/");
        if (next[path]) {
          delete next[path];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [activeNoteId, notes]);

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

  function formatRelativeTime(value: string) {
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.max(1, Math.floor(diff / 60000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  }

  function renderNoteRow(note: Note, depth: number) {
    return (
      <div key={note.id} className={note.id === activeNoteId ? "noteRow active treeLeaf" : "noteRow treeLeaf"} style={{ marginLeft: `${depth * 14 + 12}px` }}>
        <button className="notePick" onClick={() => onSelectNote(note.id)}>
          <strong>{note.title}</strong>
          <span>{formatRelativeTime(note.updatedAt)}</span>
        </button>
        <div className="miniActions">
          <Button size="icon" variant="ghost" className={`iconBtn ${favorites[note.id] ? "activeStar" : ""}`} onClick={() => onToggleFavorite(note.id)} title="Favorite"><IconStar width={13} height={13} /></Button>
          <Button size="icon" variant="ghost" className="iconBtn" onClick={() => onRenameNote(note)} title="Rename" aria-label="Rename"><IconEdit width={13} height={13} /></Button>
          <Button size="icon" variant="ghost" className="iconBtn" onClick={() => onMoveNote(note)} title="Move" aria-label="Move"><IconMove width={13} height={13} /></Button>
        </div>
      </div>
    );
  }

  function toggleFolder(path: string) {
    setCollapsedFolders((current) => {
      const next = { ...current };
      if (next[path]) delete next[path];
      else next[path] = true;
      return next;
    });
  }

  function renderFolderNode(node: FolderTreeNode, depth: number) {
    const isCollapsed = !!collapsedFolders[node.path];
    const childNotes = isCollapsed ? [] : (notesByFolder.get(node.path) ?? []);
    return (
      <SidebarMenuItem key={node.path} className="treeBranch">
        <div className={selectedFolder === node.path ? "treeRow active folderRow" : "treeRow folderRow"} style={{ paddingLeft: `${depth * 14 + 12}px` }}>
          <button
            className="folderPick"
            onClick={() => setSelectedFolder(node.path)}
          >
            <span
              className={isCollapsed ? "caret collapsed" : "caret"}
              onClick={(event) => {
                event.stopPropagation();
                toggleFolder(node.path);
              }}
            >
              ▾
            </span>
            <span className="folderName">{node.name}</span>
          </button>
          {!isChatLayout && (
            <Button
              size="icon"
              variant="ghost"
              className="iconBtn"
              title={`New note in ${node.name}`}
              aria-label={`New note in ${node.name}`}
              onClick={() => onCreateNote(node.path)}
            >
              <IconEdit width={13} height={13} />
            </Button>
          )}
        </div>
        {!isCollapsed && (
          <div className="treeChildren">
            {childNotes.map((note) => renderNoteRow(note, depth + 1))}
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar className="card">
      <SidebarHeader>
        <div className="sidebarBrand">
          <p className="label">Workspace</p>
          <strong>Script Tequila</strong>
        </div>
        <Button size="icon" variant="ghost" className="iconOnly ghost" onClick={onCreateSession} title="New chat" aria-label="New chat">
          <IconSpark width={15} height={15} />
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupHeader>
          <div>
            <p className="label">Folder Tree</p>
          </div>
          <div className="treeActions">
            <Button size="icon" variant="ghost" className="iconOnly ghost" onClick={() => { setCreatingFolder(true); setPendingFolderName(""); }} title="New folder" aria-label="New folder"><IconFolder width={15} height={15} /></Button>
            {!isChatLayout && <Button size="icon" variant="ghost" className="iconOnly ghost" onClick={() => onCreateNote(selectedFolder)} title="New note" aria-label="New note"><IconEdit width={15} height={15} /></Button>}
          </div>
          </SidebarGroupHeader>
          <SidebarMenu>
          {folderTree.map((node) => renderFolderNode(node, 0))}
          {(notesByFolder.get("") ?? []).map((note) => renderNoteRow(note, 0))}

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
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupHeader className="sidebarSectionSpacer">
          <div>
            <p className="label">Recent chats</p>
          </div>
          <Button size="icon" variant="ghost" className="iconOnly ghost" onClick={onCreateSession} title="New chat" aria-label="New chat"><IconChat width={15} height={15} /></Button>
          </SidebarGroupHeader>
          <SidebarMenu>
          {sessions.length === 0 ? <div className="empty">No chat history yet.</div> : sessions.map((session) => (
            <button key={session.id} className={activeSessionId === session.id ? "sessionItem active" : "sessionItem"} onClick={() => setActiveSessionId(session.id)}>
              <div className="sessionMeta">
                <strong>{session.preview || "New chat"}</strong>
                <span>{session.count} turns</span>
              </div>
              <span>{formatRelativeTime(session.updatedAt)}</span>
            </button>
          ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
