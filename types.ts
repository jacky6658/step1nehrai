
export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum RecruitmentTool {
  DASHBOARD = 'DASHBOARD',
  JD_GENERATOR = 'JD_GENERATOR',
  PERSONA_GENERATOR = 'PERSONA_GENERATOR',
  OUTREACH_WRITER = 'OUTREACH_WRITER',
  INTERVIEW_COPILOT = 'INTERVIEW_COPILOT',
  AGENT_CHAT = 'AGENT_CHAT',
  TALENT_SEARCH = 'TALENT_SEARCH',
  SETTINGS = 'SETTINGS'
}

export interface JDPayload {
  title: string;
  skills: string;
  seniority: string;
  companyCulture: string;
}

export interface OutreachPayload {
  candidateName: string;
  position: string;
  company: string;
  tone: 'professional' | 'casual' | 'persuasive';
  keySellingPoints: string;
}

export interface OutreachOption {
  type: string;
  subject: string;
  content: string;
}

export type Language = 'zh-TW' | 'en' | 'ja' | 'ko';

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
];

export interface AppState {
  apiKey: string | null;
  showSplash: boolean;
}

export interface TalentStrategyStructured {
  channelStrategy: string[];
  companyHuntingList: { name: string; reason: string }[];
  booleanStrings: { label: string; query: string }[];
  sources: { title: string; uri: string }[];
}

export interface CandidatePersona {
  archetype: string;        // 角色原型 (e.g. "The Problem Solver")
  quote: string;            // 代表語錄
  bio: string;              // 人物簡介
  
  // New 7 Dimensions
  workType: string[];       // 工作類型 (Remote, High-paced, etc.)
  traits: string[];         // 人才特質 (Personality)
  skills: string[];         // 專業技能 (Hard Skills)
  values: string[];         // 價值觀 (Core Values)
  background: {             // 人才背景
    education: string;
    experience: string;
    industries: string[];
  };
  channels: string[];       // 尋才來源
  keywords: string[];       // 關鍵字 (SEO/Search)
  
  // Optional legacy fields for backward compatibility if needed
  frustrations?: string[];
}

export interface CandidateAnalysisStructured {
  score: number;
  summary: string;
  recommendation: 'Strong Hire' | 'Hire' | 'Hold' | 'Reject';
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  interviewQuestions: string[];
}

export interface InterviewQuestionsStructured {
  resumeDeepDive: string[];
  gapAnalysis: string[];
  behavioralQuestions: string[];
}

// Data shared between tools when navigating
export interface SharedData {
  jobTitle?: string;
  skills?: string;
  cultureValues?: string;
  jobDescriptionContext?: string; // Raw text or bio
  sellingPoints?: string;
}
