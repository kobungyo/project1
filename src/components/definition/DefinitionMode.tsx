import { Layout, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useWorkflow } from '../../context/WorkflowContext';
import { ProcessTree } from './ProcessTree';
import { ProcessDetail } from './ProcessDetail';
import { ResizableLayout } from '../common/ResizableLayout';

const { Header } = Layout;

export function DefinitionMode() {
  const { setMode } = useWorkflow();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1890ff',
          padding: '0 24px',
        }}
      >
        <h1 style={{ color: 'white', margin: 0, fontSize: '18px' }}>
          プロセス定義
        </h1>
        <Button
          icon={<LogoutOutlined />}
          onClick={() => setMode('home')}
        >
          終了
        </Button>
      </Header>
      <ResizableLayout
        siderContent={<ProcessTree />}
        mainContent={<ProcessDetail />}
        defaultWidth={300}
        minWidth={200}
        maxWidth={500}
        storageKey="definition-sider-width"
      />
    </Layout>
  );
}
