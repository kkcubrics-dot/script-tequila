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
    <main className="workspace" style={{ gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 560, margin: "0 auto" }}>
      <section className="card">
        <h2>{mode === "login" ? "Login" : "Create Account"}</h2>
        <form className="settings" onSubmit={submit}>
          <label className="controlLabel">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="controlLabel">
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit">{mode === "login" ? "Login" : "Sign up"}</button>
        </form>
        <button className="ghost" onClick={() => setMode(mode === "login" ? "signup" : "login")}> 
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Login"}
        </button>
        <p>{status}</p>
      </section>
    </main>
  );
}
