import { useState, useRef, useEffect } from 'react';
import { Input, Button, Typography, Tag, Empty } from 'antd';
import type { InputRef } from 'antd';
import { DownOutlined, SearchOutlined, FormOutlined, CheckCircleOutlined, FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import type { ProcessDefinition, ProcessType } from '../../types';

const { Text } = Typography;

interface ProcessOption {
  definition: ProcessDefinition;
  disabled?: boolean;
  disabledReason?: string;
}

interface ProcessSelectorProps {
  options: ProcessOption[];
  value?: string; // definitionId
  onChange: (definitionId: string, definition: ProcessDefinition) => void;
  placeholder?: string;
  buttonStyle?: React.CSSProperties;
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
    case 'composite':
      return <FolderOutlined style={{ color: '#722ed1' }} />;
    default:
      return <FormOutlined />;
  }
}

// プロセスタイプの表示名
function getTypeLabel(type: ProcessType): string {
  switch (type) {
    case 'form': return 'フォーム';
    case 'approval': return '承認';
    case 'reference': return '参照';
    case 'composite': return '複合';
    default: return '';
  }
}

// タグの色
function getTypeColor(type: ProcessType): string {
  switch (type) {
    case 'form': return 'blue';
    case 'approval': return 'green';
    case 'reference': return 'orange';
    case 'composite': return 'purple';
    default: return 'default';
  }
}

export function ProcessSelector({
  options,
  value,
  onChange,
  placeholder = 'プロセスを選択',
  buttonStyle,
}: ProcessSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<InputRef>(null);

  // 選択中の定義
  const selectedDef = options.find(opt => opt.definition.id === value)?.definition;

  // フィルタリング
  const filteredOptions = options.filter(opt => {
    const def = opt.definition;
    const searchLower = searchText.toLowerCase();
    return (
      def.name.toLowerCase().includes(searchLower) ||
      (def.description?.toLowerCase().includes(searchLower) ?? false) ||
      getTypeLabel(def.type).includes(searchText)
    );
  });

  // ベースとカスタムに分類
  const baseOptions = filteredOptions.filter(opt => opt.definition.isBase);
  const customOptions = filteredOptions.filter(opt => !opt.definition.isBase);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 開いたときに検索欄にフォーカス
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (opt: ProcessOption) => {
    if (opt.disabled) return;
    onChange(opt.definition.id, opt.definition);
    setIsOpen(false);
    setSearchText('');
  };

  const renderOptionRow = (opt: ProcessOption) => {
    const def = opt.definition;
    return (
      <div
        key={def.id}
        onClick={() => handleSelect(opt)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          cursor: opt.disabled ? 'not-allowed' : 'pointer',
          backgroundColor: opt.disabled ? '#fafafa' : (value === def.id ? '#e6f7ff' : 'white'),
          opacity: opt.disabled ? 0.5 : 1,
          borderBottom: '1px solid #f0f0f0',
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          if (!opt.disabled && value !== def.id) {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }
        }}
        onMouseLeave={(e) => {
          if (!opt.disabled && value !== def.id) {
            e.currentTarget.style.backgroundColor = 'white';
          }
        }}
      >
        {/* アイコン */}
        <span style={{ flexShrink: 0 }}>{getProcessIcon(def.type)}</span>

        {/* 名前 */}
        <Text
          strong
          style={{
            width: '120px',
            flexShrink: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {def.name}
        </Text>

        {/* タイプタグ */}
        <Tag
          color={getTypeColor(def.type)}
          style={{ flexShrink: 0, margin: 0, fontSize: '11px' }}
        >
          {getTypeLabel(def.type)}
        </Tag>

        {/* 説明 */}
        <Text
          type="secondary"
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '12px',
          }}
        >
          {opt.disabled && opt.disabledReason
            ? opt.disabledReason
            : def.description || '-'}
        </Text>
      </div>
    );
  };

  const renderSection = (title: string, sectionOptions: ProcessOption[]) => {
    if (sectionOptions.length === 0) return null;
    return (
      <div>
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: '#fafafa',
            borderBottom: '1px solid #f0f0f0',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#666',
          }}
        >
          {title}
        </div>
        {sectionOptions.map(renderOptionRow)}
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', ...buttonStyle }}>
      {/* トリガーボタン */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedDef ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getProcessIcon(selectedDef.type)}
              <span>{selectedDef.name}</span>
            </span>
          ) : (
            <Text type="secondary">{placeholder}</Text>
          )}
        </span>
        <DownOutlined style={{ fontSize: '12px', marginLeft: '8px' }} />
      </Button>

      {/* ドロップダウンパネル */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '400px',
            maxHeight: '400px',
            backgroundColor: 'white',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* 検索入力 */}
          <div style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
            <Input
              ref={inputRef}
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="検索..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="small"
            />
          </div>

          {/* オプションリスト */}
          <div style={{ maxHeight: '340px', overflow: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <Empty
                description="該当するプロセスがありません"
                style={{ padding: '24px' }}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <>
                {renderSection('ベースプロセス', baseOptions)}
                {renderSection('カスタムプロセス', customOptions)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
