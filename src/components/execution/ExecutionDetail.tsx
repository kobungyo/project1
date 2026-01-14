import { Card, Empty, Steps, Typography, Result, Button } from 'antd';
import { useWorkflow } from '../../context/WorkflowContext';
import { FormStep } from './FormStep';
import { ApprovalStep } from './ApprovalStep';
import { ReferenceStep } from './ReferenceStep';

const { Title, Text } = Typography;

export function ExecutionDetail() {
  const { state, getDefinitionById, getExecutionById, updateExecution, deleteExecution, selectExecution } = useWorkflow();

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

  const children = definition.children;
  const currentStep = children[execution.currentStepIndex];
  const currentStepDef = currentStep ? getDefinitionById(currentStep.definitionId) : null;

  // 完了した場合
  if (execution.status === 'completed') {
    return (
      <Card>
        <Result
          status="success"
          title="プロセス完了"
          subTitle={`${execution.instanceName} は正常に完了しました`}
          extra={[
            <Button
              key="close"
              onClick={() => {
                deleteExecution(execution.id);
                selectExecution(null);
              }}
            >
              閉じる
            </Button>,
          ]}
        />
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
          extra={[
            <Button
              key="close"
              onClick={() => {
                deleteExecution(execution.id);
                selectExecution(null);
              }}
            >
              閉じる
            </Button>,
          ]}
        />
      </Card>
    );
  }

  // ステップ表示
  const stepsItems = children.map((child, index) => {
    const childDef = getDefinitionById(child.definitionId);
    let status: 'wait' | 'process' | 'finish' | 'error' = 'wait';

    if (index < execution.currentStepIndex) {
      status = 'finish';
    } else if (index === execution.currentStepIndex) {
      status = 'process';
    }

    return {
      title: child.name,
      description: childDef?.type === 'form' ? 'フォーム入力' :
                   childDef?.type === 'approval' ? '承認/確認' :
                   childDef?.type === 'reference' ? '情報参照' : '',
      status,
    };
  });

  // 現在のステップに応じたコンポーネント
  const renderCurrentStep = () => {
    if (!currentStep || !currentStepDef) {
      return <Empty description="ステップが見つかりません" />;
    }

    switch (currentStepDef.type) {
      case 'form':
        return (
          <FormStep
            execution={execution}
            stepInstance={currentStep}
            stepDefinition={currentStepDef}
            onSubmit={(data) => {
              const newData = { ...execution.data, ...data };
              const nextIndex = execution.currentStepIndex + 1;
              const isCompleted = nextIndex >= children.length;

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
              const isCompleted = nextIndex >= children.length;

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
                const prevStep = children[prevFormIndex];
                const prevDef = getDefinitionById(prevStep.definitionId);
                if (prevDef?.type === 'form') {
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
              updateExecution({
                ...execution,
                status: 'completed',
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
