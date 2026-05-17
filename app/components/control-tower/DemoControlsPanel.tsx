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
      <h2>Get started</h2>
      <p className="panel-subtitle--plain">
        Load a safe sample workspace and a pretend agent, or clear everything to try again from scratch.
      </p>
      <div className="panel-actions panel-actions--demo-buttons">
        <button type="button" className="btn-primary" disabled={disabled} onClick={() => void onSeed()}>
          Start demo
        </button>
        <button type="button" className="btn-danger" disabled={disabled} onClick={onReset}>
          Reset demo
        </button>
      </div>
      {!disabled && demoAgentId ? (
        <p className="panel-hint">
          You are using a <strong>demo session label</strong> so the system can tie requests to this walkthrough. You
          only need to copy it if another tool asks for the same id:{" "}
          <code className="mono" title="Demo session identifier">
            {demoAgentId}
          </code>
        </p>
      ) : !disabled ? (
        <p className="panel-hint">
          Tap <strong>Start demo</strong> first — that creates the pretend agent used when you send a sample request
          below.
        </p>
      ) : null}
      <p className="lead panel-actions-follow">
        {pendingCountLabel === "…" ? (
          <>Checking how many items need your sign-off…</>
        ) : pendingCountLabel === "0" ? (
          <>
            Nothing is waiting for you — <strong>0</strong> open approvals.
          </>
        ) : (
          <>
            <strong>{pendingCountLabel}</strong> item{pendingCountLabel === "1" ? "" : "s"} need your decision — use the
            approval inbox below.
          </>
        )}
      </p>
      <details className="developer-details">
        <summary>Running the host-folder demo from a terminal</summary>
        <div className="developer-details__body">
          <p>
            See <code className="mono">docs/HOST_DEMO.md</code>. Typical flow: <code className="mono">npm run adapter</code>{" "}
            in one terminal and <code className="mono">npm run executor:run</code> in another. Convex stays the source of
            truth; the executor only completes <code className="mono">awaiting_host</code> steps.
          </p>
        </div>
      </details>
      <details className="developer-details">
        <summary>Kernel function names (Convex)</summary>
        <div className="developer-details__body">
          <p>
            Start / reset use <code className="mono">kernel.seedDemo</code> and <code className="mono">kernel.resetDemo</code>.
          </p>
        </div>
      </details>
    </section>
  );
}
