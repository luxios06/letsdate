import {
  ArrowRight,
  CalendarDays,
  History,
  Sparkles,
  Trash2,
} from "lucide-react";
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
  return (
    <div className="page-view">
      <div className="page-view__intro">
        <div>
          <span className="index-label">History</span>
          <h2>你的关系观察记录</h2>
          <p>历史只保存在当前浏览器，用来比较不同时间点的变化。</p>
        </div>
        <button type="button" className="primary-button" onClick={onNew}>
          <Sparkles size={17} />
          新建分析
        </button>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <History size={26} />
          </div>
          <h3>还没有分析记录</h3>
          <p>第一次分析完成后，这里会出现可以回看的完整报告。</p>
          <button type="button" className="secondary-button" onClick={onNew}>
            开始第一次分析
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="history-list">
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
                  <strong>{record.title}</strong>
                  <em>{record.decision}</em>
                </div>
                <p>
                  <CalendarDays size={14} />
                  {fmtDate(record.createdAt)}
                  <span>·</span>
                  {record.report.interest.verdict}
                </p>
              </div>
              <ArrowRight size={18} />
            </button>
          ))}
          <button type="button" className="clear-history" onClick={onClear}>
            <Trash2 size={15} />
            清除全部历史
          </button>
        </div>
      )}
    </div>
  );
}
