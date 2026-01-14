import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type {
  AppState,
  AppAction,
  AppMode,
  ProcessDefinition,
  ProcessExecution,
} from '../types';

const STORAGE_KEY = 'workflow-app-state';

// ベースプロセス定義（初期データ）
const baseDefinitions: ProcessDefinition[] = [
  {
    id: 'base-form',
    name: 'フォーム入力',
    type: 'form',
    description: '入力フォームを表示し、ユーザーからデータを収集します',
    fields: [],
    isBase: true,
  },
  {
    id: 'base-approval',
    name: '承認/確認',
    type: 'approval',
    description: '前のステップで入力された情報を確認・承認します',
    isBase: true,
  },
  {
    id: 'base-reference',
    name: '情報参照',
    type: 'reference',
    description: 'ワークフローで収集された情報を参照・編集します',
    isBase: true,
  },
];

// ローカルストレージから状態を読み込む
function loadStateFromStorage(): AppState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // ベースプロセスは常に最新の定義を使用
      const customDefinitions = parsed.definitions?.filter(
        (def: ProcessDefinition) => !def.isBase
      ) || [];
      return {
        ...parsed,
        mode: 'home', // 起動時は常にホーム
        definitions: [...baseDefinitions, ...customDefinitions],
        selectedDefinitionId: null,
        selectedExecutionId: null,
      };
    }
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
  }
  return null;
}

// 状態をローカルストレージに保存
function saveStateToStorage(state: AppState) {
  try {
    // 保存用にシンプルな形式に変換
    const toSave = {
      definitions: state.definitions,
      executions: state.executions,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

// 初期状態
const initialState: AppState = loadStateFromStorage() || {
  mode: 'home',
  definitions: [...baseDefinitions],
  executions: [],
  selectedDefinitionId: null,
  selectedExecutionId: null,
};

// リデューサー
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        selectedDefinitionId: null,
        selectedExecutionId: null,
      };

    case 'SELECT_DEFINITION':
      return {
        ...state,
        selectedDefinitionId: action.payload,
      };

    case 'SELECT_EXECUTION':
      return {
        ...state,
        selectedExecutionId: action.payload,
      };

    case 'ADD_DEFINITION':
      return {
        ...state,
        definitions: [...state.definitions, action.payload],
      };

    case 'UPDATE_DEFINITION':
      return {
        ...state,
        definitions: state.definitions.map((def) =>
          def.id === action.payload.id ? action.payload : def
        ),
      };

    case 'DELETE_DEFINITION':
      return {
        ...state,
        definitions: state.definitions.filter((def) => def.id !== action.payload),
        selectedDefinitionId:
          state.selectedDefinitionId === action.payload
            ? null
            : state.selectedDefinitionId,
      };

    case 'ADD_EXECUTION':
      return {
        ...state,
        executions: [...state.executions, action.payload],
      };

    case 'UPDATE_EXECUTION':
      return {
        ...state,
        executions: state.executions.map((exec) =>
          exec.id === action.payload.id ? action.payload : exec
        ),
      };

    case 'DELETE_EXECUTION':
      return {
        ...state,
        executions: state.executions.filter((exec) => exec.id !== action.payload),
        selectedExecutionId:
          state.selectedExecutionId === action.payload
            ? null
            : state.selectedExecutionId,
      };

    case 'CLEAR_ALL_EXECUTIONS':
      return {
        ...state,
        executions: [],
        selectedExecutionId: null,
      };

    case 'CLEAR_ALL_CUSTOM_DEFINITIONS':
      return {
        ...state,
        definitions: state.definitions.filter((def) => def.isBase),
        selectedDefinitionId: null,
      };

    default:
      return state;
  }
}

// Context型
interface WorkflowContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // ヘルパー関数
  setMode: (mode: AppMode) => void;
  selectDefinition: (id: string | null) => void;
  selectExecution: (id: string | null) => void;
  addDefinition: (definition: ProcessDefinition) => void;
  updateDefinition: (definition: ProcessDefinition) => void;
  deleteDefinition: (id: string) => void;
  addExecution: (execution: ProcessExecution) => void;
  updateExecution: (execution: ProcessExecution) => void;
  deleteExecution: (id: string) => void;
  clearAllExecutions: () => void;
  clearAllCustomDefinitions: () => void;
  getDefinitionById: (id: string) => ProcessDefinition | undefined;
  getExecutionById: (id: string) => ProcessExecution | undefined;
}

// Context作成
const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

// Provider
export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 状態が変更されたらローカルストレージに保存
  useEffect(() => {
    saveStateToStorage(state);
  }, [state.definitions, state.executions]);

  const value: WorkflowContextType = {
    state,
    dispatch,
    setMode: (mode) => dispatch({ type: 'SET_MODE', payload: mode }),
    selectDefinition: (id) => dispatch({ type: 'SELECT_DEFINITION', payload: id }),
    selectExecution: (id) => dispatch({ type: 'SELECT_EXECUTION', payload: id }),
    addDefinition: (definition) =>
      dispatch({ type: 'ADD_DEFINITION', payload: definition }),
    updateDefinition: (definition) =>
      dispatch({ type: 'UPDATE_DEFINITION', payload: definition }),
    deleteDefinition: (id) => dispatch({ type: 'DELETE_DEFINITION', payload: id }),
    addExecution: (execution) =>
      dispatch({ type: 'ADD_EXECUTION', payload: execution }),
    updateExecution: (execution) =>
      dispatch({ type: 'UPDATE_EXECUTION', payload: execution }),
    deleteExecution: (id) => dispatch({ type: 'DELETE_EXECUTION', payload: id }),
    clearAllExecutions: () => dispatch({ type: 'CLEAR_ALL_EXECUTIONS' }),
    clearAllCustomDefinitions: () => dispatch({ type: 'CLEAR_ALL_CUSTOM_DEFINITIONS' }),
    getDefinitionById: (id) => state.definitions.find((def) => def.id === id),
    getExecutionById: (id) => state.executions.find((exec) => exec.id === id),
  };

  return (
    <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
  );
}

// Hook
export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
