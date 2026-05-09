import { Note } from "@/lib/types";
import { IconPanel, IconSave } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

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
  const paneClass = `writePane card ${isChatLayout && !showRightDrawer ? "collapsedPane" : ""} ${isChatLayout ? "paneSecondary" : "panePrimary"}`;
  const notePath = activeNote ? splitTitlePath(activeNote.title) : { folder: "", baseName: "" };
  const selectionChars = selectionContext.trim().length;

  return (
    <section className={paneClass}>
      <header className="paneHead">
        <div>
          <p className="label">{isChatLayout ? "Note Reference" : "Writing Desk"}</p>
          <h2>{activeNote ? notePath.baseName : "No note"}</h2>
        </div>
        <div className="headActions">
          <span className={draftState === "dirty" ? "statusPill warn" : "statusPill"}>{draftState === "dirty" ? "Unsaved" : draftState === "saving" ? "Saving..." : "Saved"}</span>
          <span className="statusPill">{draftStats.words} words</span>
          {!isChatLayout && selectionChars > 0 && <span className="statusPill active">{selectionChars} chars selected</span>}
          {!isChatLayout && <Button size="icon" variant="ghost" className="iconOnly ghost" onClick={onPersist} disabled={!activeNote || isPending} title="Save note"><IconSave width={15} height={15} /></Button>}
          <Button size="icon" variant="ghost" className="iconOnly ghost" onClick={onToggleDrawer} title="Toggle side panel"><IconPanel width={15} height={15} /></Button>
        </div>
      </header>

      {activeNote ? (
        <>
          <div className="noteMetaBar">
            <span className="noteMetaLabel">{activeNote.folder || "Loose draft"}</span>
            <span className="noteMetaLabel">{draftStats.characters} chars</span>
          </div>
          <input className="titleInput" value={activeNote.title} onChange={(e) => onFieldChange("title", e.target.value)} onBlur={onPersist} readOnly={isChatLayout} />
          <textarea className="editor" value={activeNote.content} onChange={(e) => onFieldChange("content", e.target.value)} onSelect={(e) => { const t = e.target as HTMLTextAreaElement; onSelectText(t.value.slice(t.selectionStart, t.selectionEnd)); }} onBlur={onPersist} readOnly={isChatLayout} placeholder="Write and edit your note here..." />
          {!isChatLayout && (
            <div className="assistRail cardSoft">
              <div>
                <strong>AI Assist</strong>
                <p>{selectionContext ? "Selected text is ready for a targeted pass." : "Highlight a section to ask for a tighter rewrite or analysis."}</p>
              </div>
              <div className="assistActions">
                <Button variant="ghost" className="ghost" onClick={onAskAI} disabled={!selectionContext.trim()}>Open in chat</Button>
                <Button size="icon" variant="ghost" className="iconOnly ghost" onClick={onToggleDrawer} title="Toggle side panel"><IconPanel width={15} height={15} /></Button>
              </div>
            </div>
          )}
        </>
      ) : <div className="empty">Select or create a note.</div>}
    </section>
  );
}
