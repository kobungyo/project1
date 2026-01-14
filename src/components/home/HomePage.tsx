import { Card, Typography, Space } from 'antd';
import { SettingOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useWorkflow } from '../../context/WorkflowContext';

const { Title, Text } = Typography;

export function HomePage() {
  const { setMode } = useWorkflow();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        padding: '24px',
      }}
    >
      <Title level={2} style={{ marginBottom: '48px' }}>
        ワークフローシステム
      </Title>

      <Space size="large">
        <Card
          hoverable
          style={{ width: 280, textAlign: 'center' }}
          onClick={() => setMode('definition')}
        >
          <SettingOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={4}>プロセス定義</Title>
          <Text type="secondary">
            ワークフローのプロセスを定義・編集します
          </Text>
        </Card>

        <Card
          hoverable
          style={{ width: 280, textAlign: 'center' }}
          onClick={() => setMode('execution')}
        >
          <PlayCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
          <Title level={4}>プロセス実行</Title>
          <Text type="secondary">
            定義されたプロセスを実行・管理します
          </Text>
        </Card>
      </Space>
    </div>
  );
}
