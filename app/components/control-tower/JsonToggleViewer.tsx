"use client";

import { useState } from "react";
import { formatJson } from "../../lib/format";

type Props = {
  data: any;
  isSchema?: boolean;
  initialMode?: "readable" | "json";
  compact?: boolean;
};

function renderReadable(data: any, isSchema: boolean, depth = 0): React.ReactNode {
  if (data === null || data === undefined) return <span className="readable-val readable-val--null">null</span>;
  if (typeof data !== "object") {
    return <span className="readable-val">{String(data)}</span>;
  }

  if (isSchema && data.properties) {
    return (
      <div className="readable-dict">
        {Object.entries(data.properties).map(([key, val]: [string, any]) => (
          <div key={key} className="readable-row">
            <span className="readable-key">{key}</span>
            <span className="readable-val">
              {val.type} {val.description ? <span className="readable-desc">— {val.description}</span> : null}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="readable-val">[]</span>;
    return (
      <div className="readable-array">
        {data.map((item, i) => (
          <div key={i} className="readable-row">
            <span className="readable-key">[{i}]</span>
            <div className="readable-nested">{renderReadable(item, false, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  const keys = Object.keys(data);
  if (keys.length === 0) return <span className="readable-val">{"{}"}</span>;

  return (
    <div className="readable-dict">
      {keys.map((key) => (
        <div key={key} className="readable-row">
          <span className="readable-key">{key}</span>
          <div className="readable-nested">{renderReadable(data[key], false, depth + 1)}</div>
        </div>
      ))}
    </div>
  );
}

export function JsonToggleViewer({ data, isSchema = false, initialMode = "readable", compact = false }: Props) {
  const [mode, setMode] = useState<"readable" | "json">(initialMode);

  return (
    <div className={`json-toggle-wrapper ${compact ? "json-toggle-wrapper--compact" : ""}`}>
      <div className="json-toggle-header">
        <div className="json-toggle-switch">
          <button
            type="button"
            className={`json-toggle-btn ${mode === "readable" ? "json-toggle-btn--active" : ""}`}
            onClick={() => setMode("readable")}
          >
            Readable
          </button>
          <button
            type="button"
            className={`json-toggle-btn ${mode === "json" ? "json-toggle-btn--active" : ""}`}
            onClick={() => setMode("json")}
          >
            JSON
          </button>
        </div>
      </div>
      <div className="json-toggle-content">
        {mode === "json" ? (
          <pre className="json-toggle-pre">{formatJson(data, true)}</pre>
        ) : (
          <div className="readable-view">{renderReadable(data, isSchema)}</div>
        )}
      </div>
    </div>
  );
}
