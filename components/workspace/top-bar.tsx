import { LogoutButton } from "@/components/logout-button";
import { IconChat, IconCompass, IconHistory, IconLayout, IconSettings, IconWrite } from "@/components/ui/icons";
import { LayoutPreset, LAYOUT_PRESET_LABEL } from "@/components/workspace/layout-presets";
import { Button } from "@/components/ui/button";

type TopBarProps = {
  status: string;
  layoutPreset: LayoutPreset;
  isCompact: boolean;
  onToggleSidebar: () => void;
  onPresetChange: (preset: LayoutPreset) => void;
  onToggleSettings: () => void;
};

export function TopBar({ status, layoutPreset, isCompact, onToggleSidebar, onPresetChange, onToggleSettings }: TopBarProps) {
  const isErrorStatus = /failed|error|exceeded|timeout/i.test(status);

  return (
    <header className="topBar card">
      <div className="topIdentity">
        {isCompact && <Button size="icon" variant="ghost" className="iconOnly mobileSidebarToggle" onClick={onToggleSidebar} title="Toggle sidebar"><IconLayout width={16} height={16} /></Button>}
        <div className="trafficLights" aria-hidden="true">
          <span className="trafficDot red" />
          <span className="trafficDot amber" />
          <span className="trafficDot green" />
        </div>
        <div className="productMark">
          <span className="productBadge"><IconCompass width={14} height={14} /></span>
          <div>
            <p className="productEyebrow">Workspace</p>
            <strong className="productTitle">Script Tequila</strong>
          </div>
        </div>
      </div>
      <div className="topControls">
        <div className={isErrorStatus ? "topStatus statusChip error" : "topStatus statusChip"}>{status}</div>
        <div className="topActions">
          <Button size="icon" variant="ghost" className={layoutPreset === "write" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => onPresetChange("write")} title={LAYOUT_PRESET_LABEL.write}><IconWrite width={16} height={16} /></Button>
          <Button size="icon" variant="ghost" className={layoutPreset === "write-assist" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => onPresetChange("write-assist")} title={LAYOUT_PRESET_LABEL["write-assist"]}><IconLayout width={16} height={16} /></Button>
          <Button size="icon" variant="ghost" className={layoutPreset === "chat" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => onPresetChange("chat")} title={LAYOUT_PRESET_LABEL.chat}><IconChat width={16} height={16} /></Button>
          <Button size="icon" variant="ghost" className={layoutPreset === "chat-reference" ? "iconOnly ghost active" : "iconOnly ghost"} onClick={() => onPresetChange("chat-reference")} title={LAYOUT_PRESET_LABEL["chat-reference"]}><IconHistory width={16} height={16} /></Button>
          <Button size="icon" variant="ghost" className="iconOnly ghost" onClick={onToggleSettings} title="Settings"><IconSettings width={16} height={16} /></Button>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
