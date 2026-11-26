import { History, ScanFace, Settings } from "lucide-react";
import type { View } from "../types";
import { Brand } from "./Brand";

interface MobileHeaderProps {
  view: View;
  onViewChange: (view: View) => void;
  onSettings: () => void;
}

export function MobileHeader({
  view,
  onViewChange,
  onSettings,
}: MobileHeaderProps) {
  return (
    <header className="mobile-header">
      <button
        type="button"
        className="mobile-header__brand"
        onClick={() => onViewChange("analyze")}
        title="返回分析"
      >
        <Brand />
      </button>
      <nav aria-label="移动端导航">
        <button
          type="button"
          className={view === "analyze" ? "is-active" : ""}
          onClick={() => onViewChange("analyze")}
          title="分析"
        >
          <ScanFace size={19} />
        </button>
        <button
          type="button"
          className={view === "history" ? "is-active" : ""}
          onClick={() => onViewChange("history")}
          title="历史"
        >
          <History size={19} />
        </button>
        <button type="button" onClick={onSettings} title="设置">
          <Settings size={19} />
        </button>
      </nav>
    </header>
  );
}
