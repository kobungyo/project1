import { Descriptions, Button, Typography, Empty, Space, Form, Input, message } from 'antd';
import { CheckOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { ProcessExecution, FormField, ProcessInstance, ProcessDefinition } from '../../types';
import { useWorkflow } from '../../context/WorkflowContext';

const { Title } = Typography;

interface ReferenceStepProps {
  execution: ProcessExecution;
  onComplete: () => void;
  onEdit: (data: Record<string, unknown>) => void;
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

export function ReferenceStep({ execution, onComplete, onEdit }: ReferenceStepProps) {
  const { getDefinitionById } = useWorkflow();
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

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

  const handleEdit = () => {
    form.setFieldsValue(data);
    setIsEditing(true);
  };

  const handleSave = () => {
    const values = form.getFieldsValue();
    onEdit(values);
    setIsEditing(false);
    message.success('変更を保存しました');
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.resetFields();
  };

  if (isEditing) {
    return (
      <div>
        <Title level={5}>情報編集</Title>
        <Form form={form} layout="vertical" style={{ maxWidth: '600px' }}>
          {dataEntries.map(([key]) => {
            const field = fieldMap[key];
            return (
              <Form.Item key={key} name={key} label={field?.label || key}>
                <Input />
              </Form.Item>
            );
          })}
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSave}>
                保存
              </Button>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    );
  }

  return (
    <div>
      <Title level={5}>情報参照</Title>

      {dataEntries.length === 0 ? (
        <Empty description="データがありません" />
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
        <Button icon={<EditOutlined />} onClick={handleEdit}>
          編集
        </Button>
        <Button type="primary" icon={<CheckOutlined />} onClick={onComplete}>
          完了
        </Button>
      </Space>
    </div>
  );
}
