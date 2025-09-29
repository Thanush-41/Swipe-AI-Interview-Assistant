import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import dayjs from 'dayjs'

import type {
  CandidateProfile,
  CandidateRecord,
  InterviewQuestion,
  InterviewState,
  QuestionStatus,
} from '../../types/interview'
import { createId } from '../../utils/id'

interface StartCandidatePayload {
  candidateId?: string
  profile: CandidateProfile
  pendingFields: Array<'name' | 'email' | 'phone'>
}

interface AddMessagePayload {
  candidateId: string
  message: CandidateRecord['chat'][number]
}

interface UpdateProfilePayload {
  candidateId: string
  profile: Partial<CandidateProfile>
  pendingFields?: Array<'name' | 'email' | 'phone'>
}

interface SetQuestionsPayload {
  candidateId: string
  questions: InterviewQuestion[]
}

interface RecordAnswerPayload {
  candidateId: string
  questionIndex: number
  answer: string
  status: QuestionStatus
  score: number
  submittedAt: string
}

interface FinalizeCandidatePayload {
  candidateId: string
  summary: string
  finalScore: number
}

export const initialInterviewState: InterviewState = {
  candidates: {},
  candidateOrder: [],
  activeCandidateId: null,
  currentQuestionIndex: 0,
  questionDeadline: null,
  pausedAt: null,
  pausedRemainingSeconds: null,
  welcomeBackSeenAt: null,
}

const interviewSlice = createSlice({
  name: 'interview',
  initialState: initialInterviewState,
  reducers: {
    startCandidate: (state, action: PayloadAction<StartCandidatePayload>) => {
      const id = action.payload.candidateId ?? createId()
      const timestamp = new Date().toISOString()

      const pendingFields = action.payload.pendingFields.filter(
        (field): field is 'name' | 'email' | 'phone' => field === 'name' || field === 'email' || field === 'phone'
      )

      state.candidates[id] = {
        id,
        profile: action.payload.profile,
        pendingProfileFields: pendingFields,
        chat: [
          {
            id: createId(),
            role: 'system',
            content: 'Hi! I\'m your AI interviewer. Let\'s get your profile ready before we jump in.',
            createdAt: timestamp,
          },
        ],
        questions: [],
        status: 'collecting-profile',
        createdAt: timestamp,
        updatedAt: timestamp,
        totalTimeSeconds: 0,
      }

      state.candidateOrder.unshift(id)
      state.activeCandidateId = id
      state.currentQuestionIndex = 0
      state.questionDeadline = null
      state.pausedAt = null
      state.pausedRemainingSeconds = null
    },
    setActiveCandidate: (state, action: PayloadAction<string | null>) => {
      state.activeCandidateId = action.payload
      state.currentQuestionIndex = 0
      state.questionDeadline = null
      state.pausedAt = null
      state.pausedRemainingSeconds = null
    },
    addChatMessage: (state, action: PayloadAction<AddMessagePayload>) => {
      const candidate = state.candidates[action.payload.candidateId]
      if (!candidate) return

      candidate.chat.push(action.payload.message)
      candidate.updatedAt = action.payload.message.createdAt
    },
    updateProfile: (state, action: PayloadAction<UpdateProfilePayload>) => {
      const candidate = state.candidates[action.payload.candidateId]
      if (!candidate) return

      candidate.profile = {
        ...candidate.profile,
        ...action.payload.profile,
      }
      if (action.payload.pendingFields) {
        candidate.pendingProfileFields = action.payload.pendingFields.filter(
          (field): field is 'name' | 'email' | 'phone' =>
            field === 'name' || field === 'email' || field === 'phone'
        )
      }
      candidate.updatedAt = new Date().toISOString()
    },
    setQuestions: (state, action: PayloadAction<SetQuestionsPayload>) => {
      const candidate = state.candidates[action.payload.candidateId]
      if (!candidate) return

      candidate.questions = action.payload.questions.map((question) => ({
        ...question,
        status: 'pending',
        answer: undefined,
        askedAt: undefined,
        answeredAt: undefined,
        score: undefined,
      }))
      candidate.status = 'ready'
      candidate.updatedAt = new Date().toISOString()
    },
    setQuestionDeadline: (
      state,
      action: PayloadAction<{ questionIndex: number; deadline: string | null }>
    ) => {
      state.currentQuestionIndex = action.payload.questionIndex
      state.questionDeadline = action.payload.deadline
      if (!action.payload.deadline) {
        state.pausedAt = null
        state.pausedRemainingSeconds = null
      }
    },
    updateCandidateStatus: (
      state,
      action: PayloadAction<{ candidateId: string; status: CandidateRecord['status'] }>
    ) => {
      const candidate = state.candidates[action.payload.candidateId]
      if (!candidate) return

      candidate.status = action.payload.status
      candidate.updatedAt = new Date().toISOString()
    },
    setPausedAt: (
      state,
      action: PayloadAction<{ pausedAt: string | null; remainingSeconds: number | null }>
    ) => {
      state.pausedAt = action.payload.pausedAt
      state.pausedRemainingSeconds = action.payload.remainingSeconds
    },
    recordAnswer: (state, action: PayloadAction<RecordAnswerPayload>) => {
      const candidate = state.candidates[action.payload.candidateId]
      if (!candidate) return

      const question = candidate.questions[action.payload.questionIndex]
      if (!question) return

      question.answer = action.payload.answer
      question.status = action.payload.status
      question.score = action.payload.score
      question.answeredAt = action.payload.submittedAt

      const askedAt = question.askedAt ? dayjs(question.askedAt) : dayjs(action.payload.submittedAt)
      const answeredAt = dayjs(action.payload.submittedAt)
      const seconds = answeredAt.diff(askedAt, 'second')
      candidate.totalTimeSeconds += Math.max(0, seconds)
      candidate.updatedAt = action.payload.submittedAt
      state.questionDeadline = null
    },
    stampQuestionAsked: (
      state,
      action: PayloadAction<{ candidateId: string; questionIndex: number; askedAt: string }>
    ) => {
      const candidate = state.candidates[action.payload.candidateId]
      if (!candidate) return
      const question = candidate.questions[action.payload.questionIndex]
      if (!question) return
      question.askedAt = action.payload.askedAt
      question.status = 'pending'
      candidate.updatedAt = action.payload.askedAt
      candidate.status = 'in-progress'
    },
    finalizeCandidate: (state, action: PayloadAction<FinalizeCandidatePayload>) => {
      const candidate = state.candidates[action.payload.candidateId]
      if (!candidate) return

      candidate.summary = action.payload.summary
      candidate.finalScore = action.payload.finalScore
      candidate.status = 'completed'
      candidate.updatedAt = new Date().toISOString()
      state.questionDeadline = null
      state.pausedAt = null
      state.pausedRemainingSeconds = null
      state.activeCandidateId = action.payload.candidateId
    },
    setWelcomeBackSeenAt: (state, action: PayloadAction<string | null>) => {
      state.welcomeBackSeenAt = action.payload
    },
    resetSession: (state) => {
      state.activeCandidateId = null
      state.currentQuestionIndex = 0
      state.questionDeadline = null
      state.pausedAt = null
      state.pausedRemainingSeconds = null
    },
  },
})

export const {
  startCandidate,
  setActiveCandidate,
  addChatMessage,
  updateProfile,
  setQuestions,
  setQuestionDeadline,
  updateCandidateStatus,
  setPausedAt,
  recordAnswer,
  stampQuestionAsked,
  finalizeCandidate,
  setWelcomeBackSeenAt,
  resetSession,
} = interviewSlice.actions

export default interviewSlice.reducer
