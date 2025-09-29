import { InboxOutlined } from '@ant-design/icons'
import { Card, Typography, Upload, message, Flex } from 'antd'
import type { UploadProps } from 'antd'
import { useCallback, useState } from 'react'

import { useAppDispatch, useAppSelector } from '../app/hooks'
import {
  addChatMessage,
  setActiveCandidate,
  startCandidate,
  updateCandidateStatus,
} from '../features/interview/interviewSlice'
import { selectActiveCandidate } from '../features/interview/selectors'
import { createId } from '../utils/id'
import { missingProfileFields, parseResumeFile } from '../utils/resumeParser'

const { Title, Paragraph } = Typography

const acceptedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

const buildIntroMessage = (candidateName?: string) =>
  candidateName
    ? `Thanks, ${candidateName}! Let me skim your resume and get the interview ready.`
    : 'Thanks! I have your resume now. I will extract the essentials so we can get started.'

const fieldLabels: Record<'name' | 'email' | 'phone', string> = {
  name: 'name',
  email: 'email address',
  phone: 'phone number',
}

export const ResumeUploader = () => {
  const dispatch = useAppDispatch()
  const activeCandidate = useAppSelector(selectActiveCandidate)
  const [loading, setLoading] = useState(false)

  const disabled = Boolean(activeCandidate && activeCandidate.status !== 'completed')

  const handleFile = useCallback<Required<UploadProps>['beforeUpload']>(async (file) => {
    if (disabled) {
      message.warning('Finish or pause the current interview before starting a new one.')
      return Upload.LIST_IGNORE
    }

    if (loading) {
      message.warning('Please wait for the current file to finish processing.')
      return Upload.LIST_IGNORE
    }

    const lowerName = file.name.toLowerCase()
    const isAcceptedType =
      acceptedTypes.includes(file.type) || ['.pdf', '.docx'].some((ext) => lowerName.endsWith(ext))

    if (!isAcceptedType) {
      message.error('Please upload a PDF or DOCX resume. Other file formats are not supported.')
      return Upload.LIST_IGNORE
    }

    setLoading(true)
    try {
      const parsedProfile = await parseResumeFile(file as File)
      const candidateId = createId()
      const pending = missingProfileFields(parsedProfile)
      dispatch(
        startCandidate({
          candidateId,
          profile: {
            ...parsedProfile,
            resumeFileName: file.name,
          },
          pendingFields: pending,
        })
      )
      message.success('Resume parsed successfully!')
      dispatch(setActiveCandidate(candidateId))
      dispatch(
        addChatMessage({
          candidateId,
          message: {
            id: createId(),
            role: 'ai',
            content: buildIntroMessage(parsedProfile.name),
            createdAt: new Date().toISOString(),
          },
        })
      )

      if (pending.length) {
        const missingSentence = pending
          .map((field) => fieldLabels[field])
          .join(', ')
        dispatch(
          addChatMessage({
            candidateId,
            message: {
              id: createId(),
              role: 'ai',
              content: `I still need your ${missingSentence} before we begin. Could you share it now?`,
              createdAt: new Date().toISOString(),
            },
          })
        )
      } else {
        dispatch(updateCandidateStatus({ candidateId, status: 'ready' }))
        dispatch(
          addChatMessage({
            candidateId,
            message: {
              id: createId(),
              role: 'ai',
              content: 'Awesome! I have everything I need. Let me know when you would like to start.',
              createdAt: new Date().toISOString(),
            },
          })
        )
      }
    } catch (error) {
      console.error('Resume parsing error:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Something went wrong parsing the resume. Please try a different file.'
      message.error(errorMessage, 6) // Show error for 6 seconds
    } finally {
      setLoading(false)
    }

    return Upload.LIST_IGNORE
  }, [activeCandidate, dispatch, disabled])

  return (
    <Card loading={loading} variant="outlined" style={{ marginBottom: 24 }}>
      <Flex vertical gap={12} align="start">
        <Title level={4}>Upload your resume to get started</Title>
        <Paragraph type="secondary">
          Supported formats: PDF (preferred) or DOCX. We will extract your name, email, and phone number automatically.
        </Paragraph>
        <Upload.Dragger
          multiple={false}
          showUploadList={false}
          beforeUpload={handleFile}
          accept=".pdf,.docx"
          disabled={disabled || loading}
          style={{ width: '100%' }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">We never send your data to a server. Everything stays on this device.</p>
        </Upload.Dragger>
      </Flex>
    </Card>
  )
}

export default ResumeUploader
