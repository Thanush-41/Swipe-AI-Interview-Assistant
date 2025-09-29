import { Empty, Typography } from 'antd'
import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import type { ChatMessage } from '../../types/interview'
import dayjs from 'dayjs'

interface ChatMessageListProps {
  messages: ChatMessage[]
}

const roleClass: Record<ChatMessage['role'], string> = {
  ai: 'chat-message--ai',
  candidate: 'chat-message--candidate',
  system: 'chat-message--system',
}

const ChatMessageList: FC<ChatMessageListProps> = ({ messages }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="chat-message-list" ref={containerRef}>
      {messages.length === 0 ? (
        <Empty description="No messages yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        messages.map((message) => (
          <div className={`chat-message ${roleClass[message.role]}`} key={message.id}>
            <div className="chat-message__bubble">
              <Typography.Text>{message.content}</Typography.Text>
            </div>
            <Typography.Text className="chat-message__meta" type="secondary">
              {dayjs(message.createdAt).format('HH:mm')}
            </Typography.Text>
          </div>
        ))
      )}
    </div>
  )
}

export default ChatMessageList
