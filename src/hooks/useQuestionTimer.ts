import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'

import { useAppDispatch, useAppSelector } from '../app/hooks'
import {
  selectActiveCandidateId,
  selectPausedRemainingSeconds,
  selectQuestionDeadline,
} from '../features/interview/selectors'
import { autoSubmitCurrentQuestion } from '../features/interview/interviewThunks'

export const useQuestionTimer = () => {
  const dispatch = useAppDispatch()
  const deadline = useAppSelector(selectQuestionDeadline)
  const pausedRemainingSeconds = useAppSelector(selectPausedRemainingSeconds)
  const activeCandidateId = useAppSelector(selectActiveCandidateId)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const hasTriggeredAutoSubmit = useRef(false)

  useEffect(() => {
    hasTriggeredAutoSubmit.current = false
  }, [deadline, activeCandidateId])

  useEffect(() => {
    if (!deadline) {
      setRemainingSeconds(pausedRemainingSeconds)
      return
    }

    const calculate = () => {
      const diff = dayjs(deadline).diff(dayjs(), 'second')
      setRemainingSeconds(diff)
    }

    calculate()
    const interval = window.setInterval(calculate, 1000)
    return () => window.clearInterval(interval)
  }, [deadline, pausedRemainingSeconds])

  useEffect(() => {
    if (!deadline) return
    if (remainingSeconds === null) return
    if (remainingSeconds > 0) return
    if (hasTriggeredAutoSubmit.current) return

    hasTriggeredAutoSubmit.current = true
    dispatch(autoSubmitCurrentQuestion())
  }, [deadline, remainingSeconds, dispatch])

  return {
    remainingSeconds,
    isRunning: Boolean(deadline),
  }
}

export default useQuestionTimer
