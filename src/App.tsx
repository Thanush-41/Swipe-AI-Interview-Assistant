import { Layout, Tabs, Typography } from 'antd'
import type { TabsProps } from 'antd'

import IntervieweePanel from './components/IntervieweePanel'
import InterviewerPanel from './components/InterviewerPanel'
import WelcomeBackModal from './components/WelcomeBackModal'
import './App.css'

const { Header, Content } = Layout
const { Title, Paragraph } = Typography

const tabItems: TabsProps['items'] = [
  {
    key: 'interviewee',
    label: 'Interviewee',
    children: <IntervieweePanel />,
  },
  {
    key: 'interviewer',
    label: 'Interviewer',
    children: <InterviewerPanel />,
  },
]

const App = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <WelcomeBackModal />
      <Header className="app-layout__header">
        <div className="app-layout__inner">
          <Title level={3} style={{ marginBottom: 4 }}>
            Swipe AI Interview Assistant
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            A synchronized experience for candidates and interviewers.
          </Paragraph>
        </div>
      </Header>
      <Content style={{ padding: '32px 24px' }}>
        <div className="app-layout__inner">
          <Tabs items={tabItems} defaultActiveKey="interviewee" size="large" />
        </div>
      </Content>
    </Layout>
  )
}

export default App
