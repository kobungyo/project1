import { Card, Typography, Space, Button, Popconfirm, message, Divider } from 'antd';
import { SettingOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useWorkflow } from '../../context/WorkflowContext';

const { Title, Text } = Typography;

export function HomePage() {
  const { setMode, state, clearAllExecutions, clearAllCustomDefinitions } = useWorkflow();

  const customProcessCount = state.definitions.filter((def) => !def.isBase).length;
  const executionCount = state.executions.length;

  const handleClearExecutions = () => {
    clearAllExecutions();
    message.success('全てのプロセスインスタンスを削除しました');
  };

  const handleClearDefinitions = () => {
    clearAllCustomDefinitions();
    message.success('全てのカスタムプロセスを削除しました');
  };

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

      <Divider style={{ margin: '48px 0 24px' }} />

      <Space direction="vertical" size="middle" style={{ width: 300 }}>
        <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
          データ管理
        </Text>
        <Popconfirm
          title="全てのプロセスインスタンスを削除しますか？"
          description="この操作は取り消せません"
          onConfirm={handleClearExecutions}
          okText="削除"
          cancelText="キャンセル"
          okButtonProps={{ danger: true }}
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            block
            disabled={executionCount === 0}
          >
            全てのインスタンスを削除 ({executionCount}件)
          </Button>
        </Popconfirm>
        <Popconfirm
          title="全てのカスタムプロセスを削除しますか？"
          description="この操作は取り消せません。ベースプロセスは残ります。"
          onConfirm={handleClearDefinitions}
          okText="削除"
          cancelText="キャンセル"
          okButtonProps={{ danger: true }}
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            block
            disabled={customProcessCount === 0}
          >
            全てのカスタムプロセスを削除 ({customProcessCount}件)
          </Button>
        </Popconfirm>
      </Space>
    </div>
  );
}
