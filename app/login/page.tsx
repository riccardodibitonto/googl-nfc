"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Sparkles } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

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
      const { error: signInError } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message.includes("Invalid login credentials") ? "Email o password non valide." : "Impossibile completare l'accesso. Verifica la configurazione Supabase Auth.");
        setLoading(false);
        return;
      }
    } catch (error) {
      setError(error instanceof Error && error.message.includes("non configurato")
        ? "Configura NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nelle variabili Vercel, poi ridistribuisci l'app."
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
