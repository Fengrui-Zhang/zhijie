import DivinationRoute from '../divination-route';
import { ModelType } from '../../types';

export default function MonthlyPage() {
  return <DivinationRoute modelType={ModelType.MONTHLY_FORTUNE} />;
}
