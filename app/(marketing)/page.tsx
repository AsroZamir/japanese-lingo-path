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
    <div className="content">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="blueprint-badge">VERSI AWAL — PRE-N5 SEDANG DIBANGUN</span>
          <h2>Belajar bahasa Jepang<br />dari nol sampai <em>JLPT</em></h2>
          <p>Japanese Lingo Path adalah platform belajar bahasa Jepang berbahasa Indonesia, dari pemula total sampai siap menghadapi JLPT.</p>
          <Link href="/login" className="primary-button">Masuk dengan Google <span>→</span></Link>
        </div>
        <div className="path-art" aria-hidden="true">
          <div className="sun"></div><div className="mountain mountain-back"></div><div className="mountain mountain-front"></div>
          <div className="path-line"></div><div className="torii"><i></i><b></b><span></span></div>
          <div className="petal p1">◆</div><div className="petal p2">◆</div><div className="petal p3">◆</div>
        </div>
      </section>

      <div className="curriculum-section-heading">
        <div><span className="card-kicker dark">JALUR BELAJAR</span><h3>Dari Pre-N5 sampai N1</h3></div>
        <p>Enam tahap berurutan, dibangun satu per satu.</p>
      </div>
      <section className="operational-scope-grid">
        {roadmap.map((level) => (
          <article key={level.code}>
            <span>{level.code}</span>
            <div><small>{level.status.toUpperCase()}</small><strong>{level.title} · {level.detail}</strong></div>
          </article>
        ))}
      </section>

      <div className="curriculum-section-heading">
        <div><span className="card-kicker dark">KENAPA JAPANESE LINGO PATH</span><h3>Tiga hal yang membedakan</h3></div>
      </div>
      <section className="operational-scope-grid">
        {differentiators.map((item) => (
          <article key={item.label}>
            <span>{item.icon}</span>
            <div><small>{item.label}</small><strong>{item.text}</strong></div>
          </article>
        ))}
      </section>
    </div>
  );
}
