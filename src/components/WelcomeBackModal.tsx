import { useEffect, useState } from 'react'
import { Modal, Space, Typography } from 'antd'
import dayjs from 'dayjs'

import { useAppDispatch, useAppSelector } from '../app/hooks'
import { selectCandidatesOrdered, selectInterview } from '../features/interview/selectors'
import { setActiveCandidate } from '../features/interview/interviewSlice'
import { setWelcomeBackSeenAt } from '../features/interview/interviewSlice'

const { Text, Paragraph } = Typography

const friendlyStatus = (status: string) => status.replace(/-/g, ' ')

const WelcomeBackModal = () => {
  const dispatch = useAppDispatch()
  const interview = useAppSelector(selectInterview)
  const candidates = useAppSelector(selectCandidatesOrdered)
  const [visible, setVisible] = useState(false)
  const [candidateId, setCandidateId] = useState<string | null>(null)

  useEffect(() => {
    // Only show if we have candidates and it's been more than 30 seconds since the component mounted
    if (candidates.length === 0) return
    
    const unfinished = candidates.find((candidate) => 
      candidate.status === 'in-progress' || 
      candidate.status === 'paused' || 
      (candidate.status === 'ready' && candidate.questions.length > 0)
    )
    if (!unfinished) return

    const lastSeen = interview.welcomeBackSeenAt
    const lastActivity = dayjs(unfinished.updatedAt)
    
    // Only show if last activity was more than 1 minute ago and we haven't seen this modal recently
    if (dayjs().diff(lastActivity, 'minutes') < 1) return
    if (lastSeen && dayjs(lastSeen).isAfter(lastActivity)) return

    // Delay showing the modal slightly to avoid jarring experience
    const timeout = setTimeout(() => {
      setCandidateId(unfinished.id)
      setVisible(true)
    }, 500)

    return () => clearTimeout(timeout)
  }, [candidates, interview.welcomeBackSeenAt])

  const handleClose = () => {
    setVisible(false)
    setCandidateId(null)
    dispatch(setWelcomeBackSeenAt(new Date().toISOString()))
  }

  const handleResume = () => {
    if (candidateId) {
      dispatch(setActiveCandidate(candidateId))
    }
    handleClose()
  }

  if (!candidateId) return null

  const candidate = candidates.find((item) => item.id === candidateId)

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      onOk={handleResume}
      okText="Resume interview"
      cancelText="Dismiss"
      title="Welcome back!"
      width={480}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Paragraph>
          <Text strong>{candidate?.profile.name ?? 'Your candidate'}</Text> was in an interview when you last visited.
        </Paragraph>
        <Paragraph>
          Current status: <Text strong>{candidate ? friendlyStatus(candidate.status) : 'Unknown'}</Text>
        </Paragraph>
        <Paragraph>
          Would you like to jump back in from where you left off? All prior answers, timers, and progress are preserved locally on your device.
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: 0 }}>
          You can also access this candidate later from the Interviewer dashboard.
        </Paragraph>
      </Space>
    </Modal>
  )
}

export default WelcomeBackModal
