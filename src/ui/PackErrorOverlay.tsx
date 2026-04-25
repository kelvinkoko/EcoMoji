interface Props {
  error: string;
  onRetry: () => void;
}

export function PackErrorOverlay({ error, onRetry }: Props) {
  return (
    <div className="pack-error">
      <div className="pack-error-card">
        <h2>⚠️ Config error</h2>
        <p>The game config could not be loaded.</p>
        <pre>{error}</pre>
        <p className="hint">
          Edit the JSON files in <code>public/config/</code> and click Retry. No rebuild needed.
        </p>
        <button onClick={onRetry}>Retry</button>
      </div>
    </div>
  );
}
