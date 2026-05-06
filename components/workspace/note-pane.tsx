import { Note } from "@/lib/types";
import { IconPanel, IconSave } from "@/components/ui/icons";

type NotePaneProps = {
  isChatLayout: boolean;
  showRightDrawer: boolean;
  activeNote: Note | null;
  selectionContext: string;
  draftState: "saved" | "dirty" | "saving";
  draftStats: { words: number; characters: number };
  isPending: boolean;
  onToggleDrawer: () => void;
  onPersist: () => void;
  onAskAI: () => void;
  onFieldChange: (field: "title" | "content", value: string) => void;
  onSelectText: (value: string) => void;
  splitTitlePath: (title: string) => { folder: string; baseName: string };
};

export function NotePane(props: NotePaneProps) {
  const { isChatLayout, showRightDrawer, activeNote, selectionContext, draftState, draftStats, isPending, onToggleDrawer, onPersist, onAskAI, onFieldChange, onSelectText, splitTitlePath } = props;
  const paneClass = `writePane card ${isChatLayout && !showRightDrawer ? "collapsedPane" : ""}`;

  return (
    <section className={paneClass}>
      <header className="paneHead">
        <div><p className="label">{isChatLayout ? "Note Reference" : "Human Workspace"}</p><h2>{activeNote ? splitTitlePath(activeNote.title).baseName : "No note"}</h2></div>
        <div className="headActions">
          <span className="status">{draftState === "dirty" ? "Unsaved" : draftState === "saving" ? "Saving..." : "Saved"}</span>
          <span className="status">{draftStats.words} words</span>
          {!isChatLayout && <button className="iconOnly ghost" onClick={onPersist} disabled={!activeNote || isPending} title="Save note"><IconSave width={15} height={15} /></button>}
          <button className="iconOnly ghost" onClick={onToggleDrawer} title="Toggle side panel"><IconPanel width={15} height={15} /></button>
        </div>
      </header>

      {activeNote ? (
        <>
          <input className="titleInput" value={activeNote.title} onChange={(e) => onFieldChange("title", e.target.value)} onBlur={onPersist} readOnly={isChatLayout} />
          <textarea className="editor" value={activeNote.content} onChange={(e) => onFieldChange("content", e.target.value)} onSelect={(e) => { const t = e.target as HTMLTextAreaElement; onSelectText(t.value.slice(t.selectionStart, t.selectionEnd)); }} onBlur={onPersist} readOnly={isChatLayout} placeholder="Write and edit your note here..." />
          {!isChatLayout && (
            <div className="assistRail cardSoft">
              <div><strong>AI Assist</strong><p>{selectionContext ? "Selected text ready for AI context." : "Select text to ask targeted questions."}</p></div>
              <div className="assistActions">
                <button className="ghost" onClick={onAskAI} disabled={!selectionContext.trim()}>Ask AI</button>
                <button className="iconOnly ghost" onClick={onToggleDrawer} title="Toggle side panel"><IconPanel width={15} height={15} /></button>
              </div>
            </div>
          )}
        </>
      ) : <div className="empty">Select or create a note.</div>}
    </section>
  );
}
