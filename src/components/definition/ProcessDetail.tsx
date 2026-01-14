import { Card, Typography, Descriptions, Empty, Tabs, Tag } from 'antd';
import { useWorkflow } from '../../context/WorkflowContext';
import { FormFieldEditor } from './FormFieldEditor';
import { ChildProcessList } from './ChildProcessList';

const { Title, Text } = Typography;

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
  const { state, getDefinitionById } = useWorkflow();

  if (!state.selectedDefinitionId) {
    return (
      <Card>
        <Empty description="プロセスを選択してください" />
      </Card>
    );
  }

  const definition = getDefinitionById(state.selectedDefinitionId);

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
        <Title level={4}>
          {definition.name}
          <Tag color="green" style={{ marginLeft: '8px' }}>カスタム</Tag>
        </Title>
        <Descriptions column={1} bordered style={{ marginBottom: '24px' }}>
          <Descriptions.Item label="タイプ">
            {getProcessTypeName(definition.type)}
          </Descriptions.Item>
          {baseDefinition && (
            <Descriptions.Item label="派生元">
              {baseDefinition.name}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="説明">
            {definition.description || '説明なし'}
          </Descriptions.Item>
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
        <Title level={4}>
          {definition.name}
          <Tag color="green" style={{ marginLeft: '8px' }}>カスタム</Tag>
        </Title>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="タイプ">
            {getProcessTypeName(definition.type)}
          </Descriptions.Item>
          {baseDefinition && (
            <Descriptions.Item label="派生元">
              {baseDefinition.name}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="説明">
            {definition.description || '説明なし'}
          </Descriptions.Item>
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
        <Title level={4}>
          {definition.name}
          <Tag color="purple" style={{ marginLeft: '8px' }}>複合</Tag>
        </Title>
        <Descriptions column={1} bordered style={{ marginBottom: '24px' }}>
          <Descriptions.Item label="タイプ">
            {getProcessTypeName(definition.type)}
          </Descriptions.Item>
          <Descriptions.Item label="説明">
            {definition.description || '説明なし'}
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
