import { useState, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { MapViewer } from "../src/index";

type AppState = { phase: "pick" } | { phase: "view"; source: string };

function FilePicker({ onLoad }: { onLoad: (content: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const readFile = useCallback((file: File) => {
    if (!file.name.endsWith(".gwmap")) {
      alert("Please select a .gwmap file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onLoad(e.target?.result as string);
    reader.readAsText(file);
  }, [onLoad]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }, [readFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }, [readFile]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 24 }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? "#3b82f6" : "#aaa"}`,
          borderRadius: 12,
          padding: "48px 64px",
          cursor: "pointer",
          background: dragging ? "#eff6ff" : "white",
          textAlign: "center",
          transition: "all 0.15s",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#333", marginBottom: 8 }}>Open a .gwmap file</div>
        <div style={{ fontSize: 14, color: "#666" }}>Click to browse, or drag & drop here</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".gwmap"
        style={{ display: "none" }}
        onChange={handleChange}
      />
    </div>
  );
}

function App() {
  const [state, setState] = useState<AppState>({ phase: "pick" });

  const handleLoad = useCallback((content: string) => {
    setState({ phase: "view", source: content });
  }, []);

  const handleReset = useCallback(() => {
    setState({ phase: "pick" });
  }, []);

  if (state.phase === "pick") {
    return <FilePicker onLoad={handleLoad} />;
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 16px", background: "white", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>ResortMap Viewer</span>
        <button
          onClick={handleReset}
          style={{ marginLeft: "auto", padding: "4px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6, border: "1px solid #d1d5db", background: "white" }}
        >
          Open another file
        </button>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <MapViewer source={state.source} />
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
