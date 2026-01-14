import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import type { ProcessDefinition, FormField, FieldType } from '../../types';

interface FormFieldEditorProps {
  definition: ProcessDefinition;
}

const fieldTypeOptions = [
  { value: 'text', label: 'テキスト' },
  { value: 'number', label: '数値' },
  { value: 'date', label: '日付' },
  { value: 'checkbox', label: 'チェックボックス' },
];

export function FormFieldEditor({ definition }: FormFieldEditorProps) {
  const { updateDefinition } = useWorkflow();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [form] = Form.useForm();

  const fields = definition.fields || [];

  const handleAdd = () => {
    setEditingField(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'text',
      required: false,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (field: FormField) => {
    setEditingField(field);
    form.setFieldsValue(field);
    setIsModalOpen(true);
  };

  const handleDelete = (fieldId: string) => {
    const newFields = fields.filter((f) => f.id !== fieldId);
    updateDefinition({
      ...definition,
      fields: newFields,
    });
    message.success('フィールドを削除しました');
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      let newFields: FormField[];

      if (editingField) {
        // 編集
        newFields = fields.map((f) =>
          f.id === editingField.id ? { ...f, ...values } : f
        );
      } else {
        // 新規追加
        const newField: FormField = {
          id: `field-${Date.now()}`,
          ...values,
        };
        newFields = [...fields, newField];
      }

      updateDefinition({
        ...definition,
        fields: newFields,
      });

      setIsModalOpen(false);
      form.resetFields();
      message.success(editingField ? 'フィールドを更新しました' : 'フィールドを追加しました');
    });
  };

  const columns = [
    {
      title: '属性名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '表示名',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'タイプ',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: FieldType) =>
        fieldTypeOptions.find((opt) => opt.value === type)?.label || type,
    },
    {
      title: '必須',
      dataIndex: 'required',
      key: 'required',
      width: 80,
      render: (required: boolean) => (required ? 'はい' : 'いいえ'),
    },
    {
      title: '入力規則',
      dataIndex: 'validation',
      key: 'validation',
      render: (validation: string) => validation || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: FormField) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="このフィールドを削除しますか？"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          フィールド追加
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={fields}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: 'フィールドがありません。「フィールド追加」ボタンで追加してください。' }}
        size="small"
      />

      <Modal
        title={editingField ? 'フィールド編集' : 'フィールド追加'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText="保存"
        cancelText="キャンセル"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="属性名（英数字）"
            rules={[
              { required: true, message: '属性名を入力してください' },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '英字で始まる英数字とアンダースコアのみ' },
            ]}
          >
            <Input placeholder="例: applicant_name" />
          </Form.Item>

          <Form.Item
            name="label"
            label="表示名"
            rules={[{ required: true, message: '表示名を入力してください' }]}
          >
            <Input placeholder="例: 申請者氏名" />
          </Form.Item>

          <Form.Item
            name="type"
            label="タイプ"
            rules={[{ required: true, message: 'タイプを選択してください' }]}
          >
            <Select options={fieldTypeOptions} />
          </Form.Item>

          <Form.Item name="required" label="必須" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="validation" label="入力規則（正規表現）">
            <Input placeholder="例: ^[0-9]+$" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
