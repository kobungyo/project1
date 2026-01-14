import { Layout, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useWorkflow } from '../../context/WorkflowContext';
import { ProcessTree } from './ProcessTree';
import { ProcessDetail } from './ProcessDetail';

const { Header, Sider, Content } = Layout;

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
      <Layout>
        <Sider
          width={300}
          style={{
            backgroundColor: 'white',
            borderRight: '1px solid #f0f0f0',
            overflow: 'auto',
          }}
        >
          <ProcessTree />
        </Sider>
        <Content
          style={{
            padding: '24px',
            backgroundColor: '#f5f5f5',
            overflow: 'auto',
          }}
        >
          <ProcessDetail />
        </Content>
      </Layout>
    </Layout>
  );
}
