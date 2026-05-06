"use client";

import { FormEvent, useState } from "react";

type Props = { authenticated: boolean };

export function AdminDebugWorkbench({ authenticated }: Props) {
  const [authed, setAuthed] = useState(authenticated);
  const [key, setKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com/v1");
  const [model, setModel] = useState("deepseek-v4-flash");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("hello");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("Ready");

  async function login(e: FormEvent) {
    e.preventDefault();
    setStatus("Authenticating...");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key })
    });
    if (!res.ok) {
      const t = await res.text();
      setStatus(t || "Auth failed");
      return;
    }
    setAuthed(true);
    setStatus("Authenticated");
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setStatus("Logged out");
  }

  async function debugCall(e: FormEvent) {
    e.preventDefault();
    setStatus("Calling model...");
    setResult("");
    const res = await fetch("/api/admin/debug-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, model, apiKey, message })
    });
    const text = await res.text();
    if (!res.ok) {
      setStatus("Call failed");
      setResult(text);
      return;
    }
    setStatus("Call succeeded");
    setResult(text);
  }

  if (!authed) {
    return (
      <main className="workspace" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 560, margin: "0 auto" }}>
        <section className="card">
          <h2>Admin Debug Login</h2>
          <form className="chatForm" onSubmit={login}>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="ADMIN_DEBUG_KEY"
            />
            <button type="submit">Login</button>
          </form>
          <p>{status}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <section className="card">
        <div className="paneHead">
          <h2>Admin Debug Workbench</h2>
          <button className="ghost" onClick={logout}>Logout</button>
        </div>
        <form className="settings" onSubmit={debugCall}>
          <label className="controlLabel">
            Base URL
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </label>
          <label className="controlLabel">
            Model
            <input value={model} onChange={(e) => setModel(e.target.value)} />
          </label>
          <label className="controlLabel">
            API Key (optional)
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </label>
          <label className="controlLabel">
            Message
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <button type="submit">Call API</button>
        </form>
        <p>{status}</p>
        <pre className="cardSoft" style={{ whiteSpace: "pre-wrap", maxHeight: 420, overflow: "auto" }}>{result}</pre>
      </section>
    </main>
  );
}
