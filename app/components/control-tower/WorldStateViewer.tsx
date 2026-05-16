"use client";

import type { WorldObject } from "../../../shared/contracts";
import { formatJson, formatTs } from "../../lib/format";

export function WorldStateViewer({
  objects,
  source,
}: {
  objects: WorldObject[] | undefined;
  source: "convex" | "mock";
}) {
  if (objects === undefined) {
    return (
      <div className="world-viewer world-viewer--loading" role="status">
        <p className="world-viewer__loading">Loading world objects…</p>
      </div>
    );
  }

  const typeCounts = new Map<string, number>();
  for (const o of objects) {
    typeCounts.set(o.type, (typeCounts.get(o.type) ?? 0) + 1);
  }

  return (
    <div className="world-viewer">
      <div className="world-viewer__summary">
        <div className="world-stat">
          <span className="world-stat__label">Objects</span>
          <span className="world-stat__value">{objects.length}</span>
        </div>
        <div className="world-stat">
          <span className="world-stat__label">Types</span>
          <span className="world-stat__value">{typeCounts.size}</span>
        </div>
        <div className="world-stat world-stat--wide">
          <span className="world-stat__label">Source</span>
          <span className="world-stat__value world-stat__value--muted">
            {source === "mock" ? "Mock (set NEXT_PUBLIC_CONVEX_URL)" : "Convex world:list"}
          </span>
        </div>
      </div>

      {typeCounts.size > 0 ? (
        <div className="world-viewer__chips" aria-label="Object types">
          {[...typeCounts.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([type, count]) => (
              <span key={type} className="world-chip">
                {type}
                <span className="world-chip__count">{count}</span>
              </span>
            ))}
        </div>
      ) : null}

      {objects.length === 0 ? (
        <div className="world-viewer__empty">
          <p>No world objects yet.</p>
          <p className="world-viewer__empty-hint">
            Run <code>kernel:seedDemo</code> to populate demo state.
          </p>
        </div>
      ) : (
        <ul className="world-card-list">
          {objects.map((obj) => (
            <li key={obj.id} className="world-card">
              <div className="world-card__header">
                <span className="world-card__key" title={obj.resourceKey}>
                  {obj.resourceKey}
                </span>
                <span className="world-card__type">{obj.type}</span>
              </div>
              <div className="world-card__meta">
                <span className="world-card__id" title={obj.id}>
                  id: {obj.id}
                </span>
                <span className="world-card__updated">updated {formatTs(obj.updatedAt)}</span>
              </div>
              <div className="world-state-rows">
                {Object.entries(obj.state).map(([k, v]) => (
                  <div key={k} className="world-state-row">
                    <span className="world-state-key">{k}</span>
                    <span className="world-state-val">{formatJson(v)}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
