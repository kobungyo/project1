import { Layout, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useWorkflow } from '../../context/WorkflowContext';
import { ExecutionTree } from './ExecutionTree';
import { ExecutionDetail } from './ExecutionDetail';
import { ResizableLayout } from '../common/ResizableLayout';

const { Header } = Layout;

export function ExecutionMode() {
  const { setMode } = useWorkflow();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#52c41a',
          padding: '0 24px',
        }}
      >
        <h1 style={{ color: 'white', margin: 0, fontSize: '18px' }}>
          プロセス実行
        </h1>
        <Button
          icon={<LogoutOutlined />}
          onClick={() => setMode('home')}
        >
          終了
        </Button>
      </Header>
      <ResizableLayout
        siderContent={<ExecutionTree />}
        mainContent={<ExecutionDetail />}
        defaultWidth={300}
        minWidth={200}
        maxWidth={500}
        storageKey="execution-sider-width"
      />
    </Layout>
  );
}
