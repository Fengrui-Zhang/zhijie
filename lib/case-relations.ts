export interface CaseRelationItem {
  id: string;
  caseAId: string;
  caseBId: string;
  labelAToB?: string | null;
  labelBToA?: string | null;
  caseATitle?: string | null;
  caseBTitle?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseRelationDraft {
  labelAToB: string;
  labelBToA: string;
}

export interface CaseRelationDisplayItem {
  id: string;
  counterpartCaseId: string;
  counterpartTitle: string;
  label: string;
}

const toText = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

export const normalizeCaseRelationItem = (value: unknown): CaseRelationItem | null => {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const id = toText(input.id);
  const caseAId = toText(input.caseAId);
  const caseBId = toText(input.caseBId);
  const createdAt = toText(input.createdAt);
  const updatedAt = toText(input.updatedAt);
  if (!id || !caseAId || !caseBId || !createdAt || !updatedAt) return null;
  return {
    id,
    caseAId,
    caseBId,
    labelAToB: toText(input.labelAToB) ?? null,
    labelBToA: toText(input.labelBToA) ?? null,
    caseATitle: toText(input.caseATitle) ?? null,
    caseBTitle: toText(input.caseBTitle) ?? null,
    createdAt,
    updatedAt,
  };
};

export const normalizeCaseRelationItems = (value: unknown): CaseRelationItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeCaseRelationItem(item))
    .filter((item): item is CaseRelationItem => item !== null);
};

export const getCaseDisplayRelations = (
  currentCaseId: string,
  relations: CaseRelationItem[]
): CaseRelationDisplayItem[] => {
  return relations.flatMap((relation) => {
    if (relation.caseAId === currentCaseId) {
      const counterpartTitle = relation.caseBTitle?.trim() || '关联命例';
      const label = relation.labelBToA?.trim();
      return label
        ? [{ id: relation.id, counterpartCaseId: relation.caseBId, counterpartTitle, label: `${counterpartTitle}的${label}` }]
        : [];
    }

    if (relation.caseBId === currentCaseId) {
      const counterpartTitle = relation.caseATitle?.trim() || '关联命例';
      const label = relation.labelAToB?.trim();
      return label
        ? [{ id: relation.id, counterpartCaseId: relation.caseAId, counterpartTitle, label: `${counterpartTitle}的${label}` }]
        : [];
    }

    return [];
  });
};

export const mapPairRelationsToDrafts = (
  relations: CaseRelationItem[],
  caseAId: string,
  caseBId: string
) => {
  return relations.flatMap((relation) => {
    if (relation.caseAId === caseAId && relation.caseBId === caseBId) {
      return [{
        id: relation.id,
        labelAToB: relation.labelAToB?.trim() || '',
        labelBToA: relation.labelBToA?.trim() || '',
      }];
    }

    if (relation.caseAId === caseBId && relation.caseBId === caseAId) {
      return [{
        id: relation.id,
        labelAToB: relation.labelBToA?.trim() || '',
        labelBToA: relation.labelAToB?.trim() || '',
      }];
    }

    return [];
  });
};

export const buildCaseRelationPromptText = (
  relations: Array<{ labelAToB?: string | null; labelBToA?: string | null }>,
  personAName: string,
  personBName: string
) => {
  const lines = relations.flatMap((relation) => {
    const aToB = relation.labelAToB?.trim() || '';
    const bToA = relation.labelBToA?.trim() || '';
    const items: string[] = [];
    if (aToB) items.push(`${personAName}是${personBName}的${aToB}`);
    if (bToA) items.push(`${personBName}是${personAName}的${bToA}`);
    return items;
  });
  return lines.join('；');
};
