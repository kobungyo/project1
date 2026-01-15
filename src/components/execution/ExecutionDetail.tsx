import { Card, Empty, Steps, Typography, Result, Divider } from 'antd';
import { useMemo, useEffect, useCallback } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { FormStep } from './FormStep';
import { ApprovalStep } from './ApprovalStep';
import { ReferenceStep } from './ReferenceStep';
import type { ProcessInstance, ProcessDefinition, StepSnapshot } from '../../types';

const { Title, Text } = Typography;

// 展開されたステップの型（実行可能なステップのみ）
interface FlattenedStep {
  instance: ProcessInstance;
  definition: ProcessDefinition;
  path: string[]; // パンくずリスト用（名前の配列）
  hierarchyPath: HierarchyPathItem[]; // 階層パス（各レベルでのインデックス情報付き）
}

// 階層パスの各要素
interface HierarchyPathItem {
  instance: ProcessInstance;
  definition: ProcessDefinition;
  indexInParent: number; // 親内でのインデックス
  siblings: SiblingInfo[]; // 同階層の兄弟情報
}

// 兄弟ノードの情報
interface SiblingInfo {
  instance: ProcessInstance;
  definition: ProcessDefinition;
  indexInParent: number;
  flatStartIndex: number; // flatSteps内の開始インデックス
  flatEndIndex: number; // flatSteps内の終了インデックス
}

export function ExecutionDetail() {
  const { state, getDefinitionById, getExecutionById, updateExecution, getStepSnapshot } = useWorkflow();

  // ステップで使用される全ての定義を再帰的に収集
  const collectDefinitionsForStep = useCallback((
    children: ProcessInstance[],
    targetFlatIndex: number,
    currentFlatIndex: number = 0
  ): { definitions: Record<string, ProcessDefinition>; found: boolean; nextIndex: number } => {
    const definitions: Record<string, ProcessDefinition> = {};
    let idx = currentFlatIndex;

    for (const child of children) {
      const childDef = getDefinitionById(child.definitionId);
      if (!childDef) {
        continue;
      }

      if (childDef.type === 'composite' && childDef.children && childDef.children.length > 0) {
        // 複合プロセスの場合は再帰
        const result = collectDefinitionsForStep(childDef.children, targetFlatIndex, idx);
        if (result.found) {
          // 見つかった場合、この複合プロセスの定義も含める
          definitions[childDef.id] = childDef;
          Object.assign(definitions, result.definitions);
          return { definitions, found: true, nextIndex: result.nextIndex };
        }
        idx = result.nextIndex;
      } else {
        // 実行可能なステップ
        if (idx === targetFlatIndex) {
          definitions[childDef.id] = childDef;
          return { definitions, found: true, nextIndex: idx + 1 };
        }
        idx++;
      }
    }

    return { definitions, found: false, nextIndex: idx };
  }, [getDefinitionById]);

  // スナップショットを作成
  const createSnapshotForStep = useCallback((
    stepIndex: number,
    rootDefinition: ProcessDefinition
  ): StepSnapshot | null => {
    if (!rootDefinition.children) return null;

    const result = collectDefinitionsForStep(rootDefinition.children, stepIndex);
    if (!result.found) return null;

    // ルート定義も含める
    result.definitions[rootDefinition.id] = rootDefinition;

    return {
      stepIndex,
      definitions: result.definitions,
      startedAt: new Date(),
    };
  }, [collectDefinitionsForStep]);

  // スナップショットから定義を取得、なければ最新の定義を返す
  const getDefinitionWithSnapshot = useCallback((
    definitionId: string,
    stepIndex: number,
    currentExecution: typeof execution
  ): ProcessDefinition | undefined => {
    if (currentExecution) {
      const snapshot = currentExecution.stepSnapshots?.find((s) => s.stepIndex === stepIndex);
      if (snapshot && snapshot.definitions[definitionId]) {
        return snapshot.definitions[definitionId];
      }
    }
    return getDefinitionById(definitionId);
  }, [getDefinitionById]);

  // 再帰的にステップを展開し、階層情報を付与する
  const flattenWithHierarchy = useCallback((
    children: ProcessInstance[],
    currentExecution: typeof execution,
    currentStepIndex: number
  ): FlattenedStep[] => {
    // まずフラット化して各ステップのflatIndex範囲を計算
    const countFlatSteps = (childList: ProcessInstance[]): number => {
      let count = 0;
      for (const child of childList) {
        // スナップショットがあれば使用、なければ最新の定義
        const childDef = getDefinitionWithSnapshot(child.definitionId, currentStepIndex, currentExecution);
        if (!childDef) continue;
        if (childDef.type === 'composite' && childDef.children && childDef.children.length > 0) {
          count += countFlatSteps(childDef.children);
        } else {
          count += 1;
        }
      }
      return count;
    };

    const flatten = (
      childList: ProcessInstance[],
      parentPath: string[],
      parentHierarchyPath: HierarchyPathItem[],
      flatIndexOffset: number
    ): FlattenedStep[] => {
      const result: FlattenedStep[] = [];

      // まず兄弟情報を構築
      const siblings: SiblingInfo[] = [];
      let currentFlatIndex = flatIndexOffset;
      for (let i = 0; i < childList.length; i++) {
        const child = childList[i];
        const childDef = getDefinitionWithSnapshot(child.definitionId, currentStepIndex, currentExecution);
        if (!childDef) continue;

        const stepCount = childDef.type === 'composite' && childDef.children
          ? countFlatSteps(childDef.children)
          : 1;

        siblings.push({
          instance: child,
          definition: childDef,
          indexInParent: i,
          flatStartIndex: currentFlatIndex,
          flatEndIndex: currentFlatIndex + stepCount,
        });
        currentFlatIndex += stepCount;
      }

      // 各子要素を処理
      for (let i = 0; i < childList.length; i++) {
        const child = childList[i];
        const childDef = getDefinitionWithSnapshot(child.definitionId, currentStepIndex, currentExecution);
        if (!childDef) continue;

        const siblingInfo = siblings[i];
        const currentPath = [...parentPath, child.name];
        const currentHierarchyItem: HierarchyPathItem = {
          instance: child,
          definition: childDef,
          indexInParent: i,
          siblings,
        };
        const currentHierarchyPath = [...parentHierarchyPath, currentHierarchyItem];

        if (childDef.type === 'composite' && childDef.children && childDef.children.length > 0) {
          // 複合プロセスの場合は再帰
          result.push(...flatten(
            childDef.children,
            currentPath,
            currentHierarchyPath,
            siblingInfo.flatStartIndex
          ));
        } else {
          // 実行可能なステップ
          result.push({
            instance: child,
            definition: childDef,
            path: currentPath,
            hierarchyPath: currentHierarchyPath,
          });
        }
      }

      return result;
    };

    return flatten(children, [], [], 0);
  }, [getDefinitionWithSnapshot]);

  const execution = state.selectedExecutionId
    ? getExecutionById(state.selectedExecutionId)
    : null;

  const definition = execution
    ? getDefinitionById(execution.definitionId)
    : null;

  // 入れ子を展開したフラットなステップリスト
  const flatSteps = useMemo(() => {
    if (!definition?.children || !execution) return [];
    return flattenWithHierarchy(definition.children, execution, execution.currentStepIndex);
  }, [definition, execution, flattenWithHierarchy]);

  // 現在のステップにスナップショットがなければ作成
  useEffect(() => {
    if (!execution || !definition || execution.status === 'completed' || execution.status === 'rejected') {
      return;
    }

    const currentStepIndex = execution.currentStepIndex;
    const existingSnapshot = getStepSnapshot(execution, currentStepIndex);

    if (!existingSnapshot) {
      const snapshot = createSnapshotForStep(currentStepIndex, definition);
      if (snapshot) {
        const updatedSnapshots = [...(execution.stepSnapshots || []), snapshot];
        updateExecution({
          ...execution,
          stepSnapshots: updatedSnapshots,
        });
      }
    }
  }, [execution, definition, getStepSnapshot, createSnapshotForStep, updateExecution]);

  if (!state.selectedExecutionId) {
    return (
      <Card>
        <Empty description="プロセスを選択するか、新規プロセスを開始してください" />
      </Card>
    );
  }

  if (!execution) {
    return (
      <Card>
        <Empty description="プロセスが見つかりません" />
      </Card>
    );
  }

  if (!definition || !definition.children) {
    return (
      <Card>
        <Empty description="プロセス定義が見つかりません" />
      </Card>
    );
  }

  if (flatSteps.length === 0) {
    return (
      <Card>
        <Empty description="実行可能なステップがありません" />
      </Card>
    );
  }

  const currentStep = flatSteps[execution.currentStepIndex];
  const currentStepInstance = currentStep?.instance;
  const currentStepDef = currentStep?.definition;

  // 完了した場合
  if (execution.status === 'completed') {
    return (
      <Card>
        <Result
          status="success"
          title="プロセス完了"
          subTitle={`${execution.instanceName} は正常に完了しました`}
        />
        <Card style={{ marginTop: '16px' }}>
          <Title level={5}>入力データ</Title>
          {Object.keys(execution.data).length === 0 ? (
            <Text type="secondary">データがありません</Text>
          ) : (
            <div>
              {Object.entries(execution.data).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '8px' }}>
                  <Text strong>{key}: </Text>
                  <Text>{String(value)}</Text>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Card>
    );
  }

  // 却下された場合
  if (execution.status === 'rejected') {
    return (
      <Card>
        <Result
          status="error"
          title="プロセス却下"
          subTitle={`${execution.instanceName} は却下されました`}
        />
        <Card style={{ marginTop: '16px' }}>
          <Title level={5}>入力データ</Title>
          {Object.keys(execution.data).length === 0 ? (
            <Text type="secondary">データがありません</Text>
          ) : (
            <div>
              {Object.entries(execution.data).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '8px' }}>
                  <Text strong>{key}: </Text>
                  <Text>{String(value)}</Text>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Card>
    );
  }

  // 階層ごとのステップ表示データを生成
  const generateHierarchySteps = () => {
    if (!currentStep) return [];

    const hierarchyPath = currentStep.hierarchyPath;
    const rows: Array<{
      label: string;
      items: Array<{
        title: string;
        description: string;
        status: 'wait' | 'process' | 'finish' | 'error';
      }>;
      currentIndex: number;
    }> = [];

    for (let level = 0; level < hierarchyPath.length; level++) {
      const pathItem = hierarchyPath[level];
      const siblings = pathItem.siblings;

      const items = siblings.map((sibling) => {
        let status: 'wait' | 'process' | 'finish' | 'error' = 'wait';

        // このsiblingの全ステップが完了しているか？
        if (sibling.flatEndIndex <= execution.currentStepIndex) {
          status = 'finish';
        } else if (
          execution.currentStepIndex >= sibling.flatStartIndex &&
          execution.currentStepIndex < sibling.flatEndIndex
        ) {
          status = 'process';
        }

        const typeLabel = sibling.definition.type === 'composite' ? '複合' :
                          sibling.definition.type === 'form' ? 'フォーム' :
                          sibling.definition.type === 'approval' ? '承認' :
                          sibling.definition.type === 'reference' ? '参照' : '';

        return {
          title: sibling.instance.name,
          description: typeLabel,
          status,
        };
      });

      // このレベルでのカレントインデックス
      const currentIndexAtLevel = pathItem.indexInParent;

      // ラベル（親の名前、最初のレベルは"全体"）
      const label = level === 0 ? '全体の進行' : `${hierarchyPath[level - 1].instance.name} 内`;

      rows.push({
        label,
        items,
        currentIndex: currentIndexAtLevel,
      });
    }

    return rows;
  };

  const hierarchyRows = generateHierarchySteps();

  // 現在のステップに応じたコンポーネント
  const renderCurrentStep = () => {
    if (!currentStep || !currentStepDef || !currentStepInstance) {
      return <Empty description="ステップが見つかりません" />;
    }

    switch (currentStepDef.type) {
      case 'form':
        return (
          <FormStep
            execution={execution}
            stepInstance={currentStepInstance}
            stepDefinition={currentStepDef}
            onSubmit={(data) => {
              const newData = { ...execution.data, ...data };
              const nextIndex = execution.currentStepIndex + 1;
              const isCompleted = nextIndex >= flatSteps.length;

              updateExecution({
                ...execution,
                data: newData,
                currentStepIndex: isCompleted ? execution.currentStepIndex : nextIndex,
                status: isCompleted ? 'completed' : 'in_progress',
                history: [
                  ...execution.history,
                  {
                    stepIndex: execution.currentStepIndex,
                    action: 'submit',
                    timestamp: new Date(),
                    data,
                  },
                ],
              });
            }}
          />
        );

      case 'approval':
        return (
          <ApprovalStep
            execution={execution}
            onApprove={() => {
              const nextIndex = execution.currentStepIndex + 1;
              const isCompleted = nextIndex >= flatSteps.length;

              updateExecution({
                ...execution,
                currentStepIndex: isCompleted ? execution.currentStepIndex : nextIndex,
                status: isCompleted ? 'completed' : 'in_progress',
                history: [
                  ...execution.history,
                  {
                    stepIndex: execution.currentStepIndex,
                    action: 'approve',
                    timestamp: new Date(),
                  },
                ],
              });
            }}
            onReject={() => {
              // 差し戻し：前のフォーム入力ステップに戻る
              let prevFormIndex = execution.currentStepIndex - 1;
              while (prevFormIndex >= 0) {
                const prevStep = flatSteps[prevFormIndex];
                if (prevStep.definition.type === 'form') {
                  break;
                }
                prevFormIndex--;
              }

              if (prevFormIndex < 0) {
                prevFormIndex = 0;
              }

              updateExecution({
                ...execution,
                currentStepIndex: prevFormIndex,
                history: [
                  ...execution.history,
                  {
                    stepIndex: execution.currentStepIndex,
                    action: 'reject',
                    timestamp: new Date(),
                  },
                ],
              });
            }}
          />
        );

      case 'reference':
        return (
          <ReferenceStep
            execution={execution}
            onComplete={() => {
              const nextIndex = execution.currentStepIndex + 1;
              const isCompleted = nextIndex >= flatSteps.length;

              updateExecution({
                ...execution,
                currentStepIndex: isCompleted ? execution.currentStepIndex : nextIndex,
                status: isCompleted ? 'completed' : 'in_progress',
                history: [
                  ...execution.history,
                  {
                    stepIndex: execution.currentStepIndex,
                    action: 'submit',
                    timestamp: new Date(),
                  },
                ],
              });
            }}
            onEdit={(data) => {
              updateExecution({
                ...execution,
                data: { ...execution.data, ...data },
              });
            }}
          />
        );

      default:
        return <Empty description="未対応のステップタイプです" />;
    }
  };

  return (
    <Card>
      <Title level={4}>{execution.instanceName}</Title>
      <Text type="secondary">{definition.name}</Text>

      <div style={{ margin: '24px 0' }}>
        {hierarchyRows.map((row, rowIndex) => (
          <div key={rowIndex}>
            {rowIndex > 0 && <Divider style={{ margin: '12px 0' }} />}
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
              {row.label}
            </Text>
            <Steps
              current={row.currentIndex}
              items={row.items}
              size="small"
            />
          </div>
        ))}
      </div>

      <Card style={{ marginTop: '24px' }}>
        {renderCurrentStep()}
      </Card>
    </Card>
  );
}
