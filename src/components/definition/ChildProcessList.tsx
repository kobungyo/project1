import {
  List,
  Button,
  Modal,
  Select,
  Input,
  Space,
  Card,
  Popconfirm,
  message,
  Empty,
  Typography,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FormOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import type { ProcessDefinition, ProcessInstance, ProcessType } from '../../types';

const { Text } = Typography;

interface ChildProcessListProps {
  definition: ProcessDefinition;
}

// プロセスタイプに応じたアイコン
function getProcessIcon(type: ProcessType) {
  switch (type) {
    case 'form':
      return <FormOutlined style={{ color: '#1890ff' }} />;
    case 'approval':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'reference':
      return <FileTextOutlined style={{ color: '#faad14' }} />;
    default:
      return <FormOutlined />;
  }
}

export function ChildProcessList({ definition }: ChildProcessListProps) {
  const { state, updateDefinition, getDefinitionById } = useWorkflow();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [instanceName, setInstanceName] = useState('');

  const children = definition.children || [];

  // 追加可能なプロセス（ベースプロセス＋カスタムプロセスのform, approval, reference）
  // 自分自身は除外
  const availableProcesses = state.definitions.filter(
    (def) =>
      def.id !== definition.id &&
      ['form', 'approval', 'reference'].includes(def.type)
  );

  // ベースとカスタムに分ける
  const baseProcesses = availableProcesses.filter((def) => def.isBase);
  const customProcesses = availableProcesses.filter((def) => !def.isBase);

  const handleAdd = () => {
    setSelectedProcessId('');
    setInstanceName('');
    setIsModalOpen(true);
  };

  const handleAddConfirm = () => {
    if (!selectedProcessId) {
      message.error('プロセスを選択してください');
      return;
    }

    const selectedDef = getDefinitionById(selectedProcessId);
    if (!selectedDef) {
      message.error('プロセスが見つかりません');
      return;
    }

    const newChild: ProcessInstance = {
      id: `instance-${Date.now()}`,
      definitionId: selectedProcessId,
      name: instanceName || selectedDef.name,
    };

    updateDefinition({
      ...definition,
      children: [...children, newChild],
    });

    setIsModalOpen(false);
    message.success('子プロセスを追加しました');
  };

  const handleDelete = (instanceId: string) => {
    updateDefinition({
      ...definition,
      children: children.filter((c) => c.id !== instanceId),
    });
    message.success('子プロセスを削除しました');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newChildren = [...children];
    [newChildren[index - 1], newChildren[index]] = [
      newChildren[index],
      newChildren[index - 1],
    ];
    updateDefinition({
      ...definition,
      children: newChildren,
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === children.length - 1) return;
    const newChildren = [...children];
    [newChildren[index], newChildren[index + 1]] = [
      newChildren[index + 1],
      newChildren[index],
    ];
    updateDefinition({
      ...definition,
      children: newChildren,
    });
  };

  // セレクトオプションを作成
  const selectOptions = [
    {
      label: 'ベースプロセス',
      options: baseProcesses.map((def) => ({
        value: def.id,
        label: def.name,
      })),
    },
    {
      label: 'カスタムプロセス',
      options: customProcesses.map((def) => ({
        value: def.id,
        label: `${def.name}`,
      })),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          子プロセス追加
        </Button>
      </div>

      {children.length === 0 ? (
        <Empty description="子プロセスがありません。「子プロセス追加」ボタンで追加してください。" />
      ) : (
        <List
          dataSource={children}
          renderItem={(child, index) => {
            const childDef = getDefinitionById(child.definitionId);
            return (
              <Card
                size="small"
                style={{ marginBottom: '8px' }}
                styles={{ body: { padding: '12px' } }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Space>
                    <Text strong>{index + 1}.</Text>
                    {childDef && getProcessIcon(childDef.type)}
                    <Text>{child.name}</Text>
                    {childDef?.isBase ? (
                      <Tag color="blue" style={{ fontSize: '10px' }}>ベース</Tag>
                    ) : (
                      <Tag color="green" style={{ fontSize: '10px' }}>カスタム</Tag>
                    )}
                    {child.name !== childDef?.name && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        (元: {childDef?.name})
                      </Text>
                    )}
                  </Space>
                  <Space>
                    <Button
                      type="text"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                    />
                    <Button
                      type="text"
                      icon={<ArrowDownOutlined />}
                      disabled={index === children.length - 1}
                      onClick={() => handleMoveDown(index)}
                    />
                    <Popconfirm
                      title="この子プロセスを削除しますか？"
                      onConfirm={() => handleDelete(child.id)}
                      okText="削除"
                      cancelText="キャンセル"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            );
          }}
        />
      )}

      <Modal
        title="子プロセス追加"
        open={isModalOpen}
        onOk={handleAddConfirm}
        onCancel={() => setIsModalOpen(false)}
        okText="追加"
        cancelText="キャンセル"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>プロセス</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="プロセスを選択"
              value={selectedProcessId || undefined}
              onChange={(value) => {
                setSelectedProcessId(value);
                const selectedDef = getDefinitionById(value);
                if (selectedDef && !instanceName) {
                  setInstanceName(selectedDef.name);
                }
              }}
              options={selectOptions}
            />
          </div>
          <div>
            <Text>インスタンス名（このプロセス内での表示名）</Text>
            <Input
              style={{ marginTop: '8px' }}
              placeholder="インスタンス名"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
