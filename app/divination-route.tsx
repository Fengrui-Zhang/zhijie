import App from '../App';
import { ModelType } from '../types';

type DivinationRouteProps = {
  modelType?: ModelType;
  workspace?: 'divination' | 'records' | 'chat' | 'settings';
  settingsTab?: 'profile' | 'general' | 'charts' | 'knowledge' | 'help' | 'security';
};

export default function DivinationRoute({
  modelType = ModelType.BAZI,
  workspace = 'divination',
  settingsTab = 'profile',
}: DivinationRouteProps) {
  return <App initialModelType={modelType} initialWorkspace={workspace} initialSettingsTab={settingsTab} />;
}
