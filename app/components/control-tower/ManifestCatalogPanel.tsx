"use client";

import type { ActionManifest } from "../../../shared/contracts";
import { formatJson } from "../../lib/format";

function riskClass(risk: ActionManifest["risk"]): string {
  if (risk === "HIGH") return "risk-badge risk-badge--high";
  if (risk === "MEDIUM") return "risk-badge risk-badge--medium";
  return "risk-badge risk-badge--low";
}

export function ManifestCatalogPanel({ manifests }: { manifests: ActionManifest[] | undefined }) {
  if (manifests === undefined) {
    return (
      <section className="panel panel--span">
        <h2>Action manifests</h2>
        <p className="panel-subtitle">Contract: manifests:list · Convex: api.manifests.list</p>
        <p className="panel-placeholder" role="status">
          Loading manifests…
        </p>
      </section>
    );
  }

  if (manifests.length === 0) {
    return (
      <section className="panel panel--span">
        <h2>Action manifests</h2>
        <p className="panel-subtitle">Contract: manifests:list · Convex: api.manifests.list</p>
        <p className="panel-placeholder">No manifests. Run kernel:seedDemo.</p>
      </section>
    );
  }

  return (
    <section className="panel panel--span">
      <h2>Action manifests</h2>
      <p className="panel-subtitle">Contract: manifests:list · Convex: api.manifests.list</p>
      <ul className="manifest-list">
        {manifests.map((m) => (
          <li key={m.id} className="manifest-card">
            <div className="manifest-card__header">
              <span className="manifest-card__name">{m.name}</span>
              <span className={riskClass(m.risk)}>{m.risk}</span>
            </div>
            <p className="manifest-card__desc">{m.description}</p>
            <div className="manifest-card__meta">
              <span className="manifest-meta-chip">resource: {m.resourceType}</span>
              <span className="manifest-meta-chip">
                approval: {m.requiresApproval ? "required" : "optional"}
              </span>
            </div>
            <div className="manifest-schema-grid">
              <div>
                <div className="manifest-schema-title">inputSchema</div>
                <pre className="manifest-schema-pre">{formatJson(m.inputSchema, true)}</pre>
              </div>
              <div>
                <div className="manifest-schema-title">outputSchema</div>
                <pre className="manifest-schema-pre">{formatJson(m.outputSchema, true)}</pre>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
