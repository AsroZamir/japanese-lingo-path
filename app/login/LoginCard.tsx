"use client";

import { useState } from "react";
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
    const next = searchParams.get("next") ?? "/";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <section className="tutor-shell">
      <div className="brand-mark"><span>日</span></div>
      <span className="status-pill">Masuk untuk melanjutkan</span>
      <h2>Selamat datang di Japanese Lingo Path</h2>
      <p>Masuk dengan akun Google untuk menyimpan progres belajar Anda.</p>
      {errorParam && <p>{ERROR_MESSAGES[errorParam] ?? "Terjadi kesalahan. Silakan coba lagi."}</p>}
      <button className="primary-button" onClick={signInWithGoogle} disabled={pending}>
        {pending ? "Membuka Google…" : "Masuk dengan Google"} <span>→</span>
      </button>
    </section>
  );
}
