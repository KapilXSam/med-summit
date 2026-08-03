import type { Session } from "@/data/types";

/**
 * Person extraction for the Primary CI module.
 * Sessions store authors as a free-text string ("Chen L, et al.", "Chen L; García M").
 * We split that into individual people and build one appearance per person/session.
 */

const NOISE = /^(et al\.?|and colleagues|others|n\/a|unknown|-|—)$/i;

export function splitAuthors(authors: string): string[] {
  if (!authors) return [];
  // Structured feeds use "Name (City, Country); Name (City, Country)".
  // Legacy free text uses commas / "et al." — only fall back to that when no ";" is present.
  const parts = authors.includes(";")
    ? authors.split(";")
    : authors.replace(/\bet\.? al\.?/gi, ";").split(/[;•|]|,(?=\s*[A-ZÀ-Ý])|\band\b/g);
  return parts
    .map((n) => n.replace(/\s+/g, " ").trim().replace(/[.,;]+$/, "").trim())
    .filter((n) => n.length > 1 && !NOISE.test(n));
}

/** "Ana Oaknin (Majadahonda, Spain)" -> { name, location } */
export function parsePersonEntry(entry: string): { name: string; location: string } {
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(entry);
  if (m && m[1].trim()) return { name: m[1].trim(), location: m[2].trim() };
  return { name: entry.trim(), location: "" };
}


export function personKeyOf(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const INDICATION_RULES: { label: string; patterns: RegExp[] }[] = [
  { label: "NSCLC", patterns: [/\bNSCLC\b/i, /non[- ]small[- ]cell lung/i, /\blung\b/i] },
  { label: "SCLC", patterns: [/\bSCLC\b/i, /small[- ]cell lung/i] },
  { label: "Breast cancer", patterns: [/\bbreast\b/i, /\bHER2\b/i, /\bHR\+/i, /triple[- ]negative/i, /\bTNBC\b/i] },
  { label: "Colorectal cancer", patterns: [/colorectal/i, /\bCRC\b/i, /\brectal\b/i, /\bcolon\b/i] },
  { label: "Prostate cancer", patterns: [/prostate/i, /\bmCRPC\b/i, /castration[- ]resistant/i] },
  { label: "Ovarian cancer", patterns: [/ovarian/i] },
  { label: "Lymphoma", patterns: [/lymphoma/i, /\bDLBCL\b/i, /Hodgkin/i] },
  { label: "Leukemia", patterns: [/leukemia/i, /\bAML\b/i, /\bCLL\b/i] },
  { label: "Multiple myeloma", patterns: [/myeloma/i] },
  { label: "Melanoma", patterns: [/melanoma/i] },
  { label: "Gastric cancer", patterns: [/gastric/i, /stomach cancer/i] },
  { label: "Pancreatic cancer", patterns: [/pancrea/i] },
  { label: "Hepatocellular carcinoma", patterns: [/hepatocellular/i, /\bHCC\b/i, /liver cancer/i] },
  { label: "Bladder / urothelial", patterns: [/bladder/i, /urothelial/i] },
  { label: "Head & neck cancer", patterns: [/head and neck/i, /\bHNSCC\b/i] },
  { label: "Renal cell carcinoma", patterns: [/renal cell/i, /\bRCC\b/i, /kidney cancer/i] },
  { label: "Glioma / CNS", patterns: [/glioma/i, /glioblastoma/i, /\bGBM\b/i] },
  { label: "Cervical cancer", patterns: [/cervical/i] },
  { label: "Endometrial cancer", patterns: [/endometrial/i] },
];

export function indicationFor(s: { title?: string; therapyArea?: string }): string {
  const title = s.title || "";
  for (const rule of INDICATION_RULES) {
    if (rule.patterns.some((p) => p.test(title))) return rule.label;
  }
  return s.therapyArea || "Other";
}

export interface Appearance {
  sessionId: string;
  sessionTitle: string;
  day: string;
  time: string;
  room: string;
  asset: string;
  trialId?: string;
  indication: string;
  sourceUrl?: string;
}

export interface Person {
  key: string;
  name: string;
  company: string;
  /** City, Country as published by the congress (when available). */
  location?: string;
  manual: boolean;
  appearances: Appearance[];
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Build the person roster from planner sessions. */
export function buildPeople(sessions: Session[]): Person[] {
  const map = new Map<string, Person>();
  for (const s of sessions) {
    const entries = splitAuthors(s.authors);
    if (entries.length === 0) continue;
    const appearance: Appearance = {
      sessionId: s.id,
      sessionTitle: s.title,
      day: s.day,
      time: s.time,
      room: s.room,
      asset: s.asset,
      trialId: s.trialId,
      indication: indicationFor(s),
      sourceUrl: s.sourceUrl,
    };
    for (const entry of entries) {
      const { name, location } = parsePersonEntry(entry);
      const key = personKeyOf(name);
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.appearances.push(appearance);
        if (!existing.location && location) existing.location = location;
        if ((!existing.company || existing.company === "Unaffiliated") && (s.affiliation || location)) {
          existing.company = s.affiliation || location;
        }
      } else {
        map.set(key, {
          key,
          name,
          company: s.affiliation || location || "Unaffiliated",
          location: location || undefined,
          manual: false,
          appearances: [appearance],
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}


/** Minutes-since-midnight of the first time found in a time string, or null. */
export function startMinutes(time: string): number | null {
  const m = /(\d{1,2}):(\d{2})/.exec(time || "");
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
