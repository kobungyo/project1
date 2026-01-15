// プロセス定義の種類
export type ProcessType = 'form' | 'approval' | 'reference' | 'composite';

// フォーム入力フィールドの型
export type FieldType = 'text' | 'number' | 'date' | 'checkbox';

// フォームフィールド定義
export interface FormField {
  id: string;
  name: string;      // 属性名（識別子）
  label: string;     // 表示名
  type: FieldType;
  required: boolean;
  validation?: string;
}

// プロセス定義（テンプレート）
export interface ProcessDefinition {
  id: string;
  code?: string; // プロセスコード（英数字のみ）
  name: string;
  type: ProcessType;
  description?: string;
  // フォーム入力の場合
  fields?: FormField[];
  // 複合プロセスの場合の子プロセス
  children?: ProcessInstance[];
  // ベースプロセスかどうか（編集不可）
  isBase?: boolean;
  // 派生元のプロセスID（派生プロセスの場合）
  baseDefinitionId?: string;
}

// プロセスインスタンス（実行時/定義内での派生）
export interface ProcessInstance {
  id: string;
  definitionId: string;
  name: string;
  // 親定義からのカスタマイズ
  overrides?: {
    name?: string;
    fields?: FormField[];
  };
}

// 実行中プロセスの状態
export type ExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

// ステップ履歴（差し戻し対応）
export interface StepHistory {
  stepIndex: number;
  action: 'submit' | 'approve' | 'reject';
  timestamp: Date;
  data?: Record<string, unknown>;
}

// ステップごとの定義スナップショット
export interface StepSnapshot {
  stepIndex: number;
  // このステップで使用される全ての定義のスナップショット（definitionIdをキーに）
  definitions: Record<string, ProcessDefinition>;
  startedAt: Date;
}

// プロセス実行インスタンス
export interface ProcessExecution {
  id: string;
  instanceName: string;
  definitionId: string;
  currentStepIndex: number;
  status: ExecutionStatus;
  data: Record<string, unknown>;
  history: StepHistory[];
  // 実行開始済みステップの定義スナップショット
  stepSnapshots?: StepSnapshot[];
}

// アプリケーションのモード
export type AppMode = 'home' | 'definition' | 'execution';

// アプリケーションの状態
export interface AppState {
  mode: AppMode;
  definitions: ProcessDefinition[];
  executions: ProcessExecution[];
  selectedDefinitionId: string | null;
  selectedExecutionId: string | null;
}

// アクションタイプ
export type AppAction =
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'SELECT_DEFINITION'; payload: string | null }
  | { type: 'SELECT_EXECUTION'; payload: string | null }
  | { type: 'ADD_DEFINITION'; payload: ProcessDefinition }
  | { type: 'UPDATE_DEFINITION'; payload: ProcessDefinition }
  | { type: 'DELETE_DEFINITION'; payload: string }
  | { type: 'ADD_EXECUTION'; payload: ProcessExecution }
  | { type: 'UPDATE_EXECUTION'; payload: ProcessExecution }
  | { type: 'DELETE_EXECUTION'; payload: string }
  | { type: 'CLEAR_ALL_EXECUTIONS' }
  | { type: 'CLEAR_ALL_CUSTOM_DEFINITIONS' };
