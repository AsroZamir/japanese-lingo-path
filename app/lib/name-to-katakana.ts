import * as wanakana from "wanakana";

const KATAKANA_ONLY = /^[゠-ヿー]+$/;

// wanakana.toKatakana is a mechanical romaji->kana mapper, not a real
// transliteration engine — consonant clusters it can't resolve (e.g.
// "Asro" needs to be pronounceable as "A-su-ro") get left as raw Latin
// letters in the output. Per docs/konten-M01-orientasi.md's own
// instruction ("kalau konversi belum tersedia, pakai アスロ sebagai
// contoh tetap"), any output that still contains non-katakana
// characters counts as "not available" and falls back.
export function nameToKatakanaOrFallback(fullName: string, fallback: string): { kana: string; isDynamic: boolean } {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "";
  if (!firstName) return { kana: fallback, isDynamic: false };
  const converted = wanakana.toKatakana(firstName);
  return KATAKANA_ONLY.test(converted) ? { kana: converted, isDynamic: true } : { kana: fallback, isDynamic: false };
}
