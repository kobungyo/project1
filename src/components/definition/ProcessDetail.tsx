import { Card, Typography, Descriptions, Empty, Tabs, Tag, Input, Button, Space } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { FormFieldEditor } from './FormFieldEditor';
import { ChildProcessList } from './ChildProcessList';

const { Title, Text } = Typography;
const { TextArea } = Input;

// プロセスタイプの日本語名
function getProcessTypeName(type: string): string {
  switch (type) {
    case 'form':
      return 'フォーム入力';
    case 'approval':
      return '承認/確認';
    case 'reference':
      return '情報参照';
    case 'composite':
      return '複合プロセス';
    default:
      return type;
  }
}

export function ProcessDetail() {
  const { state, getDefinitionById, updateDefinition } = useWorkflow();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const definition = state.selectedDefinitionId
    ? getDefinitionById(state.selectedDefinitionId)
    : null;

  // 選択が変わったら編集モードを解除
  useEffect(() => {
    setIsEditing(false);
    if (definition) {
      setEditName(definition.name);
      setEditDescription(definition.description || '');
    }
  }, [state.selectedDefinitionId, definition]);

  if (!state.selectedDefinitionId) {
    return (
      <Card>
        <Empty description="プロセスを選択してください" />
      </Card>
    );
  }

  if (!definition) {
    return (
      <Card>
        <Empty description="プロセスが見つかりません" />
      </Card>
    );
  }

  // 派生元プロセス名を取得
  const baseDefinition = definition.baseDefinitionId
    ? getDefinitionById(definition.baseDefinitionId)
    : null;

  const handleStartEdit = () => {
    setEditName(definition.name);
    setEditDescription(definition.description || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateDefinition({
      ...definition,
      name: editName.trim() || definition.name,
      description: editDescription.trim(),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(definition.name);
    setEditDescription(definition.description || '');
    setIsEditing(false);
  };

  // 編集可能なヘッダーコンポーネント
  const renderEditableHeader = (tag: React.ReactNode) => {
    if (isEditing) {
      return (
        <div style={{ marginBottom: '16px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="プロセス名"
              size="large"
              style={{ fontWeight: 'bold' }}
            />
            <TextArea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="説明（任意）"
              rows={2}
            />
            <Space>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleSave}>
                保存
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleCancel}>
                キャンセル
              </Button>
            </Space>
          </Space>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ marginBottom: '8px' }}>
          {definition.name}
          {tag}
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={handleStartEdit}
            style={{ marginLeft: '8px' }}
          />
        </Title>
        {definition.description && (
          <Text type="secondary">{definition.description}</Text>
        )}
      </div>
    );
  };

  // ベースプロセスの場合
  if (definition.isBase) {
    return (
      <Card>
        <Title level={4}>
          {definition.name}
          <Tag color="blue" style={{ marginLeft: '8px' }}>ベース</Tag>
        </Title>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="タイプ">
            {getProcessTypeName(definition.type)}
          </Descriptions.Item>
          <Descriptions.Item label="説明">
            {definition.description}
          </Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary">
            ベースプロセスは編集できません。「選択中のプロセスから派生作成」ボタンで派生プロセスを作成してください。
          </Text>
        </div>
      </Card>
    );
  }

  // フォームタイプのカスタムプロセスの場合
  if (definition.type === 'form') {
    return (
      <Card>
        {renderEditableHeader(<Tag color="green" style={{ marginLeft: '8px' }}>カスタム</Tag>)}
        <Descriptions column={1} bordered style={{ marginBottom: '24px' }}>
          <Descriptions.Item label="タイプ">
            {getProcessTypeName(definition.type)}
          </Descriptions.Item>
          {baseDefinition && (
            <Descriptions.Item label="派生元">
              {baseDefinition.name}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Title level={5}>入力フィールド</Title>
        <FormFieldEditor definition={definition} />
      </Card>
    );
  }

  // 承認/確認、情報参照タイプのカスタムプロセスの場合
  if (definition.type === 'approval' || definition.type === 'reference') {
    return (
      <Card>
        {renderEditableHeader(<Tag color="green" style={{ marginLeft: '8px' }}>カスタム</Tag>)}
        <Descriptions column={1} bordered>
          <Descriptions.Item label="タイプ">
            {getProcessTypeName(definition.type)}
          </Descriptions.Item>
          {baseDefinition && (
            <Descriptions.Item label="派生元">
              {baseDefinition.name}
            </Descriptions.Item>
          )}
        </Descriptions>
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary">
            このプロセスタイプには追加の設定項目はありません。
            複合プロセスの子プロセスとして使用できます。
          </Text>
        </div>
      </Card>
    );
  }

  // 複合プロセスの場合
  if (definition.type === 'composite') {
    return (
      <Card>
        {renderEditableHeader(<Tag color="purple" style={{ marginLeft: '8px' }}>複合</Tag>)}
        <Descriptions column={1} bordered style={{ marginBottom: '24px' }}>
          <Descriptions.Item label="タイプ">
            {getProcessTypeName(definition.type)}
          </Descriptions.Item>
        </Descriptions>

        <Tabs
          defaultActiveKey="children"
          items={[
            {
              key: 'children',
              label: '子プロセス',
              children: <ChildProcessList definition={definition} />,
            },
          ]}
        />
      </Card>
    );
  }

  // その他
  return (
    <Card>
      <Title level={4}>{definition.name}</Title>
      <Descriptions column={1} bordered>
        <Descriptions.Item label="タイプ">
          {getProcessTypeName(definition.type)}
        </Descriptions.Item>
        <Descriptions.Item label="説明">
          {definition.description}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
