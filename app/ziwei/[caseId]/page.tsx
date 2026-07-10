import DivinationRoute from '../../divination-route';
import { ModelType } from '../../../types';

type ZiweiCasePageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function ZiweiCasePage({ params }: ZiweiCasePageProps) {
  const { caseId } = await params;
  return <DivinationRoute modelType={ModelType.ZIWEI} initialCaseId={caseId} />;
}
