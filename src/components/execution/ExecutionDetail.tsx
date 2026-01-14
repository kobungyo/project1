import { Card, Empty, Steps, Typography, Result } from 'antd';
import { useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { FormStep } from './FormStep';
import { ApprovalStep } from './ApprovalStep';
import { ReferenceStep } from './ReferenceStep';
import type { ProcessInstance, ProcessDefinition } from '../../types';

const { Title, Text } = Typography;

// 展開されたステップの型
interface FlattenedStep {
  instance: ProcessInstance;
  definition: ProcessDefinition;
  path: string[]; // パンくずリスト用
}

export function ExecutionDetail() {
  const { state, getDefinitionById, getExecutionById, updateExecution } = useWorkflow();

  // 入れ子のプロセスを再帰的に展開する関数
  const flattenSteps = useMemo(() => {
    return (
      children: ProcessInstance[],
      path: string[] = []
    ): FlattenedStep[] => {
      const result: FlattenedStep[] = [];

      for (const child of children) {
        const childDef = getDefinitionById(child.definitionId);
        if (!childDef) continue;

        const currentPath = [...path, child.name];

        if (childDef.type === 'composite' && childDef.children && childDef.children.length > 0) {
          // 複合プロセスの場合は再帰的に展開
          result.push(...flattenSteps(childDef.children, currentPath));
        } else {
          // 実行可能なステップ（form, approval, reference）
          result.push({
            instance: child,
            definition: childDef,
            path: currentPath,
          });
        }
      }

      return result;
    };
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
  const flatSteps = flattenSteps(definition.children);

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

  // ステップ表示（展開されたステップを使用）
  const stepsItems = flatSteps.map((step, index) => {
    let status: 'wait' | 'process' | 'finish' | 'error' = 'wait';

    if (index < execution.currentStepIndex) {
      status = 'finish';
    } else if (index === execution.currentStepIndex) {
      status = 'process';
    }

    const typeLabel = step.definition.type === 'form' ? 'フォーム入力' :
                      step.definition.type === 'approval' ? '承認/確認' :
                      step.definition.type === 'reference' ? '情報参照' : '';

    return {
      title: step.path.length > 1 ? step.path[step.path.length - 1] : step.instance.name,
      description: step.path.length > 1
        ? `${step.path.slice(0, -1).join(' > ')} | ${typeLabel}`
        : typeLabel,
      status,
    };
  });

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
              // 差し戻し：前のフォーム入力ステップに戻る（展開されたステップから検索）
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
        <Steps
          current={execution.currentStepIndex}
          items={stepsItems}
          size="small"
        />
      </div>

      <Card style={{ marginTop: '24px' }}>
        {renderCurrentStep()}
      </Card>
    </Card>
  );
}
