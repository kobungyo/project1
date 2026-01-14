import { Descriptions, Button, Space, Typography, Popconfirm, Empty, Alert } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { ProcessExecution, FormField, ProcessInstance, ProcessDefinition } from '../../types';
import { useWorkflow } from '../../context/WorkflowContext';

const { Title } = Typography;

interface ApprovalStepProps {
  execution: ProcessExecution;
  onApprove: () => void;
  onReject: () => void;
}

// 再帰的にフィールドを収集する関数
function collectFieldsRecursively(
  children: ProcessInstance[],
  getDefinitionById: (id: string) => ProcessDefinition | undefined,
  fieldMap: Record<string, FormField>
): void {
  children.forEach((child) => {
    const childDef = getDefinitionById(child.definitionId);
    if (!childDef) return;

    // 複合プロセスの場合は再帰的に処理
    if (childDef.type === 'composite' && childDef.children) {
      collectFieldsRecursively(childDef.children, getDefinitionById, fieldMap);
    } else if (childDef.fields) {
      // フォームプロセスの場合はフィールドを収集
      childDef.fields.forEach((field) => {
        fieldMap[field.name] = field;
      });
    }

    // オーバーライドのフィールドも確認
    if (child.overrides?.fields) {
      child.overrides.fields.forEach((field) => {
        fieldMap[field.name] = field;
      });
    }
  });
}

export function ApprovalStep({ execution, onApprove, onReject }: ApprovalStepProps) {
  const { getDefinitionById } = useWorkflow();

  // 入力されたデータを表示
  const data = execution.data;
  const dataEntries = Object.entries(data);

  // 全ての子プロセスからフィールド定義を収集（入れ子対応）
  const definition = getDefinitionById(execution.definitionId);
  const children = definition?.children || [];

  // フィールド名からフィールド情報を取得するマップ
  const fieldMap: Record<string, FormField> = {};
  collectFieldsRecursively(children, getDefinitionById, fieldMap);

  const formatValue = (value: unknown, field?: FormField): string => {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'はい' : 'いいえ';
    }
    if (field?.type === 'date' || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
      const date = new Date(value as string);
      return date.toLocaleDateString('ja-JP');
    }
    return String(value);
  };

  return (
    <div>
      <Title level={5}>確認・承認</Title>

      <Alert
        message="以下の内容を確認してください"
        description="問題がなければ「承認」、修正が必要な場合は「差し戻し」を選択してください。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {dataEntries.length === 0 ? (
        <Empty description="入力データがありません" />
      ) : (
        <Descriptions bordered column={1} style={{ marginBottom: '24px' }}>
          {dataEntries.map(([key, value]) => {
            const field = fieldMap[key];
            return (
              <Descriptions.Item key={key} label={field?.label || key}>
                {formatValue(value, field)}
              </Descriptions.Item>
            );
          })}
        </Descriptions>
      )}

      <Space>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          onClick={onApprove}
        >
          承認
        </Button>
        <Popconfirm
          title="差し戻しますか？"
          description="前の入力ステップに戻ります"
          onConfirm={onReject}
          okText="差し戻し"
          cancelText="キャンセル"
        >
          <Button danger icon={<CloseOutlined />}>
            差し戻し
          </Button>
        </Popconfirm>
      </Space>
    </div>
  );
}
