import Link from "next/link";
import { levelDetails } from "@/app/curriculum-data";

const roadmap = [
  { code: "Pre-N5", title: levelDetails.PRE_N5.name, status: "Sedang dibangun", detail: levelDetails.PRE_N5.unitCount },
  { code: "N5", title: levelDetails.N5.name, status: "Direncanakan", detail: levelDetails.N5.unitCount },
  { code: "N4", title: "Bahasa Jepang tingkat dasar-menengah", status: "Direncanakan", detail: "Belum tersedia" },
  { code: "N3", title: "Bahasa Jepang tingkat menengah", status: "Direncanakan", detail: "Belum tersedia" },
  { code: "N2", title: "Bahasa Jepang tingkat menengah-atas", status: "Direncanakan", detail: "Belum tersedia" },
  { code: "N1", title: "Bahasa Jepang tingkat mahir", status: "Direncanakan", detail: "Belum tersedia" },
];

const differentiators = [
  { icon: "課", label: "KURIKULUM BERTAHAP", text: "Setiap level dipecah jadi modul kecil dengan urutan belajar yang jelas, bukan tumpukan materi acak." },
  { icon: "復", label: "REVIEW TERJADWAL", text: "Materi yang sudah dipelajari diulang otomatis di waktu yang tepat, supaya tidak cepat lupa." },
  { icon: "力", label: "PENILAIAN PER KOMPETENSI", text: "Progres diukur per kemampuan — kosakata, kanji, tata bahasa, membaca, mendengar, berbicara, menulis — bukan satu skor besar." },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="landing-nav__brand">Japanese Lingo Path</span>
        <nav className="landing-nav__links">
          <a href="#jalur">Jalur belajar</a>
          <a href="#kenapa">Kenapa kami</a>
          <Link href="/login">Masuk</Link>
          <Link href="/login" className="landing-nav__cta">Mulai gratis</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <span className="landing-eyebrow">VERSI AWAL — PRE-N5 SEDANG DIBANGUN</span>
          <h1>Belajar bahasa Jepang<br />dari nol sampai <em>JLPT</em></h1>
          <p>Japanese Lingo Path adalah platform belajar bahasa Jepang berbahasa Indonesia, dari pemula total sampai siap menghadapi JLPT.</p>
          <div className="landing-hero__ctas">
            <Link href="/login" className="landing-cta-btn">Masuk dengan Google <span>→</span></Link>
            <a href="#jalur" className="landing-hero__secondary-link">Lihat jalur belajar</a>
          </div>
        </div>
        <div className="landing-hero__card" aria-hidden="true">
          <div className="landing-hero__card-bar">
            <span /><span /><span className="is-empty" />
          </div>
          <div className="landing-hero__card-glyph">あ</div>
          <div className="landing-hero__card-audio">
            <span className="landing-hero__card-play">▶</span>
            <span>Dibaca &quot;a&quot;</span>
          </div>
          <div className="landing-hero__card-btn">Lanjutkan ›</div>
        </div>
      </section>

      <section id="jalur" className="landing-section">
        <div className="landing-section__heading">
          <span className="landing-eyebrow">JALUR BELAJAR</span>
          <h2>Dari Pre-N5 sampai N1</h2>
          <p>Enam tahap berurutan, dibangun satu per satu.</p>
        </div>
        <div className="landing-grid">
          {roadmap.map((level) => (
            <article className="landing-card" key={level.code}>
              <span className="landing-card__badge">{level.code}</span>
              <div>
                <small>{level.status.toUpperCase()}</small>
                <strong>{level.title} · {level.detail}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="kenapa" className="landing-section landing-section--tinted">
        <div className="landing-section__heading">
          <span className="landing-eyebrow">KENAPA JAPANESE LINGO PATH</span>
          <h2>Tiga hal yang membedakan</h2>
        </div>
        <div className="landing-feature-grid">
          {differentiators.map((item) => (
            <article className="landing-feature-card" key={item.label}>
              <div className="landing-feature-card__icon">{item.icon}</div>
              <div className="landing-feature-card__title">{item.label}</div>
              <div className="landing-feature-card__desc">{item.text}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta-dark">
        <h2>Mulai perjalanan Anda hari ini</h2>
        <p>Masuk dengan akun Google — gratis untuk memulai.</p>
        <Link href="/login" className="landing-cta-btn">Masuk dengan Google <span>→</span></Link>
      </section>

      <footer className="landing-footer">
        <span className="landing-footer__brand">Japanese Lingo Path</span>
        <nav>
          <a href="#jalur">Jalur belajar</a>
          <a href="#kenapa">Kenapa kami</a>
          <Link href="/login">Masuk</Link>
        </nav>
        <span className="landing-footer__copyright">© 2026 Japanese Lingo Path</span>
      </footer>
    </div>
  );
}
