import { LogoutButton } from "@/components/logout-button";
import { IconChat, IconHistory, IconLayout, IconSettings, IconWrite } from "@/components/ui/icons";
import { LayoutPreset, LAYOUT_PRESET_LABEL } from "@/components/workspace/layout-presets";

type TopBarProps = {
  status: string;
  layoutPreset: LayoutPreset;
  onPresetChange: (preset: LayoutPreset) => void;
  onToggleSettings: () => void;
};

export function TopBar({ status, layoutPreset, onPresetChange, onToggleSettings }: TopBarProps) {
  const isErrorStatus = /failed|error|exceeded|timeout/i.test(status);

  return (
    <header className="topBar card">
      <div className={isErrorStatus ? "topStatus error" : "topStatus"}>{status}</div>
      <div className="topActions">
        <button className={layoutPreset === "write" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => onPresetChange("write")} title={LAYOUT_PRESET_LABEL.write}><IconWrite width={16} height={16} /></button>
        <button className={layoutPreset === "write-assist" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => onPresetChange("write-assist")} title={LAYOUT_PRESET_LABEL["write-assist"]}><IconLayout width={16} height={16} /></button>
        <button className={layoutPreset === "chat" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => onPresetChange("chat")} title={LAYOUT_PRESET_LABEL.chat}><IconChat width={16} height={16} /></button>
        <button className={layoutPreset === "chat-reference" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => onPresetChange("chat-reference")} title={LAYOUT_PRESET_LABEL["chat-reference"]}><IconHistory width={16} height={16} /></button>
        <button className="iconOnly ghost" onClick={onToggleSettings} title="Settings"><IconSettings width={16} height={16} /></button>
        <LogoutButton />
      </div>
    </header>
  );
}
