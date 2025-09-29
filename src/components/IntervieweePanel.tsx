import { Alert, Card, Empty, Space, Tag, Typography } from 'antd'

import { useAppSelector } from '../app/hooks'
import { selectActiveCandidate } from '../features/interview/selectors'
import ResumeUploader from './ResumeUploader'
import InterviewChat from './chat/InterviewChat'

const { Title, Text, Paragraph } = Typography

const fieldLabels: Record<'name' | 'email' | 'phone', string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
}

const renderField = (label: string, value?: string) => (
  <Space direction="vertical" size={4} style={{ width: '100%' }}>
    <Text type="secondary">{label}</Text>
    <Text strong>{value ?? 'Pending'}</Text>
  </Space>
)

const ProfileCard = () => {
  const candidate = useAppSelector(selectActiveCandidate)

  if (!candidate) {
    return (
      <Card variant="outlined">
        <Empty description="Upload a resume to begin the interview." />
      </Card>
    )
  }

  const pending = candidate.pendingProfileFields.filter(
    (field): field is 'name' | 'email' | 'phone' => field === 'name' || field === 'email' || field === 'phone'
  )

  return (
    <Card variant="outlined" style={{ marginBottom: 24 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={4} style={{ marginBottom: 0 }}>
          Candidate profile
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          We automatically extract core contact details. Share anything missing in the chat before starting.
        </Paragraph>
        <Space style={{ width: '100%' }} size={24} wrap>
          {renderField(fieldLabels.name, candidate.profile.name)}
          {renderField(fieldLabels.email, candidate.profile.email)}
          {renderField(fieldLabels.phone, candidate.profile.phone)}
          {candidate.profile.resumeFileName && (
            <Space direction="vertical" size={4}>
              <Text type="secondary">Resume</Text>
              <Tag color="blue">{candidate.profile.resumeFileName}</Tag>
            </Space>
          )}
        </Space>
        {pending.length > 0 ? (
          <Alert
            type="warning"
            message="Information needed"
            description={
              <Space wrap>
                {pending.map((field) => (
                  <Tag color="gold" key={field}>
                    {fieldLabels[field as keyof typeof fieldLabels]}
                  </Tag>
                ))}
              </Space>
            }
            showIcon
          />
        ) : (
          <Alert
            type="success"
            message="Profile is complete — ready to interview!"
            showIcon
          />
        )}
      </Space>
    </Card>
  )
}

const IntervieweePanel = () => {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <ResumeUploader />
      <ProfileCard />
      <InterviewChat />
    </Space>
  )
}

export default IntervieweePanel
