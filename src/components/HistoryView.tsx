import {
  ArrowRight,
  CalendarDays,
  History,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { HistoryRecord } from "../types";

interface HistoryViewProps {
  history: HistoryRecord[];
  onSelect: (record: HistoryRecord) => void;
  onClear: () => void;
  onNew: () => void;
}

const fmtDate = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export function HistoryView({
  history,
  onSelect,
  onClear,
  onNew,
}: HistoryViewProps) {
  const [historyListRef] = useAutoAnimate<HTMLDivElement>({
    duration: 240,
    easing: "ease-out",
  });
  const trendById = new Map<
    string,
    { delta: number; sequence: number }
  >();
  const byRelationship = new Map<string, HistoryRecord[]>();
  [...history].reverse().forEach((record) => {
    const key = record.relationshipLabel || "未命名关系";
    const records = byRelationship.get(key) ?? [];
    records.push(record);
    byRelationship.set(key, records);
  });
  byRelationship.forEach((records) => {
    records.forEach((record, index) => {
      const previous = records[index - 1];
      trendById.set(record.id, {
        delta: previous ? record.score - previous.score : 0,
        sequence: index + 1,
      });
    });
  });

  return (
    <div className="page-view">
      <div className="page-view__intro">
        <div>
          <span className="index-label">Stories</span>
          <h2>那些被你认真看过的关系</h2>
          <p>同一段关系，会在不同的日子里显出不同的样子。这里替你把这些变化收好。</p>
        </div>
        <button type="button" className="primary-button" onClick={onNew}>
          <Sparkles size={17} />
          写下下一段
        </button>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <History size={26} />
          </div>
          <h3>这里还没有故事</h3>
          <p>等你第一次认真回看一段对话，它会在这里留下痕迹。</p>
          <button type="button" className="secondary-button" onClick={onNew}>
            写下第一段对话
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="history-list" ref={historyListRef}>
          {history.map((record) => (
            <button
              type="button"
              className="history-row"
              key={record.id}
              onClick={() => onSelect(record)}
            >
              <span className="history-row__score">
                {record.score}
                <small>/100</small>
              </span>
              <div className="history-row__copy">
                <div>
                  <strong>{record.relationshipLabel || "未命名关系"}</strong>
                  <em>{record.decision}</em>
                </div>
                <p>
                  <CalendarDays size={14} />
                  {fmtDate(record.createdAt)}
                  <span>·</span>
                  {record.report.stage} · {record.report.person.mbti.candidate}
                </p>
                <div className="history-row__trend">
                  <span>
                    第 {trendById.get(record.id)?.sequence ?? 1} 次观察
                  </span>
                  {(trendById.get(record.id)?.sequence ?? 1) > 1 && (
                    <span
                      className={
                        (trendById.get(record.id)?.delta ?? 0) >= 0
                          ? "is-up"
                          : "is-down"
                      }
                    >
                      较上次{" "}
                      {(trendById.get(record.id)?.delta ?? 0) >= 0 ? "+" : ""}
                      {trendById.get(record.id)?.delta ?? 0} 分
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight size={18} />
            </button>
          ))}
          <button type="button" className="clear-history" onClick={onClear}>
            <Trash2 size={15} />
            清空所有关系札记
          </button>
        </div>
      )}
    </div>
  );
}
