import { Tree, Button, Space, Modal, Input, message } from 'antd';
import {
  PlusOutlined,
  FormOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  FolderOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import type { ProcessDefinition, ProcessType } from '../../types';
import type { DataNode } from 'antd/es/tree';

// プロセスタイプに応じたアイコン
function getProcessIcon(type: ProcessType) {
  switch (type) {
    case 'form':
      return <FormOutlined style={{ color: '#1890ff' }} />;
    case 'approval':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'reference':
      return <FileTextOutlined style={{ color: '#faad14' }} />;
    case 'composite':
      return <FolderOutlined style={{ color: '#722ed1' }} />;
    default:
      return <FolderOutlined />;
  }
}

// ツリーデータに変換
function convertToTreeData(definitions: ProcessDefinition[]): DataNode[] {
  const baseProcesses = definitions.filter((def) => def.isBase);
  const customProcesses = definitions.filter((def) => !def.isBase);

  return [
    {
      title: 'ベースプロセス',
      key: 'base-folder',
      selectable: false,
      children: baseProcesses.map((def) => ({
        title: def.name,
        key: def.id,
        icon: getProcessIcon(def.type),
      })),
    },
    {
      title: 'カスタムプロセス',
      key: 'custom-folder',
      selectable: false,
      children: customProcesses.map((def) => ({
        title: def.name,
        key: def.id,
        icon: getProcessIcon(def.type),
        children: def.children?.map((child, index) => ({
          title: child.name,
          key: `${def.id}-child-${index}`,
          icon: getProcessIcon(
            definitions.find((d) => d.id === child.definitionId)?.type || 'form'
          ),
        })),
      })),
    },
  ];
}

export function ProcessTree() {
  const { state, selectDefinition, addDefinition, getDefinitionById } = useWorkflow();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeriveModalOpen, setIsDeriveModalOpen] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['base-folder', 'custom-folder']);

  const treeData = convertToTreeData(state.definitions);

  // 選択されたノードが表示されるようにツリーを展開
  useEffect(() => {
    if (state.selectedDefinitionId) {
      const selectedDef = getDefinitionById(state.selectedDefinitionId);
      if (selectedDef && !selectedDef.isBase) {
        // カスタムプロセスが選択された場合、custom-folderを展開
        setExpandedKeys((prev) => {
          if (!prev.includes('custom-folder')) {
            return [...prev, 'custom-folder'];
          }
          return prev;
        });
      }
    }
  }, [state.selectedDefinitionId, getDefinitionById]);

  // 選択中のプロセス定義
  const selectedDefinition = state.selectedDefinitionId
    ? getDefinitionById(state.selectedDefinitionId)
    : null;

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0] as string;
      // フォルダでなければ選択
      if (!key.endsWith('-folder')) {
        // 子プロセスの場合は親を選択
        if (key.includes('-child-')) {
          const parentId = key.split('-child-')[0];
          selectDefinition(parentId);
        } else {
          selectDefinition(key);
        }
      }
    }
  };

  // 新規複合プロセス作成
  const handleCreateProcess = () => {
    if (!newProcessName.trim()) {
      message.error('プロセス名を入力してください');
      return;
    }

    const newProcess: ProcessDefinition = {
      id: `process-${Date.now()}`,
      name: newProcessName.trim(),
      type: 'composite',
      description: '',
      children: [],
      isBase: false,
    };

    addDefinition(newProcess);
    setIsCreateModalOpen(false);
    setNewProcessName('');
    selectDefinition(newProcess.id);
    message.success('プロセスを作成しました');
  };

  // ベースプロセスから派生作成
  const handleDeriveProcess = () => {
    if (!newProcessName.trim()) {
      message.error('プロセス名を入力してください');
      return;
    }

    if (!selectedDefinition) {
      message.error('派生元のプロセスを選択してください');
      return;
    }

    const newProcess: ProcessDefinition = {
      id: `process-${Date.now()}`,
      name: newProcessName.trim(),
      type: selectedDefinition.type,
      description: selectedDefinition.description || '',
      fields: selectedDefinition.fields ? [...selectedDefinition.fields] : [],
      isBase: false,
      baseDefinitionId: selectedDefinition.id,
    };

    addDefinition(newProcess);
    setIsDeriveModalOpen(false);
    setNewProcessName('');
    selectDefinition(newProcess.id);
    message.success('派生プロセスを作成しました');
  };

  // 派生可能かどうか（form, approval, referenceタイプのみ）
  const canDerive = selectedDefinition &&
    ['form', 'approval', 'reference'].includes(selectedDefinition.type);

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalOpen(true)}
          block
        >
          新規複合プロセス作成
        </Button>
        <Button
          icon={<CopyOutlined />}
          onClick={() => {
            setNewProcessName(selectedDefinition ? `${selectedDefinition.name}（派生）` : '');
            setIsDeriveModalOpen(true);
          }}
          block
          disabled={!canDerive}
        >
          選択中のプロセスから派生作成
        </Button>
      </Space>

      <Tree
        showIcon
        expandedKeys={expandedKeys}
        onExpand={(keys) => setExpandedKeys(keys)}
        treeData={treeData}
        selectedKeys={state.selectedDefinitionId ? [state.selectedDefinitionId] : []}
        onSelect={handleSelect}
      />

      {/* 新規複合プロセス作成モーダル */}
      <Modal
        title="新規複合プロセス作成"
        open={isCreateModalOpen}
        onOk={handleCreateProcess}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setNewProcessName('');
        }}
        okText="作成"
        cancelText="キャンセル"
      >
        <Input
          placeholder="プロセス名を入力"
          value={newProcessName}
          onChange={(e) => setNewProcessName(e.target.value)}
          onPressEnter={handleCreateProcess}
        />
      </Modal>

      {/* 派生プロセス作成モーダル */}
      <Modal
        title={`派生プロセス作成（${selectedDefinition?.name || ''}）`}
        open={isDeriveModalOpen}
        onOk={handleDeriveProcess}
        onCancel={() => {
          setIsDeriveModalOpen(false);
          setNewProcessName('');
        }}
        okText="作成"
        cancelText="キャンセル"
      >
        <p style={{ marginBottom: '16px', color: '#666' }}>
          「{selectedDefinition?.name}」をベースに新しいプロセスを作成します。
          派生したプロセスは編集可能で、他のプロセスから再利用できます。
        </p>
        <Input
          placeholder="プロセス名を入力"
          value={newProcessName}
          onChange={(e) => setNewProcessName(e.target.value)}
          onPressEnter={handleDeriveProcess}
        />
      </Modal>
    </div>
  );
}
