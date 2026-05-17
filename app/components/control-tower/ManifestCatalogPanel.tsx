"use client";

import type { ActionManifest } from "../../../shared/contracts";
import { formatJson } from "../../lib/format";

function riskClass(risk: ActionManifest["risk"]): string {
  if (risk === "HIGH") return "risk-badge risk-badge--high";
  if (risk === "MEDIUM") return "risk-badge risk-badge--medium";
  return "risk-badge risk-badge--low";
}

function riskPlain(risk: ActionManifest["risk"]): string {
  if (risk === "HIGH") return "High — usually needs a human sign-off";
  if (risk === "MEDIUM") return "Medium — review when unsure";
  return "Low — routine or read-only style";
}

export function ManifestCatalogPanel({ manifests }: { manifests: ActionManifest[] | undefined }) {
  if (manifests === undefined) {
    return (
      <section className="panel panel--span">
        <h2>What agents may do</h2>
        <p className="panel-subtitle--plain">Loading the catalog of allowed actions and how risky each one is…</p>
        <details className="developer-details">
          <summary>API reference</summary>
          <div className="developer-details__body">
            <p>
              <code className="mono">manifests.list</code>
            </p>
          </div>
        </details>
        <p className="panel-placeholder" role="status">
          Loading…
        </p>
      </section>
    );
  }

  if (manifests.length === 0) {
    return (
      <section className="panel panel--span">
        <h2>What agents may do</h2>
        <p className="panel-subtitle--plain">No actions are registered yet. Start the demo to load the sample catalog.</p>
        <details className="developer-details">
          <summary>API reference</summary>
          <div className="developer-details__body">
            <p>
              <code className="mono">manifests.list</code> · seed via <code className="mono">kernel.seedDemo</code>
            </p>
          </div>
        </details>
      </section>
    );
  }

  return (
    <section className="panel panel--span">
      <h2>What agents may do</h2>
      <p className="panel-subtitle--plain">
        Each card is one kind of request an agent can make. Risk level tells you how carefully to read it before
        approving.
      </p>
      <details className="developer-details">
        <summary>API reference</summary>
        <div className="developer-details__body">
          <p>
            <code className="mono">manifests.list</code>
          </p>
        </div>
      </details>
      <ul className="manifest-list">
        {manifests.map((m) => (
          <li key={m.id} className="manifest-card">
            <div className="manifest-card__header">
              <span className="manifest-card__name">{m.name}</span>
              <span className={riskClass(m.risk)} title={riskPlain(m.risk)}>
                {m.risk}
              </span>
            </div>
            <p className="manifest-card__desc">{m.description}</p>
            <p className="manifest-card__risk-blurb">
              <strong>Risk in plain words:</strong> {riskPlain(m.risk)}
            </p>
            <div className="manifest-card__meta">
              <span className="manifest-meta-chip">Touches: {m.resourceType}</span>
              <span className="manifest-meta-chip">
                Human approval: {m.requiresApproval ? "required for this demo" : "not required by default"}
              </span>
            </div>
            <details className="details-advanced">
              <summary className="details-advanced__summary">Technical: expected input and output shape</summary>
              <div className="details-advanced__body">
                <div className="manifest-schema-grid">
                  <div>
                    <div className="manifest-schema-title">Input shape (JSON schema)</div>
                    <pre className="manifest-schema-pre">{formatJson(m.inputSchema, true)}</pre>
                  </div>
                  <div>
                    <div className="manifest-schema-title">Output shape (JSON schema)</div>
                    <pre className="manifest-schema-pre">{formatJson(m.outputSchema, true)}</pre>
                  </div>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
