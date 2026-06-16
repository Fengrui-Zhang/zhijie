import App from '../App';
import { ModelType } from '../types';

type DivinationRouteProps = {
  modelType: ModelType;
};

export default function DivinationRoute({ modelType }: DivinationRouteProps) {
  return <App initialModelType={modelType} />;
}
