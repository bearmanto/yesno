"use client";

import { useState } from "react";
import { getClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const supabase = getClient();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm your account (if confirmations are enabled). Then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 420 }}>
      <h1>{mode === "signup" ? "Create account" : "Sign in"}</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          <div>Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
            placeholder="you@example.com"
          />
        </label>
        <label>
          <div>Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: "100%", padding: 8 }}
            placeholder="••••••••"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px 12px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Working..." : mode === "signup" ? "Sign up" : "Sign in"}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        {mode === "signup" ? (
          <button onClick={() => setMode("signin")} style={{ textDecoration: "underline" }}>
            Already have an account? Sign in
          </button>
        ) : (
          <button onClick={() => setMode("signup")} style={{ textDecoration: "underline" }}>
            New user? Create an account
          </button>
        )}
      </div>

      {message && (
        <p style={{ marginTop: 12, color: "crimson" }}>
          {message}
        </p>
      )}

      <p style={{ marginTop: 24 }}>
        <Link href="/">← Back home</Link>
      </p>
    </main>
  );
}
