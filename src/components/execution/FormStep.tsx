import { Form, Input, InputNumber, DatePicker, Checkbox, Button, Typography, message } from 'antd';
import type { ProcessExecution, ProcessInstance, ProcessDefinition, FormField } from '../../types';
import dayjs from 'dayjs';

const { Title } = Typography;

interface FormStepProps {
  execution: ProcessExecution;
  stepInstance: ProcessInstance;
  stepDefinition: ProcessDefinition;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function FormStep({ execution, stepInstance, stepDefinition, onSubmit }: FormStepProps) {
  const [form] = Form.useForm();

  // オーバーライドされたフィールドまたはベースのフィールド
  const fields = stepInstance.overrides?.fields || stepDefinition.fields || [];

  // 既存データで初期値を設定（属性名をキーとして使用）
  const initialValues: Record<string, unknown> = {};
  fields.forEach((field) => {
    const value = execution.data[field.name];
    if (value !== undefined) {
      if (field.type === 'date' && value) {
        initialValues[field.name] = dayjs(value as string);
      } else {
        initialValues[field.name] = value;
      }
    }
  });

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      // 日付はISOストリングに変換
      const processedValues: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (field.type === 'date' && values[field.name]) {
          processedValues[field.name] = values[field.name].toISOString();
        } else {
          processedValues[field.name] = values[field.name];
        }
      });

      onSubmit(processedValues);
      message.success('入力を保存しました');
    }).catch(() => {
      message.error('入力内容を確認してください');
    });
  };

  const renderField = (field: FormField) => {
    const rules: Array<{ required?: boolean; pattern?: RegExp; message: string }> = [];

    if (field.required) {
      rules.push({ required: true, message: `${field.label}を入力してください` });
    }

    if (field.validation) {
      rules.push({
        pattern: new RegExp(field.validation),
        message: `${field.label}の形式が正しくありません`,
      });
    }

    switch (field.type) {
      case 'text':
        return (
          <Form.Item
            key={field.id}
            name={field.name}
            label={field.label}
            rules={rules}
          >
            <Input placeholder={`${field.label}を入力`} />
          </Form.Item>
        );

      case 'number':
        return (
          <Form.Item
            key={field.id}
            name={field.name}
            label={field.label}
            rules={rules}
          >
            <InputNumber style={{ width: '100%' }} placeholder={`${field.label}を入力`} />
          </Form.Item>
        );

      case 'date':
        return (
          <Form.Item
            key={field.id}
            name={field.name}
            label={field.label}
            rules={rules}
          >
            <DatePicker style={{ width: '100%' }} placeholder={`${field.label}を選択`} />
          </Form.Item>
        );

      case 'checkbox':
        return (
          <Form.Item
            key={field.id}
            name={field.name}
            valuePropName="checked"
          >
            <Checkbox>{field.label}</Checkbox>
          </Form.Item>
        );

      default:
        return null;
    }
  };

  if (fields.length === 0) {
    return (
      <div>
        <Title level={5}>{stepInstance.name}</Title>
        <p>このフォームにはフィールドが定義されていません。</p>
        <Button type="primary" onClick={() => onSubmit({})}>
          次へ
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Title level={5}>{stepInstance.name}</Title>
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        style={{ maxWidth: '600px' }}
      >
        {fields.map(renderField)}

        <Form.Item>
          <Button type="primary" onClick={handleSubmit}>
            送信
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
