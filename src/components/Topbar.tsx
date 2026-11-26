import { LockKeyhole, Settings2, Sparkles } from "lucide-react";
import type { ProviderSettings } from "../types";
import { PROVIDER_LABELS } from "../lib/providers";

interface TopbarProps {
  title: string;
  eyebrow: string;
  settings: ProviderSettings;
  onSettings: () => void;
}

export function Topbar({ title, eyebrow, settings, onSettings }: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      <div className="topbar__actions">
        <span className="privacy-pill">
          <LockKeyhole size={14} />
          用户可控数据
        </span>
        <button type="button" className="provider-pill" onClick={onSettings}>
          <Sparkles size={14} />
          {PROVIDER_LABELS[settings.provider]}
          <Settings2 size={14} />
        </button>
      </div>
    </header>
  );
}
