import { FormEvent } from "react";
import { ChatMessage } from "@/lib/types";
import { IconInsert, IconPanel, IconPlus, IconReplace, IconSend } from "@/components/ui/icons";

type Session = { id: string; updatedAt: string; preview: string; count: number };

type ChatPaneProps = {
  isChatLayout: boolean;
  showRightDrawer: boolean;
  sessions: Session[];
  activeSessionId: string | null;
  activeMessages: ChatMessage[];
  includeNote: boolean;
  chatInput: string;
  isPending: boolean;
  selectionContext: string;
  quickPrompts: string[];
  setActiveSessionId: (id: string) => void;
  setIncludeNote: (v: boolean) => void;
  setChatInput: (v: string) => void;
  onCreateSession: () => void;
  onToggleDrawer: () => void;
  onSend: (e: FormEvent<HTMLFormElement>) => void;
  onInsert: (text: string, mode: "append" | "replace") => void;
};

export function ChatPane(props: ChatPaneProps) {
  const { isChatLayout, showRightDrawer, sessions, activeSessionId, activeMessages, includeNote, chatInput, isPending, selectionContext, quickPrompts, setActiveSessionId, setIncludeNote, setChatInput, onCreateSession, onToggleDrawer, onSend, onInsert } = props;
  const paneClass = `chatPane card ${!isChatLayout && !showRightDrawer ? "collapsedPane" : ""}`;

  return (
    <section className={paneClass}>
      <header className="paneHead">
        <div><p className="label">AI Chat</p><h2>Conversations</h2></div>
        <div className="headActions"><button className="iconOnly ghost" onClick={onCreateSession} title="New chat"><IconPlus width={15} height={15} /></button><button className="iconOnly ghost" onClick={onToggleDrawer} title="Toggle side panel"><IconPanel width={15} height={15} /></button></div>
      </header>

      <div className="chatLayout">
        {!isChatLayout && <aside className="sessionList cardSoft">{sessions.map((s) => <button key={s.id} className={activeSessionId === s.id ? "sessionItem active" : "sessionItem"} onClick={() => setActiveSessionId(s.id)}><strong>{s.preview || "New chat"}</strong><span>{new Date(s.updatedAt).toLocaleString()}</span></button>)}</aside>}

        <section className="chatMain">
          <div className="chatTools">
            <label className="toggle"><input type="checkbox" checked={includeNote} onChange={(e) => setIncludeNote(e.target.checked)} />Use current note as context</label>
          </div>

          <div className="promptRail">{quickPrompts.map((prompt) => <button key={prompt} className="promptBtn" onClick={() => setChatInput(prompt)}>{prompt}</button>)}</div>

          <div className="stream">
            {activeMessages.length === 0 ? <div className="empty">Start a new conversation.</div> : activeMessages.map((m) => (
              <article key={m.id} className={`bubble ${m.role}`}><span>{m.role}</span><p>{m.content}</p>{m.role === "assistant" && <div className="assistActions"><button className="iconOnly ghost" onClick={() => onInsert(m.content, "append")} title="Insert to note"><IconInsert width={14} height={14} /></button><button className="iconOnly ghost" onClick={() => onInsert(m.content, "replace")} disabled={!selectionContext.trim()} title="Replace selection"><IconReplace width={14} height={14} /></button></div>}</article>
            ))}
          </div>

          <form className="chatForm" onSubmit={onSend}><textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message AI..." /><button className="iconOnly" type="submit" disabled={!chatInput.trim() || isPending} title="Send"><IconSend width={14} height={14} /></button></form>
        </section>
      </div>
    </section>
  );
}
