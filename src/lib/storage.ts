import type {
  AnalysisReport,
  HistoryRecord,
  ProviderSettings,
} from "../types";
import { emptyKnowledge } from "./knowledge";

const SETTINGS_KEY = "letsdate.settings.v1";
const HISTORY_KEY = "letsdate.history.v1";
const API_KEY = "letsdate.session-key.v1";

export const DEFAULT_SETTINGS: ProviderSettings = {
  provider: "demo",
  baseUrl: "",
  model: "内置演示分析",
  rememberKey: false,
  apiKey: "",
};

export function loadSettings(): ProviderSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored) as Partial<ProviderSettings>;
    const settings = { ...DEFAULT_SETTINGS, ...parsed };
    settings.apiKey =
      parsed.rememberKey && parsed.apiKey
        ? parsed.apiKey
        : sessionStorage.getItem(API_KEY) ?? "";
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ProviderSettings) {
  const safeSettings = {
    ...settings,
    apiKey: settings.rememberKey ? settings.apiKey : "",
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeSettings));
  if (settings.apiKey) {
    sessionStorage.setItem(API_KEY, settings.apiKey);
  } else {
    sessionStorage.removeItem(API_KEY);
  }
}

export function loadHistory(): HistoryRecord[] {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as unknown;
    if (!Array.isArray(stored)) return [];
    return stored.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as HistoryRecord;
      if (!record.report || typeof record.report !== "object") return [];
      const hydrateMbtiSummary = (
        person: HistoryRecord["report"]["person"],
      ) =>
        person?.mbti?.summary
          ? person
          : {
              ...person,
              mbti: {
                ...person.mbti,
                summary: person.mbti?.candidate
                  ? `当前最像 ${person.mbti.candidate} 倾向。旧版报告未保存判断说明，建议重新分析以更新。`
                  : "当前材料还不足以形成人格倾向。",
              },
            };
      return [
        {
          ...record,
          report: {
            ...record.report,
            knowledge: record.report.knowledge ?? emptyKnowledge(),
            person: hydrateMbtiSummary(record.report.person),
            self: hydrateMbtiSummary(record.report.self),
          },
        },
      ];
    });
  } catch {
    return [];
  }
}

export function saveReport(report: AnalysisReport): HistoryRecord[] {
  const record: HistoryRecord = {
    id: report.id,
    createdAt: report.createdAt,
    title: `${report.stage} · ${report.person.mbti.candidate}`,
    decision: report.decision,
    score: report.compatibilityScore,
    report,
  };
  const history = [
    record,
    ...loadHistory().filter((item) => item.id !== record.id),
  ].slice(0, 12);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function clearAllLocalData() {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(HISTORY_KEY);
  sessionStorage.removeItem(API_KEY);
}
