export function Alert({ type = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && (
        <button type="button" className="alert__close" onClick={onClose} aria-label="Fechar aviso">×</button>
      )}
    </div>
  );
}
