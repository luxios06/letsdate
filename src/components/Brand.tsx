export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <img src={`${import.meta.env.BASE_URL}brand-mark.svg`} alt="" className="brand__mark" />
      {!compact && (
        <div className="brand__type">
          <strong>letsdate</strong>
          <span>关系沟通画像</span>
        </div>
      )}
    </div>
  );
}
