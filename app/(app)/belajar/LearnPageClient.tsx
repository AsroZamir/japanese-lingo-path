"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { curriculumUnits, levelDetails, skillTracks, type CurriculumLevel } from "@/app/curriculum-data";
import { LEGACY_UNIT_TO_KANA_MODULE } from "@/app/lib/legacy-module-bridge";
import { PageHeader } from "../_components/PageHeader";

const skillLabels: Record<string, string> = {
  Kana: "Kana", Vocabulary: "Kosakata", Kanji: "Kanji", Grammar: "Pola Kalimat",
  Reading: "Membaca", Listening: "Mendengar", Speaking: "Berbicara", Writing: "Menulis",
};

export function LearnPageClient({ connectedModuleCodes }: { connectedModuleCodes: string[] }) {
  const router = useRouter();
  const [level, setLevel] = useState<CurriculumLevel>("PRE_N5");
  const units = curriculumUnits.filter((unit) => unit.level === level);
  const details = levelDetails[level];
  const connectedSet = new Set(connectedModuleCodes);
  const moduleFlow = [
    ["1", "Pelajari", "Kenali materi baru lewat penjelasan dan contoh."],
    ["2", "Latihan", "Kerjakan soal singkat untuk menguatkan ingatan."],
    ["3", "Praktik", "Gunakan materi dalam membaca, mendengar, berbicara, atau menulis."],
    ["4", "Review", "Ulangi bagian yang masih salah atau belum lancar."],
    ["5", "Ujian Modul", "Buktikan pemahaman sebelum lanjut ke modul berikutnya."],
  ];

  return (
    <>
      <PageHeader eyebrow="JALUR BELAJAR ANDA" title="Pilih Modul Belajar" copy="Selesaikan satu modul demi satu modul dengan urutan yang jelas." />
      <div className="curriculum-tabs" role="tablist" aria-label="Pilih level kurikulum">
        {(["PRE_N5", "N5"] as CurriculumLevel[]).map((item) => <button role="tab" aria-selected={level === item} className={level === item ? "active" : ""} onClick={() => setLevel(item)} key={item}><strong>{levelDetails[item].label}</strong><span>{levelDetails[item].name}</span></button>)}
      </div>
      <section className="curriculum-overview">
        <div className="curriculum-overview-copy"><span className="blueprint-badge">JALUR BELAJAR TERSEDIA</span><p className="eyebrow">LEVEL {details.label}</p><h2>{details.name}</h2><p>{details.description}</p><div className="curriculum-meta"><span>{details.unitCount}</span><span>{details.lessonCount}</span><span>Belajar bertahap</span></div></div>
        <div className="curriculum-target"><small>TARGET AKHIR</small><p>{details.exitTarget}</p><div>{details.stats.map((stat) => <span key={stat}>{stat}</span>)}</div></div>
      </section>
      <section className="module-flow-guide" aria-labelledby="module-flow-title">
        <div className="curriculum-section-heading"><div><span className="card-kicker dark">CARA BELAJAR</span><h3 id="module-flow-title">Alur yang sama di setiap modul</h3></div><p>Ikuti dari kiri ke kanan hingga ujian modul.</p></div>
        <div className="module-flow-steps">
          {moduleFlow.map(([number, title, copy], index) => <article key={title}><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div>{index < moduleFlow.length - 1 ? <i aria-hidden="true">→</i> : null}</article>)}
        </div>
      </section>
      <div className="curriculum-section-heading"><div><span className="card-kicker dark">DAFTAR MODUL</span><h3>{details.unitCount} untuk diselesaikan secara berurutan</h3></div><p>Mulai dari modul pertama, lalu lanjut setelah ujian modul selesai.</p></div>
      <section className="unit-list curriculum-unit-list">
        {units.map((unit) => {
          const kanaModuleCode = LEGACY_UNIT_TO_KANA_MODULE[unit.id];
          const isConnected = kanaModuleCode != null && connectedSet.has(kanaModuleCode);

          return (
            <article className={`unit-card curriculum-unit ${isConnected ? "" : "is-unavailable"}`} key={unit.id}>
              <div className="unit-number">{unit.code}</div>
              <div className="unit-info">
                <small>{unit.focus}</small><h3>{unit.title}</h3><p>{unit.subtitle}</p>
                <div className="unit-tags">{unit.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div>
                <span className={`status-pill ${isConnected ? "status-pill--active" : ""}`}>
                  {isConnected ? "Tersedia — sistem baru" : "Belum tersedia"}
                </span>
              </div>
              <div className="module-card-path">
                <div className="module-card-summary"><span><small>Pelajaran</small><b>{unit.lessons.length}</b></span><span><small>Kosakata</small><b>{unit.vocabulary}</b></span><span><small>Pola</small><b>{unit.grammar === "—" ? "Dasar" : unit.grammar}</b></span></div>
                <div className="module-mini-flow"><span>Pelajari</span><i>→</i><span>Latihan</span><i>→</i><span>Praktik</span><i>→</i><span>Ujian</span></div>
              </div>
              <button
                className="module-open-button"
                aria-label={isConnected ? `Buka modul ${unit.title}` : `${unit.title} belum tersedia`}
                disabled={!isConnected}
                onClick={() => isConnected && router.push(`/belajar/kana/${kanaModuleCode}`)}
              >
                <span>{isConnected ? "Buka modul" : "Belum tersedia"}</span>{isConnected ? "→" : null}
              </button>
            </article>
          );
        })}
      </section>
      <section className="curriculum-footer-map"><div><span className="card-kicker dark">KEMAMPUAN YANG DILATIH</span><h3>Satu jalur belajar, semua kemampuan saling terhubung</h3></div><div>{skillTracks.map((skill) => <span key={skill}>{skillLabels[skill] ?? skill}</span>)}</div></section>
    </>
  );
}
