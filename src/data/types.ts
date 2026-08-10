export type Role =
  | "Admin"
  | "Project Manager"
  | "Analyst"
  | "On-site Delegate"
  | "Medical Writer"
  | "Client Viewer";

export interface Conference {
  id: string;
  name: string;
  acronym: string;
  location: string;
  startDate: string;
  endDate: string;
  therapyAreas: string[];
  sessionCount: number;
  delegateCount: number;
  status: "Planning" | "Live" | "Complete";
  phase: "pre" | "live" | "post";
}

export interface Delegate {
  id: string;
  name: string;
  initials: string;
  role: Role;
  focus: string;
}

export interface Session {
  id: string;
  title: string;
  time: string;
  day: string;
  room: string;
  authors: string;
  affiliation: string;
  trialId?: string;
  therapyArea: string;
  asset: string;
  phase: string;
  confidence: number;
  assignedTo?: string;
  conflict?: boolean;
  kiqId?: string;
  sourceUrl?: string;
}

export interface Poster {
  id: string;
  title: string;
  presenter: string;
  capturedBy: string;
  capturedAt: string;
  therapyArea: string;
  ocrStatus: "processing" | "complete";
  summary: string[];
  significant: boolean;
  contradictory: boolean;
  sourceQuote: string;
  page: number;
  confidence: number;
  imagePath?: string;
  ocrText?: string;
}

export interface Endpoint {
  id: string;
  trialId: string;
  trialName: string;
  asset: string;
  endpointType: "Primary" | "Secondary";
  endpoint: string;
  value: string;
  pValue: string;
  hr: string;
  ci: string;
}

export interface Kiq {
  id: string;
  question: string;
  mappedSessions: number;
  completion: number;
  hasNewEvidence: boolean;
}

export interface Kit {
  id: string;
  topic: string;
  owner: string;
  kiqs: Kiq[];
}

export interface Hypothesis {
  id: string;
  kiqId: string;
  statement: string;
  impact: "High" | "Medium" | "Low";
  likelihood: "High" | "Medium" | "Low";
  gap: boolean;
  evidence: { label: string; source: "PubMed" | "ClinicalTrials.gov" }[];
}

export interface Insight {
  id: string;
  text: string;
  kitId: string;
  kiqId: string;
  posterId?: string;
  significant: boolean;
  contradictory: boolean;
  novelty: number;
  impact: number;
  confidence: number;
  sourceQuote: string;
  page: number;
  duplicateOf?: string;
}

export type LbaStatus = "new" | "reviewed" | "dismissed";
export type LbaSourceType = "conference" | "company_pr" | "manual";
export type LbaApproval = "approved" | "pending";

export interface LbaAlert {
  id: string;
  title: string;
  detectedAt: string;
  relevantToKit: boolean;
  kitTopic?: string;
  trialId: string;
  abstractNumber: string;
  summary: string;
  sourceUrl?: string;
  sponsor: string;
  indication: string;
  phase: string;
  relevanceScore: number;
  matchReason: string;
  status: LbaStatus;
  watchTerm: string;
  lastSeenAt: string;
  sourceType: LbaSourceType;
  approval: LbaApproval;
  company: string;
  edited: boolean;
}


export interface LbaWatchTerm {
  id: string;
  term: string;
  kind: string;
  priority: number;
  active: boolean;
}

export interface LbaScanRun {
  id: string;
  status: string;
  sourcesScanned: string[];
  alertsFound: number;
  newAlerts: number;
  error?: string;
  durationMs: number;
  createdAt: string;
}


export interface Comment {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
  target: string;
  mentions: string[];
}
