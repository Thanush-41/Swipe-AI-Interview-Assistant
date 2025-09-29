import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'
import type { CandidateRecord } from '../../types/interview'
import { initialInterviewState } from './interviewSlice'

const withFallback = (state: RootState) => {
  const typedState = state as RootState & {
    interview?: typeof initialInterviewState
  }

  return typedState.interview ?? initialInterviewState
}

export const selectInterview = (state: RootState) => withFallback(state)

export const selectActiveCandidateId = (state: RootState) => withFallback(state).activeCandidateId

export const selectActiveCandidate = createSelector(
  [selectInterview],
  (interview): CandidateRecord | null => {
    const id = interview.activeCandidateId
    if (!id) return null
    return interview.candidates[id] ?? null
  }
)

export const selectCandidateById = (state: RootState, candidateId: string) =>
  withFallback(state).candidates[candidateId] ?? null

export const selectCandidatesOrdered = createSelector(
  [selectInterview],
  (interview) => {
    return interview.candidateOrder
      .map((id: string) => interview.candidates[id] ?? null)
      .filter((candidate): candidate is CandidateRecord => Boolean(candidate))
  }
)

export const selectCurrentQuestionIndex = (state: RootState) =>
  withFallback(state).currentQuestionIndex

export const selectQuestionDeadline = (state: RootState) => withFallback(state).questionDeadline

export const selectPausedAt = (state: RootState) => withFallback(state).pausedAt

export const selectPausedRemainingSeconds = (state: RootState) =>
  withFallback(state).pausedRemainingSeconds

export const selectWelcomeBackLastSeen = (state: RootState) =>
  withFallback(state).welcomeBackSeenAt
