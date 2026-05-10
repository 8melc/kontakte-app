export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`sk-row ${i % 3 === 0 ? 'long' : i % 3 === 1 ? '' : 'short'}`} />
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
