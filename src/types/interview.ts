export type Difficulty = 'easy' | 'medium' | 'hard'

export type ChatRole = 'system' | 'ai' | 'candidate'

export interface CandidateProfile {
  name?: string
  email?: string
  phone?: string
  resumeFileName?: string
  resumeText?: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  meta?: Record<string, unknown>
}

export type QuestionStatus = 'pending' | 'answered' | 'auto-submitted'

export interface InterviewQuestion {
  id: string
  prompt: string
  difficulty: Difficulty
  timeLimitSeconds: number
  askedAt?: string
  answeredAt?: string
  answer?: string
  status: QuestionStatus
  score?: number
}

export interface CandidateRecord {
  id: string
  profile: CandidateProfile
  pendingProfileFields: Array<keyof CandidateProfile>
  chat: ChatMessage[]
  questions: InterviewQuestion[]
  status: 'collecting-profile' | 'ready' | 'in-progress' | 'paused' | 'completed'
  summary?: string
  finalScore?: number
  createdAt: string
  updatedAt: string
  totalTimeSeconds: number
}

export interface InterviewState {
  candidates: Record<string, CandidateRecord>
  candidateOrder: string[]
  activeCandidateId: string | null
  currentQuestionIndex: number
  questionDeadline: string | null
  pausedAt: string | null
  pausedRemainingSeconds: number | null
  welcomeBackSeenAt: string | null
}
