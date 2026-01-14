import { Layout } from 'antd';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

const { Sider, Content } = Layout;

interface ResizableLayoutProps {
  siderContent: ReactNode;
  mainContent: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string; // localStorage用のキー
}

export function ResizableLayout({
  siderContent,
  mainContent,
  defaultWidth = 300,
  minWidth = 200,
  maxWidth = 600,
  storageKey,
}: ResizableLayoutProps) {
  // localStorageから初期値を取得
  const getInitialWidth = () => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    }
    return defaultWidth;
  };

  const [siderWidth, setSiderWidth] = useState(getInitialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // 幅が変更されたらlocalStorageに保存
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(siderWidth));
    }
  }, [siderWidth, storageKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSiderWidth(newWidth);
      }
    },
    [isResizing, minWidth, maxWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <Layout style={{ position: 'relative' }}>
      <Sider
        width={siderWidth}
        style={{
          backgroundColor: 'white',
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
        }}
      >
        {siderContent}
      </Sider>

      {/* リサイズハンドル */}
      <div
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          left: siderWidth - 3,
          top: 0,
          bottom: 0,
          width: '6px',
          cursor: 'col-resize',
          backgroundColor: isResizing ? '#1890ff' : 'transparent',
          transition: isResizing ? 'none' : 'background-color 0.2s',
          zIndex: 100,
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = '#e6f7ff';
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      />

      <Content
        style={{
          padding: '24px',
          backgroundColor: '#f5f5f5',
          overflow: 'auto',
        }}
      >
        {mainContent}
      </Content>
    </Layout>
  );
}
