import { ConfigProvider } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import { useWorkflow } from './context/WorkflowContext';
import { HomePage } from './components/home/HomePage';
import { DefinitionMode } from './components/definition/DefinitionMode';
import { ExecutionMode } from './components/execution/ExecutionMode';

function AppContent() {
  const { state } = useWorkflow();

  switch (state.mode) {
    case 'definition':
      return <DefinitionMode />;
    case 'execution':
      return <ExecutionMode />;
    case 'home':
    default:
      return <HomePage />;
  }
}

function App() {
  return (
    <ConfigProvider locale={jaJP}>
      <AppContent />
    </ConfigProvider>
  );
}

export default App;
