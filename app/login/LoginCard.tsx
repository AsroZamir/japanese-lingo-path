"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "Gagal masuk dengan Google. Silakan coba lagi.",
};

export function LoginCard() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const errorParam = searchParams.get("error");

  const signInWithGoogle = async () => {
    setPending(true);
    const supabase = createClient();
    const next = searchParams.get("next") ?? "/beranda";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <div className="login-page">
      <div className="login-card-wrap">
        <Link href="/" className="login-card__brand">Japanese Lingo Path</Link>
        <section className="login-card">
          <div className="login-card__mark"><span>日</span></div>
          <span className="login-card__pill">Masuk untuk melanjutkan</span>
          <h2>Selamat datang di Japanese Lingo Path</h2>
          <p>Masuk dengan akun Google untuk menyimpan progres belajar Anda.</p>
          {errorParam && <p className="login-card__error">{ERROR_MESSAGES[errorParam] ?? "Terjadi kesalahan. Silakan coba lagi."}</p>}
          <button className="login-card__submit" onClick={signInWithGoogle} disabled={pending}>
            {pending ? "Membuka Google…" : "Masuk dengan Google"} <span>→</span>
          </button>
        </section>
      </div>
    </div>
  );
}
