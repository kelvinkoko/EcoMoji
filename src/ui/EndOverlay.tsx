interface Props {
  reason: string;
  score: number;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function EndOverlay({ reason, score, onPlayAgain, onExit }: Props) {
  return (
    <div className="end-overlay">
      <div className="end-card">
        <h2>Game Over</h2>
        <p className="end-reason">{reason}</p>
        <p className="end-score">Score: {score} days</p>
        <div className="end-buttons">
          <button onClick={onPlayAgain}>Play Again</button>
          <button onClick={onExit}>Back to Menu</button>
        </div>
      </div>
    </div>
  );
}
