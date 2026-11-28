import {
  BrainCircuit,
  History,
  LockKeyhole,
  ScanFace,
  Settings,
  Sparkles,
} from "lucide-react";
import type { ProviderSettings, View } from "../types";
import { PROVIDER_LABELS } from "../lib/providers";
import { Brand } from "./Brand";

interface SidebarProps {
  view: View;
  onViewChange: (view: View) => void;
  onSettings: () => void;
  settings: ProviderSettings;
  historyCount: number;
}

export function Sidebar({
  view,
  onViewChange,
  onSettings,
  settings,
  historyCount,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <Brand />
        <nav className="sidebar__nav" aria-label="主导航">
          <button
            type="button"
            className={`nav-item ${view === "analyze" ? "is-active" : ""}`}
            onClick={() => onViewChange("analyze")}
            title="分析"
          >
            <ScanFace size={18} strokeWidth={1.8} />
            <span>分析</span>
          </button>
          <button
            type="button"
            className={`nav-item ${view === "history" ? "is-active" : ""}`}
            onClick={() => onViewChange("history")}
            title="关系札记"
          >
            <History size={18} strokeWidth={1.8} />
            <span>历史</span>
            {historyCount > 0 && <em>{historyCount}</em>}
          </button>
          <button
            type="button"
            className={`nav-item ${view === "method" ? "is-active" : ""}`}
            onClick={() => onViewChange("method")}
            title="解读方法"
          >
            <BrainCircuit size={18} strokeWidth={1.8} />
            <span>方法</span>
          </button>
        </nav>
      </div>

      <div className="sidebar__bottom">
        <div className="connection-card">
          <div className="connection-card__icon">
            <Sparkles size={16} />
          </div>
          <div>
            <span>当前模型</span>
            <strong>{PROVIDER_LABELS[settings.provider]}</strong>
          </div>
          <span
            className={`status-dot ${settings.provider === "demo" ? "status-dot--demo" : ""}`}
            aria-label={settings.provider === "demo" ? "演示模式" : "已配置"}
          />
        </div>
        <button type="button" className="nav-item nav-item--muted" onClick={onSettings}>
          <Settings size={18} strokeWidth={1.8} />
          <span>模型与隐私</span>
        </button>
        <p className="sidebar__privacy">
          <LockKeyhole size={14} />
          材料仅发送到你选择的模型
        </p>
      </div>
    </aside>
  );
}
