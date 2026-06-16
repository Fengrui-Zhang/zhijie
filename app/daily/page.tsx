import DivinationRoute from '../divination-route';
import { ModelType } from '../../types';

export default function DailyPage() {
  return <DivinationRoute modelType={ModelType.DAILY_FORTUNE} />;
}
