import { useCallback, useMemo, useState } from 'react'
import { Button, Card, Flex, Input, Space, Statistic, Tag, Tooltip, Typography } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined, SendOutlined } from '@ant-design/icons'

import { useAppDispatch, useAppSelector } from '../../app/hooks'
import ChatMessageList from './ChatMessageList'
import { selectActiveCandidate, selectCurrentQuestionIndex } from '../../features/interview/selectors'
import {
  beginInterview,
  pauseInterview,
  resumeInterview,
  submitCandidateMessage,
} from '../../features/interview/interviewThunks'
import useQuestionTimer from '../../hooks/useQuestionTimer'
import './chat.css'

const { Text, Paragraph } = Typography

const difficultyColor: Record<'easy' | 'medium' | 'hard', string> = {
  easy: 'green',
  medium: 'gold',
  hard: 'red',
}

const InterviewChat = () => {
  const dispatch = useAppDispatch()
  const candidate = useAppSelector(selectActiveCandidate)
  const currentQuestionIndex = useAppSelector(selectCurrentQuestionIndex)
  const { remainingSeconds } = useQuestionTimer()
  const [inputValue, setInputValue] = useState('')

  const currentQuestion = useMemo(() => {
    if (!candidate) return null
    return candidate.questions[currentQuestionIndex] ?? null
  }, [candidate, currentQuestionIndex])

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    dispatch(submitCandidateMessage(trimmed))
    setInputValue('')
  }, [dispatch, inputValue])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const allowInput = Boolean(
    candidate && 
    candidate.status !== 'completed' && 
    !(candidate.status === 'collecting-profile' && candidate.pendingProfileFields.length === 0)
  )

  const actionButton = useMemo(() => {
    if (!candidate) return null

    switch (candidate.status) {
      case 'collecting-profile':
        if (candidate.pendingProfileFields.length > 0) {
          return (
            <Tooltip title="Share any missing info in the chat below to continue.">
              <Button type="default" size="small">
                Missing: {candidate.pendingProfileFields.join(', ')}
              </Button>
            </Tooltip>
          )
        }
        return (
          <Button type="primary" disabled>
            Processing...
          </Button>
        )

      case 'ready':
        return (
          <Button type="primary" onClick={() => dispatch(beginInterview())}>
            Start interview
          </Button>
        )

      case 'in-progress':
        return (
          <Button icon={<PauseCircleOutlined />} onClick={() => dispatch(pauseInterview())}>
            Pause
          </Button>
        )

      case 'paused':
        return (
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => dispatch(resumeInterview())}>
            Resume
          </Button>
        )

      case 'completed':
        return (
          <Button disabled>
            Interview Complete
          </Button>
        )

      default:
        return null
    }
  }, [candidate, dispatch])

  const timerDisplay = useMemo(() => {
    if (!candidate) return null
    if (!currentQuestion) return null
    if (candidate.status !== 'in-progress' && candidate.status !== 'paused') return null

    const seconds = Math.max(0, remainingSeconds ?? currentQuestion.timeLimitSeconds)
    return (
      <Statistic
        title="Time remaining"
        value={seconds}
        suffix="s"
        precision={0}
        valueStyle={{ color: seconds <= 10 && candidate.status === 'in-progress' ? '#ff4d4f' : undefined }}
      />
    )
  }, [candidate, currentQuestion, remainingSeconds])

  const questionMeta = useMemo(() => {
    if (!candidate) return null
    if (!currentQuestion) return null

    return (
      <Flex gap={12} align="center">
        <Tag color={difficultyColor[currentQuestion.difficulty]}>
          {currentQuestion.difficulty.toUpperCase()}
        </Tag>
        <Text type="secondary">Question {currentQuestionIndex + 1} / 6</Text>
      </Flex>
    )
  }, [candidate, currentQuestion, currentQuestionIndex])

  return (
    <Card variant="outlined">
      <Flex vertical gap={16} style={{ width: '100%' }}>
        <Flex align="center" justify="space-between">
          <div>
            <Text strong>Interview chat</Text>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Your conversation with the AI interviewer will appear here.
            </Paragraph>
          </div>
          <Space align="center" size={16}>
            {questionMeta}
            {timerDisplay}
            {actionButton}
          </Space>
        </Flex>

        <ChatMessageList messages={candidate?.chat ?? []} />

        <Flex gap={12} align="end">
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder={candidate ? 'Type your message…' : 'Upload a resume to start chatting.'}
            value={inputValue}
            disabled={!allowInput}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            showCount
            maxLength={2000}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!allowInput || !inputValue.trim()}
            size="large"
          />
        </Flex>
      </Flex>
    </Card>
  )
}

export default InterviewChat
