"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "Impossibile completare l'accesso.");
        setLoading(false);
        return;
      }
    } catch (error) {
      setError(error instanceof Error && error.message.includes("NEXT_PUBLIC_SUPABASE_URL")
        ? "Manca NEXT_PUBLIC_SUPABASE_URL nelle variabili Vercel. Aggiungila come URL base del progetto e ridistribuisci l'app."
        : error instanceof Error && error.message.includes("chiave pubblica")
          ? "Manca una chiave pubblica NEXT_PUBLIC_SUPABASE_* nelle variabili Vercel. Aggiungila e ridistribuisci l'app."
          : error instanceof Error && error.message.includes("non configurato")
            ? "Configura le variabili pubbliche Supabase in Vercel, poi ridistribuisci l'app."
            : "Supabase Auth non è configurato correttamente.");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark"><Sparkles size={17} fill="currentColor" /></div>
          <div><p className="brand-name">Review Cards</p><p className="brand-subtitle">MANAGER</p></div>
        </div>
        <div className="login-heading">
          <div className="login-icon"><LockKeyhole size={19} /></div>
          <h1>Accedi al workspace</h1>
          <p>Inserisci le credenziali dell’amministratore.</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="form-label">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label className="form-label">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="primary-button login-submit" type="submit" disabled={loading}>{loading ? "Accesso in corso..." : "Accedi"}</button>
        </form>
      </section>
    </main>
  );
}
