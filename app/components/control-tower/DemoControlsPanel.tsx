"use client";

type Props = {
  disabled: boolean;
  pendingCountLabel: string;
  demoAgentId: string | null;
  onSeed: () => void | Promise<void>;
  onReset: () => void;
};

export function DemoControlsPanel({
  disabled,
  pendingCountLabel,
  demoAgentId,
  onSeed,
  onReset,
}: Props) {
  return (
    <section className="panel">
      <h2>Demo setup</h2>
      <p className="panel-subtitle">
        Load a safe sample world and a pretend agent, or clear everything to start over.{" "}
        <span className="text-muted text-muted--mono">kernel:seedDemo</span> ·{" "}
        <span className="text-muted text-muted--mono">kernel:resetDemo</span>
      </p>
      <div className="panel-actions panel-actions--demo-buttons">
        <button type="button" disabled={disabled} onClick={() => void onSeed()}>
          Start demo
        </button>
        <button type="button" className="btn-danger" disabled={disabled} onClick={onReset}>
          Reset demo
        </button>
      </div>
      {!disabled && demoAgentId ? (
        <p className="panel-hint">
          Below, <strong>Try an agent action</strong> tags each test run with this id so the backend knows which demo
          agent asked — copy it only if an external tool needs the same label:{" "}
          <code className="mono" title="Demo agent identifier for proposals from this page">
            {demoAgentId}
          </code>
        </p>
      ) : !disabled ? (
        <p className="panel-hint">
          Choose <strong>Start demo</strong> first. That creates the demo agent this page uses when you send a sample
          action.
        </p>
      ) : null}
      <p className="lead panel-actions-follow">
        {pendingCountLabel === "…" ? (
          <>Checking how many steps need your sign-off…</>
        ) : pendingCountLabel === "0" ? (
          <>
            Nothing is waiting for a human decision — <strong>0</strong> open requests.
          </>
        ) : (
          <>
            <strong>{pendingCountLabel}</strong> step{pendingCountLabel === "1" ? "" : "s"} need your decision — use the
            approval inbox below.
          </>
        )}
      </p>
      <p className="panel-hint">
        <strong>Reset demo</strong> removes sample data only (world snapshot, runs, approval queue). It does not turn
        off safety checks; the server still decides what is allowed.
      </p>
    </section>
  );
}
