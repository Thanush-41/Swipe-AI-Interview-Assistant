import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import { useAppDispatch, useAppSelector } from '../app/hooks'
import { selectActiveCandidateId, selectCandidatesOrdered } from '../features/interview/selectors'
import { selectCandidateFromDashboard } from '../features/interview/interviewThunks'
import type { CandidateRecord, QuestionStatus } from '../types/interview'
import ChatMessageList from './chat/ChatMessageList'

const { Title, Paragraph, Text } = Typography

const candidateStatusColor: Record<CandidateRecord['status'], string> = {
  'collecting-profile': 'blue',
  ready: 'cyan',
  'in-progress': 'green',
  paused: 'orange',
  completed: 'purple',
}

const questionStatusColor: Record<QuestionStatus, string> = {
  pending: 'default',
  answered: 'green',
  'auto-submitted': 'volcano',
}

const friendlyStatus = (status: string) => status.replace(/-/g, ' ')

const InterviewerPanel = () => {
  const dispatch = useAppDispatch()
  const candidates = useAppSelector(selectCandidatesOrdered)
  const activeCandidateId = useAppSelector(selectActiveCandidateId)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)

  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const scoreA = a.finalScore ?? -1
      const scoreB = b.finalScore ?? -1
      if (scoreA === scoreB) {
        return dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf()
      }
      return scoreB - scoreA
    })
  }, [candidates])

  const filteredCandidates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return sortedCandidates
    return sortedCandidates.filter((candidate) => {
      const { profile } = candidate
      return (
        profile.name?.toLowerCase().includes(term) ||
        profile.email?.toLowerCase().includes(term) ||
        profile.resumeFileName?.toLowerCase().includes(term) ||
        candidate.summary?.toLowerCase().includes(term)
      )
    })
  }, [sortedCandidates, searchTerm])

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId]
  )

  const columns: ColumnsType<typeof filteredCandidates[number]> = [
    {
      title: 'Candidate',
      dataIndex: ['profile', 'name'],
      key: 'name',
      fixed: 'left',
      width: 160,
      render: (_value, record) => (
        <Space direction="vertical" size={4}>
          <Text strong>{record.profile.name ?? 'Unknown'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.profile.email ?? '—'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: ['profile', 'email'],
      key: 'email',
      responsive: ['xl'],
      render: (value: string | undefined) => value ?? '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: CandidateRecord['status']) => (
        <Tag color={candidateStatusColor[value] ?? 'default'}>{friendlyStatus(value)}</Tag>
      ),
    },
    {
      title: 'Score',
      dataIndex: 'finalScore',
      key: 'score',
      width: 80,
      sorter: (a, b) => (a.finalScore ?? -1) - (b.finalScore ?? -1),
      defaultSortOrder: 'descend',
      render: (value: number | undefined) => (typeof value === 'number' ? `${value}/100` : '—'),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      responsive: ['md'],
      render: (value: string) => dayjs(value).format('MMM D, HH:mm'),
    },
  ]

  return (
    <Card variant="outlined">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            Interviewer dashboard
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Track scores, review transcripts, and jump back into any candidate interview.
          </Paragraph>
        </div>

        <Input.Search
          placeholder="Search by name, email, or summary"
          allowClear
          onChange={(event) => setSearchTerm(event.target.value)}
          value={searchTerm}
          style={{ maxWidth: 360, width: '100%' }}
          size="large"
        />

        {filteredCandidates.length === 0 ? (
          <Empty description={searchTerm ? 'No matches for your search.' : 'No candidates yet'} />
        ) : (
          <Table
            dataSource={filteredCandidates}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 5, showSizeChanger: false, showQuickJumper: true }}
            onRow={(record) => ({
              onClick: () => setSelectedCandidateId(record.id),
            })}
            rowClassName={(record) => (record.id === activeCandidateId ? 'table-row--active' : '')}
            scroll={{ x: 600 }}
          />
        )}
      </Space>

      <Drawer
        open={Boolean(selectedCandidate)}
        width={720}
        onClose={() => setSelectedCandidateId(null)}
        title={selectedCandidate?.profile.name ?? 'Candidate details'}
        destroyOnClose
        extra={
          selectedCandidate ? (
            <Space>
              <Badge status="processing" text={`Status: ${friendlyStatus(selectedCandidate.status)}`} />
              <Button
                onClick={() => {
                  dispatch(selectCandidateFromDashboard(selectedCandidate.id))
                  setSelectedCandidateId(null)
                }}
              >
                Switch to candidate
              </Button>
            </Space>
          ) : null
        }
      >
        {selectedCandidate ? (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Email">{selectedCandidate.profile.email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedCandidate.profile.phone ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Resume file">
                {selectedCandidate.profile.resumeFileName ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Final score">
                {selectedCandidate.finalScore != null ? `${selectedCandidate.finalScore}/100` : 'In progress'}
              </Descriptions.Item>
              <Descriptions.Item label="Summary">
                {selectedCandidate.summary ?? 'No summary yet.'}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Question performance">
              <Space direction="vertical" style={{ width: '100%' }}>
                {selectedCandidate.questions.length === 0 ? (
                  <Text type="secondary">No questions generated yet.</Text>
                ) : (
                  selectedCandidate.questions.map((question, index) => (
                  <Card key={question.id} size="small" type="inner">
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space align="center" size={12}>
                        <Tag color={questionStatusColor[question.status]}>
                          {friendlyStatus(question.status)}
                        </Tag>
                        <Tag
                          color={
                            question.difficulty === 'easy'
                              ? 'green'
                              : question.difficulty === 'medium'
                                ? 'gold'
                                : 'red'
                          }
                        >
                          {question.difficulty.toUpperCase()}
                        </Tag>
                        <Text type="secondary">Question {index + 1}</Text>
                      </Space>
                      <Text strong>{question.prompt}</Text>
                      <Text type="secondary">
                        Score: {question.score != null ? `${question.score}/100` : 'Pending'} · Time limit:{' '}
                        {question.timeLimitSeconds}s
                      </Text>
                      {question.answer && (
                        <Paragraph style={{ marginBottom: 0 }}>
                          <Text type="secondary">Answer:</Text> {question.answer}
                        </Paragraph>
                      )}
                    </Space>
                  </Card>
                  ))
                )}
              </Space>
            </Card>

            <Card size="small" title="Conversation transcript">
              <ChatMessageList messages={selectedCandidate.chat} />
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </Card>
  )
}

export default InterviewerPanel
