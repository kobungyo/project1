import { Card, Empty, Steps, Typography, Result, Divider } from 'antd';
import { useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { FormStep } from './FormStep';
import { ApprovalStep } from './ApprovalStep';
import { ReferenceStep } from './ReferenceStep';
import type { ProcessInstance, ProcessDefinition } from '../../types';

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
  const { state, getDefinitionById, getExecutionById, updateExecution } = useWorkflow();

  // 再帰的にステップを展開し、階層情報を付与する
  const flattenWithHierarchy = useMemo(() => {
    // まずフラット化して各ステップのflatIndex範囲を計算
    const countFlatSteps = (children: ProcessInstance[]): number => {
      let count = 0;
      for (const child of children) {
        const childDef = getDefinitionById(child.definitionId);
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
      children: ProcessInstance[],
      parentPath: string[],
      parentHierarchyPath: HierarchyPathItem[],
      flatIndexOffset: number
    ): FlattenedStep[] => {
      const result: FlattenedStep[] = [];

      // まず兄弟情報を構築
      const siblings: SiblingInfo[] = [];
      let currentFlatIndex = flatIndexOffset;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childDef = getDefinitionById(child.definitionId);
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
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childDef = getDefinitionById(child.definitionId);
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

    return (children: ProcessInstance[]) => flatten(children, [], [], 0);
  }, [getDefinitionById]);

  if (!state.selectedExecutionId) {
    return (
      <Card>
        <Empty description="プロセスを選択するか、新規プロセスを開始してください" />
      </Card>
    );
  }

  const execution = getExecutionById(state.selectedExecutionId);

  if (!execution) {
    return (
      <Card>
        <Empty description="プロセスが見つかりません" />
      </Card>
    );
  }

  const definition = getDefinitionById(execution.definitionId);

  if (!definition || !definition.children) {
    return (
      <Card>
        <Empty description="プロセス定義が見つかりません" />
      </Card>
    );
  }

  // 入れ子を展開したフラットなステップリスト
  const flatSteps = flattenWithHierarchy(definition.children);

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
