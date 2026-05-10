export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button className="fab" aria-label="Hinzufügen" onClick={onClick}>
      +
    </button>
  );
}
