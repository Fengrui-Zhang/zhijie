import DivinationRoute from '../../divination-route';
import { ModelType } from '../../../types';

type BaziCasePageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function BaziCasePage({ params }: BaziCasePageProps) {
  const { caseId } = await params;
  return <DivinationRoute modelType={ModelType.BAZI} initialCaseId={caseId} />;
}
