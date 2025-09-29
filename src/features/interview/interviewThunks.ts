import dayjs from 'dayjs'

import { createId } from '../../utils/id'
import {
  addChatMessage,
  finalizeCandidate,
  recordAnswer,
  setActiveCandidate,
  setPausedAt,
  setQuestionDeadline,
  setQuestions,
  stampQuestionAsked,
  updateCandidateStatus,
  updateProfile,
} from './interviewSlice'
import { selectInterview } from './selectors'
import { buildCandidateSummary, computeFinalScore, scoreAnswer } from '../../utils/scoring'
import { enrichProfileFromMessage, missingProfileFields } from '../../utils/resumeParser'
import { generateQuestionSet } from '../../utils/questionBank'
import type { AppThunk } from '../../app/store'
import type { ChatMessage, InterviewQuestion } from '../../types/interview'

const createMessage = (role: ChatMessage['role'], content: string): ChatMessage => ({
  id: createId(),
  role,
  content,
  createdAt: new Date().toISOString(),
})

const describeMissingFields = (fields: Array<'name' | 'email' | 'phone'>) => {
  const map: Record<'name' | 'email' | 'phone', string> = {
    name: 'name',
    email: 'email address',
    phone: 'phone number',
  }
  if (!fields.length) return ''
  if (fields.length === 1) return map[fields[0]]
  const [last, ...rest] = [...fields].reverse()
  return `${[...rest].reverse().map((field) => map[field]).join(', ')} and ${map[last!]}`
}

const ensureQuestions = (questions: InterviewQuestion[]) => {
  if (questions.length) return questions
  return generateQuestionSet()
}

const findNextQuestionIndex = (questions: InterviewQuestion[]) =>
  questions.findIndex((question) => question.status === 'pending' && !question.answer)

const askQuestion = (
  candidateId: string,
  questionIndex: number,
  question: InterviewQuestion
): AppThunk => (dispatch) => {
  const now = new Date().toISOString()
  dispatch(
    addChatMessage({
      candidateId,
      message: createMessage(
        'ai',
        `Question ${questionIndex + 1}: ${question.prompt}\n(${question.difficulty.toUpperCase()} • ${question.timeLimitSeconds}s)`
      ),
    })
  )
  dispatch(
    stampQuestionAsked({
      candidateId,
      questionIndex,
      askedAt: now,
    })
  )
  dispatch(
    setQuestionDeadline({
      questionIndex,
      deadline: dayjs(now).add(question.timeLimitSeconds, 'second').toISOString(),
    })
  )
}

const finalizeInterview = (candidateId: string): AppThunk => (dispatch, getState) => {
  const state = getState()
  const interview = selectInterview(state)
  const candidate = interview.candidates[candidateId]
  if (!candidate) return

  const finalScore = computeFinalScore(candidate.questions)
  const summary = buildCandidateSummary(candidate)

  dispatch(
    addChatMessage({
      candidateId,
      message: createMessage(
        'ai',
        `That's a wrap! Your final score is ${finalScore}/100. Here's the summary: ${summary}`
      ),
    })
  )
  dispatch(
    finalizeCandidate({
      candidateId,
      finalScore,
      summary,
    })
  )
}

export const submitCandidateMessage = (content: string): AppThunk => (dispatch, getState) => {
  const trimmed = content.trim()
  if (!trimmed) return

  const state = getState()
  const interview = selectInterview(state)
  const candidateId = interview.activeCandidateId
  if (!candidateId) return
  const candidate = interview.candidates[candidateId]
  if (!candidate) return

  const message = createMessage('candidate', trimmed)
  dispatch(
    addChatMessage({
      candidateId,
      message,
    })
  )

  if (candidate.pendingProfileFields.length) {
    const enriched = enrichProfileFromMessage(trimmed, candidate.profile)
    const missing = missingProfileFields(enriched)

    console.log('Profile enrichment debug:', {
      originalMessage: trimmed,
      originalProfile: candidate.profile,
      enrichedProfile: enriched,
      missingFields: missing,
    })

    dispatch(
      updateProfile({
        candidateId,
        profile: enriched,
        pendingFields: missing,
      })
    )

    if (missing.length === 0) {
      dispatch(
        updateCandidateStatus({
          candidateId,
          status: 'ready',
        })
      )
      dispatch(
        addChatMessage({
          candidateId,
          message: createMessage(
            'ai',
            'Great! I have everything I need. Click "Start interview" whenever you are ready.'
          ),
        })
      )
    } else {
      dispatch(
        addChatMessage({
          candidateId,
          message: createMessage(
            'ai',
            `Thanks! I'm still missing your ${describeMissingFields([...missing])}. Could you share that?`
          ),
        })
      )
    }

    return
  }

  if (candidate.status === 'ready') {
    const normalized = trimmed.toLowerCase()
    if (['start', 'start interview', 'begin'].includes(normalized)) {
      dispatch(beginInterview())
    } else {
      dispatch(
        addChatMessage({
          candidateId,
          message: createMessage(
            'ai',
            'Just let me know when you want to begin by clicking the button or typing "start".'
          ),
        })
      )
    }
    return
  }

  if (candidate.status === 'paused') {
    dispatch(
      addChatMessage({
        candidateId,
        message: createMessage('ai', 'We are currently paused. Tap "Resume" when you are ready to continue.'),
      })
    )
    return
  }

  if (candidate.status === 'completed') {
    dispatch(
      addChatMessage({
        candidateId,
        message: createMessage('ai', 'Your interview is complete. Upload another resume to start a new session.'),
      })
    )
    return
  }

  if (candidate.status !== 'in-progress') {
    return
  }

  const refreshedState = selectInterview(getState())
  const activeCandidate = refreshedState.candidates[candidateId]
  if (!activeCandidate) return
  const currentQuestion = activeCandidate.questions[refreshedState.currentQuestionIndex]
  if (!currentQuestion || currentQuestion.status !== 'pending') return

  const score = scoreAnswer(trimmed, currentQuestion.difficulty)
  const submittedAt = new Date().toISOString()
  dispatch(
    recordAnswer({
      candidateId,
      questionIndex: refreshedState.currentQuestionIndex,
      answer: trimmed,
      status: 'answered',
      score,
      submittedAt,
    })
  )

  const feedback = score >= 75
    ? 'Strong response!'
    : score >= 40
      ? 'Good effort; consider adding more specifics next time.'
      : 'Thanks for the answer. We can build on this in future interviews.'

  dispatch(
    addChatMessage({
      candidateId,
      message: createMessage('ai', `${feedback} I scored that answer ${score}/100.`),
    })
  )

  dispatch(advanceInterview())
}

export const beginInterview = (): AppThunk => (dispatch, getState) => {
  const state = getState()
  const interview = selectInterview(state)
  const candidateId = interview.activeCandidateId
  if (!candidateId) return
  const candidate = interview.candidates[candidateId]
  if (!candidate) return

  if (candidate.pendingProfileFields.length) {
    dispatch(
      addChatMessage({
        candidateId,
        message: createMessage(
          'ai',
          `I'm still missing your ${describeMissingFields(
            candidate.pendingProfileFields.filter((field): field is 'name' | 'email' | 'phone' =>
              field === 'name' || field === 'email' || field === 'phone'
            )
          )}.`
        ),
      })
    )
    return
  }

  let questions = ensureQuestions(candidate.questions)
  if (candidate.questions.length === 0) {
    dispatch(
      setQuestions({
        candidateId,
        questions,
      })
    )
  }
  const nextIndex = findNextQuestionIndex(questions)
  if (nextIndex === -1) {
    dispatch(finalizeInterview(candidateId))
    return
  }

  dispatch(
    addChatMessage({
      candidateId,
      message: createMessage(
        'ai',
        'We will go through six questions: 2 easy, 2 medium, and 2 hard. Timer starts when each question is asked.'
      ),
    })
  )
  dispatch(askQuestion(candidateId, nextIndex, questions[nextIndex]))
}

export const advanceInterview = (): AppThunk => (dispatch, getState) => {
  const state = getState()
  const interview = selectInterview(state)
  const candidateId = interview.activeCandidateId
  if (!candidateId) return
  const candidate = interview.candidates[candidateId]
  if (!candidate) return

  const nextIndex = findNextQuestionIndex(candidate.questions)
  if (nextIndex === -1) {
    dispatch(finalizeInterview(candidateId))
    return
  }

  dispatch(askQuestion(candidateId, nextIndex, candidate.questions[nextIndex]))
}

export const autoSubmitCurrentQuestion = (): AppThunk => (dispatch, getState) => {
  const state = getState()
  const interview = selectInterview(state)
  const candidateId = interview.activeCandidateId
  if (!candidateId) return
  const candidate = interview.candidates[candidateId]
  if (!candidate) return
  const question = candidate.questions[interview.currentQuestionIndex]
  if (!question || question.status !== 'pending') return

  const submittedAt = new Date().toISOString()
  dispatch(
    recordAnswer({
      candidateId,
      questionIndex: interview.currentQuestionIndex,
      answer: '',
      status: 'auto-submitted',
      score: 0,
      submittedAt,
    })
  )
  dispatch(
    addChatMessage({
      candidateId,
      message: createMessage('ai', "Time's up! Let's move to the next question."),
    })
  )
  dispatch(advanceInterview())
}

export const pauseInterview = (): AppThunk => (dispatch, getState) => {
  const state = getState()
  const interview = selectInterview(state)
  const candidateId = interview.activeCandidateId
  if (!candidateId) return
  const candidate = interview.candidates[candidateId]
  if (!candidate) return
  const deadline = interview.questionDeadline
  if (!deadline) return

  const remaining = Math.max(0, dayjs(deadline).diff(dayjs(), 'second'))
  dispatch(
    setQuestionDeadline({
      questionIndex: interview.currentQuestionIndex,
      deadline: null,
    })
  )
  dispatch(
    setPausedAt({
      pausedAt: new Date().toISOString(),
      remainingSeconds: remaining,
    })
  )
  dispatch(
    updateCandidateStatus({
      candidateId,
      status: 'paused',
    })
  )
  dispatch(
    addChatMessage({
      candidateId,
      message: createMessage('ai', 'Sure thing, the interview is paused. Resume when you are ready.'),
    })
  )
}

export const resumeInterview = (): AppThunk => (dispatch, getState) => {
  const state = getState()
  const interview = selectInterview(state)
  const candidateId = interview.activeCandidateId
  if (!candidateId) return
  const candidate = interview.candidates[candidateId]
  if (!candidate) return
  if (candidate.status !== 'paused') return

  const remaining = interview.pausedRemainingSeconds ?? 0
  const question = candidate.questions[interview.currentQuestionIndex]
  if (!question) return
  const timeBudget = remaining > 0 ? remaining : question.timeLimitSeconds

  const now = new Date().toISOString()
  dispatch(
    setQuestionDeadline({
      questionIndex: interview.currentQuestionIndex,
      deadline: dayjs(now).add(timeBudget, 'second').toISOString(),
    })
  )
  dispatch(
    setPausedAt({
      pausedAt: null,
      remainingSeconds: null,
    })
  )
  dispatch(
    updateCandidateStatus({
      candidateId,
      status: 'in-progress',
    })
  )
  dispatch(
    addChatMessage({
      candidateId,
      message: createMessage('ai', 'Welcome back! Picking up right where we left off.'),
    })
  )
}

export const selectCandidateFromDashboard = (candidateId: string): AppThunk => (dispatch) => {
  dispatch(setActiveCandidate(candidateId))
}
