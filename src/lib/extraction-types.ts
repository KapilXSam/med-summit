export interface FieldConfidence {
  low: string[]; // list of field keys with low confidence (<70)
}

export interface ExtractedSession {
  id: string;
  title: string;
  authors: string;
  affiliation: string;
  day: string;
  time: string;
  room: string;
  trialId: string;
  therapyArea: string;
  asset: string;
  confidence: number; // overall 0-100
  fieldConfidence: Record<string, number>; // per-field 0-100
}

export interface IngestResult {
  sourceUrl: string;
  sessions: ExtractedSession[];
  warning?: string;
}

export const EDITABLE_FIELDS: { key: keyof ExtractedSession; label: string }[] = [
  { key: "title", label: "Session title" },
  { key: "authors", label: "Authors" },
  { key: "affiliation", label: "Affiliation" },
  { key: "day", label: "Day" },
  { key: "time", label: "Time" },
  { key: "room", label: "Room" },
  { key: "trialId", label: "Trial ID" },
  { key: "therapyArea", label: "Therapy area" },
  { key: "asset", label: "Asset" },
];
