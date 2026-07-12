import type {
  Comment,
  Conference,
  Delegate,
  Endpoint,
  Hypothesis,
  Insight,
  Kit,
  LbaAlert,
  Poster,
  Session,
} from "./types";

export const conferences: Conference[] = [
  {
    id: "asco-2025",
    name: "American Society of Clinical Oncology Annual Meeting",
    acronym: "ASCO 2025",
    location: "Chicago, IL",
    startDate: "2025-05-30",
    endDate: "2025-06-03",
    therapyAreas: ["Oncology", "Hematology"],
    sessionCount: 4218,
    delegateCount: 12,
    status: "Live",
    phase: "live",
  },
  {
    id: "esmo-2025",
    name: "European Society for Medical Oncology Congress",
    acronym: "ESMO 2025",
    location: "Berlin, Germany",
    startDate: "2025-10-17",
    endDate: "2025-10-21",
    therapyAreas: ["Oncology"],
    sessionCount: 3102,
    delegateCount: 8,
    status: "Planning",
    phase: "pre",
  },
  {
    id: "ash-2024",
    name: "American Society of Hematology Annual Meeting",
    acronym: "ASH 2024",
    location: "San Diego, CA",
    startDate: "2024-12-07",
    endDate: "2024-12-10",
    therapyAreas: ["Hematology"],
    sessionCount: 5010,
    delegateCount: 15,
    status: "Complete",
    phase: "post",
  },
];

export const delegates: Delegate[] = [
  { id: "d1", name: "Dr. Elena Marsh", initials: "EM", role: "Project Manager", focus: "Lung / IO" },
  { id: "d2", name: "James Okoye", initials: "JO", role: "Analyst", focus: "Breast" },
  { id: "d3", name: "Dr. Priya Nair", initials: "PN", role: "On-site Delegate", focus: "GI" },
  { id: "d4", name: "Marco Rossi", initials: "MR", role: "On-site Delegate", focus: "Hematology" },
  { id: "d5", name: "Dr. Sarah Kline", initials: "SK", role: "Medical Writer", focus: "HEOR" },
  { id: "d6", name: "Tomás Vega", initials: "TV", role: "On-site Delegate", focus: "GU" },
];

const therapyAreas = ["Lung", "Breast", "GI", "GU", "Hematology"];
const assets = ["VRA-101", "VRA-204", "Competitor A", "Competitor B", "SoC"];
const phases = ["Phase I", "Phase II", "Phase III", "Real-world"];
const rooms = ["Hall A", "Hall B", "Arie Crown", "Room S406", "E354b"];
const days = ["Fri May 30", "Sat May 31", "Sun Jun 1", "Mon Jun 2"];

export const sessions: Session[] = Array.from({ length: 42 }).map((_, i) => {
  const confidence = [98, 96, 94, 91, 88, 72, 64, 55][i % 8];
  const ta = therapyAreas[i % therapyAreas.length];
  return {
    id: `s${i + 1}`,
    title: [
      "Overall survival with first-line immunotherapy combination in advanced NSCLC",
      "Phase III results of antibody-drug conjugate in HER2-low breast cancer",
      "Neoadjuvant chemoradiation outcomes in locally advanced rectal cancer",
      "Biomarker-driven therapy selection in metastatic castration-resistant prostate cancer",
      "Long-term follow-up of CAR-T therapy in relapsed/refractory lymphoma",
      "Quality of life outcomes in maintenance therapy for ovarian cancer",
    ][i % 6],
    time: ["08:00", "09:15", "10:30", "13:00", "14:45", "16:00"][i % 6],
    day: days[i % days.length],
    room: rooms[i % rooms.length],
    authors: ["Chen L, et al.", "García M, et al.", "Patel R, et al.", "Novak K, et al."][i % 4],
    affiliation: ["MD Anderson", "Gustave Roussy", "Royal Marsden", "Dana-Farber"][i % 4],
    trialId: i % 3 === 0 ? `NCT0${4500000 + i}` : undefined,
    therapyArea: ta,
    asset: assets[i % assets.length],
    phase: phases[i % phases.length],
    confidence,
    assignedTo: i % 4 === 0 ? delegates[i % delegates.length].id : undefined,
    conflict: i === 5 || i === 12,
    kiqId: i % 2 === 0 ? `kiq${(i % 4) + 1}` : undefined,
  };
});

export const posters: Poster[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `p${i + 1}`,
  title: [
    "Subgroup analysis of PFS in PD-L1 high NSCLC patients",
    "Real-world treatment patterns in HR+ metastatic breast cancer",
    "Safety profile of novel ADC in heavily pretreated patients",
    "Cost-effectiveness of biomarker testing in early-stage disease",
  ][i % 4],
  presenter: ["Chen L", "García M", "Patel R", "Novak K"][i % 4],
  capturedBy: delegates[i % delegates.length].name,
  capturedAt: `${9 + (i % 8)}:${i % 2 ? "30" : "05"} AM`,
  therapyArea: therapyAreas[i % therapyAreas.length],
  ocrStatus: i < 10 ? "complete" : "processing",
  summary: [
    "Median PFS 11.2 months vs 6.4 months in control arm (direct extraction).",
    "Hazard ratio 0.58 favoring the investigational arm.",
    "Grade ≥3 treatment-related AEs reported in 34% of patients.",
  ],
  significant: i % 3 === 0,
  contradictory: i === 4 || i === 9,
  sourceQuote:
    "Median progression-free survival was 11.2 months (95% CI 9.1–13.4) in the combination arm.",
  page: (i % 3) + 1,
  confidence: [9, 8, 7, 6, 5][i % 5],
}));

export const endpoints: Endpoint[] = [
  { id: "e1", trialId: "NCT04500123", trialName: "AURORA-3", asset: "VRA-101", endpointType: "Primary", endpoint: "Overall Survival", value: "24.1 mo", pValue: "0.002", hr: "0.71", ci: "0.58–0.87" },
  { id: "e2", trialId: "NCT04500123", trialName: "AURORA-3", asset: "VRA-101", endpointType: "Secondary", endpoint: "Progression-Free Survival", value: "11.2 mo", pValue: "<0.001", hr: "0.58", ci: "0.47–0.72" },
  { id: "e3", trialId: "NCT04511987", trialName: "HELIOS-2", asset: "Competitor A", endpointType: "Primary", endpoint: "Overall Survival", value: "21.8 mo", pValue: "0.04", hr: "0.83", ci: "0.69–0.99" },
  { id: "e4", trialId: "NCT04522456", trialName: "MERIDIAN", asset: "VRA-204", endpointType: "Primary", endpoint: "Objective Response Rate", value: "48%", pValue: "0.01", hr: "—", ci: "41–55%" },
  { id: "e5", trialId: "NCT04522456", trialName: "MERIDIAN", asset: "VRA-204", endpointType: "Secondary", endpoint: "Duration of Response", value: "14.6 mo", pValue: "0.03", hr: "0.66", ci: "0.51–0.85" },
];

export const kits: Kit[] = [
  {
    id: "kit1",
    topic: "VRA-101 competitive positioning in 1L NSCLC",
    owner: "Dr. Elena Marsh",
    kiqs: [
      { id: "kiq1", question: "How does VRA-101 OS compare to Competitor A in 1L?", mappedSessions: 8, completion: 75, hasNewEvidence: true },
      { id: "kiq2", question: "What is the safety differentiation vs standard of care?", mappedSessions: 5, completion: 40, hasNewEvidence: true },
    ],
  },
  {
    id: "kit2",
    topic: "ADC landscape in HER2-low breast cancer",
    owner: "James Okoye",
    kiqs: [
      { id: "kiq3", question: "Which ADCs show PFS benefit in HER2-low populations?", mappedSessions: 6, completion: 60, hasNewEvidence: true },
      { id: "kiq4", question: "Are there emerging resistance biomarkers?", mappedSessions: 2, completion: 15, hasNewEvidence: false },
    ],
  },
];

export const hypotheses: Hypothesis[] = [
  {
    id: "h1",
    kiqId: "kiq1",
    statement: "VRA-101 demonstrates a ≥3 month OS advantage over Competitor A in PD-L1 high patients.",
    impact: "High",
    likelihood: "Medium",
    gap: false,
    evidence: [
      { label: "AURORA-1 Phase II OS data", source: "PubMed" },
      { label: "NCT04500123 interim readout", source: "ClinicalTrials.gov" },
    ],
  },
  {
    id: "h2",
    kiqId: "kiq2",
    statement: "VRA-101 shows lower grade ≥3 immune-related AEs than standard of care.",
    impact: "High",
    likelihood: "Medium",
    gap: false,
    evidence: [{ label: "Pooled safety meta-analysis 2024", source: "PubMed" }],
  },
  {
    id: "h3",
    kiqId: "kiq4",
    statement: "HER2 heterogeneity predicts ADC resistance in metastatic breast cancer.",
    impact: "Medium",
    likelihood: "Low",
    gap: true,
    evidence: [{ label: "Translational biomarker review", source: "PubMed" }],
  },
];

export const insights: Insight[] = [
  { id: "i1", text: "VRA-101 combination achieved median OS of 24.1 months, a 2.3-month numerical advantage over Competitor A.", kitId: "kit1", kiqId: "kiq1", posterId: "p1", significant: true, contradictory: false, novelty: 8, impact: 9, confidence: 9, sourceQuote: "Median OS 24.1 months (95% CI 21.0–27.2).", page: 1 },
  { id: "i2", text: "Grade ≥3 immune-related AEs were lower in the VRA-101 arm (18% vs 27%).", kitId: "kit1", kiqId: "kiq2", posterId: "p3", significant: true, contradictory: false, novelty: 6, impact: 8, confidence: 8, sourceQuote: "Grade ≥3 irAEs occurred in 18% of the investigational arm.", page: 2 },
  { id: "i3", text: "One real-world dataset suggests attenuated benefit in elderly subgroups, contradicting the pivotal trial.", kitId: "kit1", kiqId: "kiq1", posterId: "p5", significant: false, contradictory: true, novelty: 9, impact: 7, confidence: 6, sourceQuote: "In patients ≥75, HR was 0.94 (95% CI 0.70–1.26).", page: 1 },
  { id: "i4", text: "ADC therapy showed a HER2-low PFS benefit of 4.8 months versus chemotherapy.", kitId: "kit2", kiqId: "kiq3", posterId: "p2", significant: true, contradictory: false, novelty: 7, impact: 8, confidence: 8, sourceQuote: "Median PFS 10.1 vs 5.3 months (HR 0.51).", page: 1 },
  { id: "i5", text: "VRA-101 combination achieved median OS of 24.1 months versus comparator.", kitId: "kit1", kiqId: "kiq1", posterId: "p1", significant: true, contradictory: false, novelty: 3, impact: 9, confidence: 9, sourceQuote: "Median OS 24.1 months.", page: 1, duplicateOf: "i1" },
];

export const lbaAlerts: LbaAlert[] = [
  { id: "l1", title: "LBA5001: OS results from AURORA-3 first-line combination trial", detectedAt: "12 min ago", relevantToKit: true, kitTopic: "VRA-101 competitive positioning", trialId: "NCT04500123" },
  { id: "l2", title: "LBA2004: Novel bispecific antibody in relapsed lymphoma", detectedAt: "48 min ago", relevantToKit: false, trialId: "NCT04588001" },
  { id: "l3", title: "LBA1010: ADC vs chemotherapy in HER2-low breast cancer", detectedAt: "2 hrs ago", relevantToKit: true, kitTopic: "ADC landscape in HER2-low", trialId: "NCT04511987" },
  { id: "l4", title: "LBA3300: Maintenance PARP inhibitor in ovarian cancer", detectedAt: "5 hrs ago", relevantToKit: false, trialId: "NCT04600222" },
];

export const comments: Comment[] = [
  { id: "c1", author: "Dr. Elena Marsh", initials: "EM", text: "The OS curve separation here is striking — @James Okoye can you cross-check against HELIOS-2?", time: "10:42 AM", target: "AURORA-3 poster", mentions: ["James Okoye"] },
  { id: "c2", author: "James Okoye", initials: "JO", text: "Confirmed. HR is meaningfully better. Flagging for the exec summary.", time: "10:45 AM", target: "AURORA-3 poster", mentions: [] },
  { id: "c3", author: "Dr. Priya Nair", initials: "PN", text: "Elderly subgroup looks weaker though — worth a caveat @Dr. Sarah Kline", time: "11:03 AM", target: "KIQ-1", mentions: ["Dr. Sarah Kline"] },
];
