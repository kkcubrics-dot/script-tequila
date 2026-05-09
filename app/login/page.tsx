"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [status, setStatus] = useState("Ready");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus(mode === "login" ? "Logging in..." : "Creating account...");

    const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const text = await res.text();
    if (!res.ok) {
      setStatus(text || "Auth failed");
      return;
    }

    setStatus("Success, redirecting...");
    router.push("/");
    router.refresh();
  }

  return (
    <main className="authShell">
      <section className="authIntro">
        <p className="label">Script Tequila</p>
        <h1>Bring calm structure to writing and AI direction.</h1>
        <p className="authLead">A focused desk for shaping notes, carrying context forward, and keeping every revision in motion.</p>
        <div className="authFeatureList">
          <div className="authFeature">
            <strong>Quiet workspace</strong>
            <span>Drafts, context, and revisions stay aligned.</span>
          </div>
          <div className="authFeature">
            <strong>Fast iteration</strong>
            <span>Push a note into chat, refine it, and bring the result back.</span>
          </div>
        </div>
      </section>
      <section className="authPanel card">
        <div className="authTabs" role="tablist" aria-label="Authentication mode">
          <button className={mode === "login" ? "authTab active" : "authTab"} type="button" onClick={() => setMode("login")}>Login</button>
          <button className={mode === "signup" ? "authTab active" : "authTab"} type="button" onClick={() => setMode("signup")}>Create account</button>
        </div>
        <div className="authHeading">
          <h2>{mode === "login" ? "Welcome back." : "Create your workspace."}</h2>
          <p>{mode === "login" ? "Sign in to continue your active desk." : "Set up an account to start writing and iterating."}</p>
        </div>
        <form className="authForm" onSubmit={submit}>
          <label className="controlLabel">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="controlLabel">
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="primaryAction authSubmit" type="submit">{mode === "login" ? "Login" : "Sign up"}</button>
        </form>
        <div className="authFoot">
          <button className="ghost authSwitch" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Need an account? Sign up" : "Have an account? Login"}
          </button>
          <p className="authStatus">{status}</p>
        </div>
      </section>
    </main>
  );
}
