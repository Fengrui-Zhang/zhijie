import App from '../App';
import { ModelType } from '../types';

type DivinationRouteProps = {
  modelType?: ModelType;
  workspace?: 'home' | 'divination' | 'records' | 'chat' | 'settings';
  settingsTab?: 'profile' | 'general' | 'personalization' | 'charts' | 'knowledge' | 'help' | 'security';
  initialCaseId?: string;
};

export default function DivinationRoute({
  modelType = ModelType.BAZI,
  workspace = 'divination',
  settingsTab = 'profile',
  initialCaseId,
}: DivinationRouteProps) {
  return (
    <App
      initialModelType={modelType}
      initialWorkspace={workspace}
      initialSettingsTab={settingsTab}
      initialCaseId={initialCaseId}
    />
  );
}
