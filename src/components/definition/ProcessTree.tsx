import { Tree, Button, Space, Modal, Input, message, Tooltip, Form } from 'antd';
import {
  PlusOutlined,
  FormOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  FolderOutlined,
  CopyOutlined,
  BlockOutlined,
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

  const renderTitle = (name: string, description?: string) => {
    if (description) {
      return (
        <Tooltip title={description} placement="right">
          <span>{name}</span>
        </Tooltip>
      );
    }
    return name;
  };

  return [
    {
      title: 'ベースプロセス',
      key: 'base-folder',
      selectable: false,
      children: baseProcesses.map((def) => ({
        title: renderTitle(def.name, def.description),
        key: def.id,
        icon: getProcessIcon(def.type),
      })),
    },
    {
      title: 'カスタムプロセス',
      key: 'custom-folder',
      selectable: false,
      children: customProcesses.map((def) => ({
        title: renderTitle(def.name, def.description),
        key: def.id,
        icon: getProcessIcon(def.type),
        children: def.children?.map((child) => {
          const childDef = definitions.find((d) => d.id === child.definitionId);
          return {
            title: renderTitle(child.name, childDef?.description),
            key: `${def.id}-child-${child.definitionId}`,
            icon: getProcessIcon(childDef?.type || 'form'),
          };
        }),
      })),
    },
  ];
}

export function ProcessTree() {
  const { state, selectDefinition, addDefinition, updateDefinition, getDefinitionById } = useWorkflow();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeriveModalOpen, setIsDeriveModalOpen] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [newProcessCode, setNewProcessCode] = useState('');
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
        // 子プロセスの場合はdefinitionIdを抽出して選択
        if (key.includes('-child-')) {
          const definitionId = key.split('-child-')[1];
          selectDefinition(definitionId);
        } else {
          selectDefinition(key);
        }
      }
    }
  };

  // プロセスコードのバリデーション（英数字のみ）
  const isValidCode = (code: string): boolean => {
    return code === '' || /^[a-zA-Z0-9]+$/.test(code);
  };

  // プロセスコードの重複チェック（空は許可、重複は不可）
  const isCodeDuplicate = (code: string, excludeId?: string): boolean => {
    if (!code.trim()) return false; // 空は重複とみなさない
    return state.definitions.some(
      (def) => def.code === code.trim() && def.id !== excludeId
    );
  };

  // 新規複合プロセス作成
  const handleCreateProcess = () => {
    if (!newProcessName.trim()) {
      message.error('プロセス名を入力してください');
      return;
    }

    if (newProcessCode && !isValidCode(newProcessCode)) {
      message.error('プロセスコードは英数字のみ使用できます');
      return;
    }

    if (isCodeDuplicate(newProcessCode)) {
      message.error('このプロセスコードは既に使用されています');
      return;
    }

    const newProcess: ProcessDefinition = {
      id: `process-${Date.now()}`,
      code: newProcessCode.trim() || undefined,
      name: newProcessName.trim(),
      type: 'composite',
      description: '',
      children: [],
      isBase: false,
    };

    addDefinition(newProcess);
    setIsCreateModalOpen(false);
    setNewProcessName('');
    setNewProcessCode('');
    selectDefinition(newProcess.id);
    message.success('プロセスを作成しました');
  };

  // ベースプロセスから派生作成
  const handleDeriveProcess = () => {
    if (!newProcessName.trim()) {
      message.error('プロセス名を入力してください');
      return;
    }

    if (newProcessCode && !isValidCode(newProcessCode)) {
      message.error('プロセスコードは英数字のみ使用できます');
      return;
    }

    if (isCodeDuplicate(newProcessCode)) {
      message.error('このプロセスコードは既に使用されています');
      return;
    }

    if (!selectedDefinition) {
      message.error('派生元のプロセスを選択してください');
      return;
    }

    const newProcess: ProcessDefinition = {
      id: `process-${Date.now()}`,
      code: newProcessCode.trim() || undefined,
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
    setNewProcessCode('');
    selectDefinition(newProcess.id);
    message.success('派生プロセスを作成しました');
  };

  // 派生可能かどうか（form, approval, referenceタイプのみ）
  const canDerive = selectedDefinition &&
    ['form', 'approval', 'reference'].includes(selectedDefinition.type);

  // ラップ可能かどうか（カスタムプロセスのみ）
  const canWrap = selectedDefinition && !selectedDefinition.isBase;

  // 複合プロセスでラップ
  const handleWrapWithComposite = () => {
    if (!selectedDefinition || selectedDefinition.isBase) {
      message.error('カスタムプロセスを選択してください');
      return;
    }

    const parentId = selectedDefinition.id;

    // 元のプロセスを新しいIDで複製（子プロセスとして使用）
    const childProcess: ProcessDefinition = {
      id: `process-${Date.now()}`,
      // codeは明示的に設定しない（空にする）
      name: selectedDefinition.name,
      type: selectedDefinition.type,
      description: selectedDefinition.description,
      fields: selectedDefinition.fields ? [...selectedDefinition.fields] : undefined,
      children: selectedDefinition.children ? [...selectedDefinition.children] : undefined,
      isBase: false,
      baseDefinitionId: selectedDefinition.baseDefinitionId,
    };

    // 複製したプロセスを追加
    addDefinition(childProcess);

    // 元のプロセスを複合プロセスに変換（ID・名称・説明・コードは維持）
    const wrappedProcess: ProcessDefinition = {
      id: selectedDefinition.id,
      code: selectedDefinition.code,
      name: selectedDefinition.name,
      type: 'composite',
      description: selectedDefinition.description,
      children: [
        {
          id: `instance-${Date.now()}`,
          definitionId: childProcess.id,
          name: childProcess.name,
        },
      ],
      isBase: false,
    };

    updateDefinition(wrappedProcess);

    // ツリーを展開（親プロセスを展開キーに追加）
    setExpandedKeys((prev) => {
      if (!prev.includes(parentId)) {
        return [...prev, parentId];
      }
      return prev;
    });

    message.success('複合プロセスでラップしました');
  };

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
        <Button
          icon={<BlockOutlined />}
          onClick={handleWrapWithComposite}
          block
          disabled={!canWrap}
        >
          複合プロセスでラップ
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
          setNewProcessCode('');
        }}
        okText="作成"
        cancelText="キャンセル"
      >
        <Form layout="vertical">
          <Form.Item label="プロセスコード" style={{ marginBottom: '12px' }}>
            <Input
              placeholder="英数字のみ（任意）"
              value={newProcessCode}
              onChange={(e) => setNewProcessCode(e.target.value)}
              status={newProcessCode && !isValidCode(newProcessCode) ? 'error' : undefined}
            />
          </Form.Item>
          <Form.Item label="プロセス名" style={{ marginBottom: 0 }}>
            <Input
              placeholder="プロセス名を入力"
              value={newProcessName}
              onChange={(e) => setNewProcessName(e.target.value)}
              onPressEnter={handleCreateProcess}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 派生プロセス作成モーダル */}
      <Modal
        title={`派生プロセス作成（${selectedDefinition?.name || ''}）`}
        open={isDeriveModalOpen}
        onOk={handleDeriveProcess}
        onCancel={() => {
          setIsDeriveModalOpen(false);
          setNewProcessName('');
          setNewProcessCode('');
        }}
        okText="作成"
        cancelText="キャンセル"
      >
        <p style={{ marginBottom: '16px', color: '#666' }}>
          「{selectedDefinition?.name}」をベースに新しいプロセスを作成します。
          派生したプロセスは編集可能で、他のプロセスから再利用できます。
        </p>
        <Form layout="vertical">
          <Form.Item label="プロセスコード" style={{ marginBottom: '12px' }}>
            <Input
              placeholder="英数字のみ（任意）"
              value={newProcessCode}
              onChange={(e) => setNewProcessCode(e.target.value)}
              status={newProcessCode && !isValidCode(newProcessCode) ? 'error' : undefined}
            />
          </Form.Item>
          <Form.Item label="プロセス名" style={{ marginBottom: 0 }}>
            <Input
              placeholder="プロセス名を入力"
              value={newProcessName}
              onChange={(e) => setNewProcessName(e.target.value)}
              onPressEnter={handleDeriveProcess}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
