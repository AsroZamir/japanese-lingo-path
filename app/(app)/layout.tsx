"use client";

import { usePathname, useRouter } from "next/navigation";
import { mockUser } from "@/app/lib/mock-user";
import { streak, reviewSummary } from "@/app/lib/mock-data";
import { ToastProvider, useToast } from "./_components/toast-provider";

type NavItem = { id: string; icon: string; label: string; path: string; badge?: string };

const navItems: NavItem[] = [
  { id: "dashboard", icon: "⌂", label: "Beranda", path: "/" },
  { id: "learn", icon: "道", label: "Belajar", path: "/belajar" },
  { id: "practice", icon: "練", label: "Latihan", path: "/latihan" },
  { id: "review", icon: "↻", label: "Ulangi", path: "/ulangi", badge: String(reviewSummary.dueNow) },
  { id: "tutor", icon: "✦", label: "AI Tutor", path: "/ai-tutor" },
  { id: "conversation", icon: "話", label: "Percakapan", path: "/percakapan" },
  { id: "jlpt", icon: "的", label: "JLPT", path: "/jlpt" },
  { id: "progress", icon: "↗", label: "Progres", path: "/progres" },
];

function isNavItemActive(pathname: string, item: NavItem) {
  if (item.id === "learn") return pathname === "/belajar" || pathname.startsWith("/belajar/");
  return pathname === item.path;
}

function Brand() {
  return (
    <div className="brand" aria-label="Japanese Lingo Path">
      <div className="brand-mark"><span>日</span></div>
      <div className="brand-name"><small>Japanese</small><strong>Lingo <em>Path</em></strong></div>
    </div>
  );
}

function NotificationBell() {
  const notify = useToast();
  return <button className="icon-button" aria-label="Notifikasi" onClick={() => notify("Tidak ada notifikasi baru.")}>◦</button>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const go = (path: string) => { router.push(path); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main navigation">
          <p className="nav-label">PERJALANAN ANDA</p>
          {navItems.map((item) => (
            <button className={`nav-item ${isNavItemActive(pathname, item) ? "active" : ""}`} onClick={() => go(item.path)} key={item.id}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="streak-card"><span className="streak-flame">火</span><div><strong>{streak.days} hari beruntun</strong><small>Pertahankan ritme belajar!</small></div></div>
          <button className="profile-row" onClick={() => go("/pengaturan")}><div className="avatar">{mockUser.initials}</div><div><strong>{mockUser.name}</strong><small>{mockUser.level}</small></div><span>•••</span></button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => go("/")}><span>日</span> Japanese Lingo Path</button>
          <span className="prototype-pill">VERSI AWAL</span>
          <div className="top-actions">
            <NotificationBell />
            <button className="level-pill" onClick={() => go("/progres")}><span>初心者</span> Pemula Pre-N5</button>
          </div>
        </header>
        <div className="content">{children}</div>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.slice(0, 5).map((item) => (
            <button className={isNavItemActive(pathname, item) ? "active" : ""} key={item.id} onClick={() => go(item.path)}>
              <span>{item.icon}</span><small>{item.label}</small>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
