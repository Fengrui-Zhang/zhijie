import App from '../App';
import { ModelType } from '../types';

type DivinationRouteProps = {
  modelType?: ModelType;
  workspace?: 'divination' | 'records' | 'chat' | 'settings';
};

export default function DivinationRoute({
  modelType = ModelType.BAZI,
  workspace = 'divination',
}: DivinationRouteProps) {
  return <App initialModelType={modelType} initialWorkspace={workspace} />;
}
