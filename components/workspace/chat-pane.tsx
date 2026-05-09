import { FormEvent, useState } from "react";
import { ChatMessage } from "@/lib/types";
import { IconAttachment, IconChevronDown, IconInsert, IconMic, IconPanel, IconPlus, IconReplace, IconSend, IconSpark } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  setActiveSessionId: (id: string) => void;
  setIncludeNote: (v: boolean) => void;
  setChatInput: (v: string) => void;
  onCreateSession: () => void;
  onToggleDrawer: () => void;
  onSend: (e: FormEvent<HTMLFormElement>) => void;
  onInsert: (text: string, mode: "append" | "replace") => void;
};

export function ChatPane(props: ChatPaneProps) {
  const { isChatLayout, showRightDrawer, sessions, activeSessionId, activeMessages, includeNote, chatInput, isPending, selectionContext, setActiveSessionId, setIncludeNote, setChatInput, onCreateSession, onToggleDrawer, onSend, onInsert } = props;
  const paneClass = `chatPane card ${!isChatLayout && !showRightDrawer ? "collapsedPane" : ""} ${isChatLayout ? "panePrimary" : "paneSecondary"}`;
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const [selectedModel, setSelectedModel] = useState("GPT-4.1");

  return (
    <section className={paneClass}>
      <header className="paneHead">
        <div>
          <p className="label">AI Chat</p>
          <h2>{activeSession?.preview || "Conversation studio"}</h2>
        </div>
        <div className="headActions"><Button size="icon" variant="ghost" className="iconOnly ghost" onClick={onCreateSession} title="New chat"><IconPlus width={15} height={15} /></Button><Button size="icon" variant="ghost" className="iconOnly ghost" onClick={onToggleDrawer} title="Toggle side panel"><IconPanel width={15} height={15} /></Button></div>
      </header>

      <div className="chatLayout">
        {!isChatLayout && (
          <aside className="sessionList cardSoft">
            {sessions.map((s) => (
              <button key={s.id} className={activeSessionId === s.id ? "sessionItem active" : "sessionItem"} onClick={() => setActiveSessionId(s.id)}>
                <div className="sessionMeta">
                  <strong>{s.preview || "New chat"}</strong>
                  <span>{s.count} turns</span>
                </div>
                <span>{new Date(s.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </button>
            ))}
          </aside>
        )}

        <section className="chatMain">
          {activeMessages.length === 0 && (
            <div className="promptRail">
              <Button className="promptBtn" variant="ghost" type="button" onClick={() => setChatInput("Refine the tone and sharpen the scene objective.")}><IconSpark width={13} height={13} />Refine scene</Button>
              <Button className="promptBtn" variant="ghost" type="button" onClick={() => setChatInput("Summarize the draft into 5 production notes.")}><IconSpark width={13} height={13} />Summarize notes</Button>
              <Button className="promptBtn" variant="ghost" type="button" onClick={() => setChatInput("Continue this thread with three stronger options.")}><IconSpark width={13} height={13} />Push alternatives</Button>
            </div>
          )}
          <div className="chatStatusRow">
            {includeNote && <span className="statusPill active">Using current note</span>}
            {selectionContext.trim() && <span className="statusPill">Selection ready</span>}
            {isPending && <span className="statusPill active thinkingPill">Model is thinking</span>}
          </div>
          <div className="stream">
            {activeMessages.length === 0 ? <div className="empty">Start a new conversation.</div> : activeMessages.map((m) => (
              <article key={m.id} className={`bubble ${m.role}`}>
                <span className="bubbleRole">{m.role === "assistant" ? "Assistant" : "You"}</span>
                <p>{m.content}</p>
                {m.role === "assistant" && <div className="assistActions"><Button size="icon" variant="ghost" className="iconOnly ghost" onClick={() => onInsert(m.content, "append")} title="Insert to note"><IconInsert width={14} height={14} /></Button><Button size="icon" variant="ghost" className="iconOnly ghost" onClick={() => onInsert(m.content, "replace")} disabled={!selectionContext.trim()} title="Replace selection"><IconReplace width={14} height={14} /></Button></div>}
              </article>
            ))}
          </div>

          <form className="chatForm" onSubmit={onSend}>
            <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask for the next change, pass, or rewrite." />
            <div className="composerFooter">
              <div className="composerLeft">
                <Button size="icon" variant="ghost" className="iconOnly ghost" type="button" title="Attach"><IconAttachment width={15} height={15} /></Button>
                <Button className={includeNote ? "composerChip active" : "composerChip"} variant="ghost" type="button" onClick={() => setIncludeNote(!includeNote)}>
                  <span>Current note</span>
                </Button>
              </div>
              <div className="composerRight">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="composerChip" variant="ghost" type="button"><span>{selectedModel}</span><IconChevronDown width={12} height={12} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Model</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedModel("GPT-4.1")}>GPT-4.1</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedModel("GPT-4.1 mini")}>GPT-4.1 mini</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedModel("gpt-4o-mini")}>gpt-4o-mini</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedModel("deepseek-v4-pro")}>deepseek-v4-pro</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="icon" variant="ghost" className="iconOnly ghost" type="button" title="Voice"><IconMic width={15} height={15} /></Button>
                <Button className={isPending ? "sendBtn pending" : "sendBtn"} variant="default" size="icon" type="submit" disabled={!chatInput.trim() || isPending} title="Send"><IconSend width={14} height={14} /></Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
