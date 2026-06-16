import DivinationRoute from '../divination-route';
import { ModelType } from '../../types';

export default function AlmanacPage() {
  return <DivinationRoute modelType={ModelType.ALMANAC} />;
}
