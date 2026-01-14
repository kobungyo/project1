import { Tree, Button, Modal, Select, Input, Space, message, Tag, Typography } from 'antd';
import { PlusOutlined, PlayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import type { ProcessExecution, ExecutionStatus } from '../../types';
import type { DataNode } from 'antd/es/tree';

const { Text } = Typography;

// ステータスに応じたタグ
function getStatusTag(status: ExecutionStatus) {
  switch (status) {
    case 'pending':
      return <Tag color="default">待機中</Tag>;
    case 'in_progress':
      return <Tag icon={<ClockCircleOutlined />} color="processing">実行中</Tag>;
    case 'completed':
      return <Tag icon={<CheckCircleOutlined />} color="success">完了</Tag>;
    case 'rejected':
      return <Tag color="error">却下</Tag>;
    default:
      return null;
  }
}

export function ExecutionTree() {
  const { state, selectExecution, addExecution } = useWorkflow();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string>('');
  const [instanceName, setInstanceName] = useState('');

  // 実行可能な複合プロセスのみ
  const availableProcesses = state.definitions.filter(
    (def) => def.type === 'composite' && !def.isBase && (def.children?.length || 0) > 0
  );

  // ツリーデータに変換
  const treeData: DataNode[] = [
    {
      title: (
        <Space>
          <PlayCircleOutlined />
          <span>ワークスペース</span>
        </Space>
      ),
      key: 'workspace',
      selectable: false,
      children: state.executions.map((exec) => {
        return {
          title: (
            <Space>
              <Text>{exec.instanceName}</Text>
              {getStatusTag(exec.status)}
            </Space>
          ),
          key: exec.id,
        };
      }),
    },
  ];

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0] as string;
      if (key !== 'workspace') {
        selectExecution(key);
      }
    }
  };

  const handleStartProcess = () => {
    if (!selectedDefinitionId) {
      message.error('プロセスを選択してください');
      return;
    }

    if (!instanceName.trim()) {
      message.error('インスタンス名を入力してください');
      return;
    }

    const newExecution: ProcessExecution = {
      id: `exec-${Date.now()}`,
      instanceName: instanceName.trim(),
      definitionId: selectedDefinitionId,
      currentStepIndex: 0,
      status: 'in_progress',
      data: {},
      history: [],
    };

    addExecution(newExecution);
    selectExecution(newExecution.id);
    setIsModalOpen(false);
    setSelectedDefinitionId('');
    setInstanceName('');
    message.success('プロセスを開始しました');
  };

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
          block
          disabled={availableProcesses.length === 0}
        >
          新規プロセス開始
        </Button>
        {availableProcesses.length === 0 && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            実行可能なプロセスがありません。先にプロセス定義で複合プロセスを作成してください。
          </Text>
        )}
      </Space>

      <Tree
        showIcon
        defaultExpandAll
        treeData={treeData}
        selectedKeys={state.selectedExecutionId ? [state.selectedExecutionId] : []}
        onSelect={handleSelect}
      />

      <Modal
        title="新規プロセス開始"
        open={isModalOpen}
        onOk={handleStartProcess}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedDefinitionId('');
          setInstanceName('');
        }}
        okText="開始"
        cancelText="キャンセル"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>プロセス定義</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="プロセスを選択"
              value={selectedDefinitionId || undefined}
              onChange={setSelectedDefinitionId}
              options={availableProcesses.map((def) => ({
                value: def.id,
                label: `${def.name} (${def.children?.length || 0} ステップ)`,
              }))}
            />
          </div>
          <div>
            <Text>インスタンス名</Text>
            <Input
              style={{ marginTop: '8px' }}
              placeholder="例: 2024年1月申請"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
