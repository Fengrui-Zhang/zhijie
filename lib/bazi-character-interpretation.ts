import { HIDDEN_STEMS, rootRelation, stemElement, type CharacterAnalysis, type CharacterSource, type ShareUnit } from './bazi-character-analysis';

const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' } as const;

// Reader-facing interpretations are derived from the current result. Internal
// counting diagnostics (note/reasons/scopeNote) stay out of the interface.
export function describeCharacterSource(analysis: CharacterAnalysis, source: CharacterSource): string {
  const target = `${analysis.stem}${analysis.element}`;
  const char = source.label.slice(-1);
  if (source.category === 'root') {
    const relation = rootRelation(analysis.stem, char) ?? '';
    let meaning: string;
    if (relation.includes('长生')) meaning = `取${analysis.element}气萌生之意，是${target}的生发根源`;
    else if (relation.includes('余气')) meaning = `内含${analysis.element}的余气，形成${target}的余气根`;
    else if (relation.includes('库')) meaning = `取${analysis.element}气收藏之意，是${target}的墓库根源`;
    else if (relation.includes('寄火')) meaning = `通过火生土的关系，成为${target}的依托`;
    else meaning = `与${target}五行同气，为其提供根基`;
    const lu = source.tags.includes('禄根') ? `此处也是${analysis.stem}的禄位。` : '';
    return `${source.label}${meaning}。${lu}`;
  }
  if (source.category === 'peer') {
    return `${source.label}与${target}同属${analysis.element}，呈同气相助之象。`;
  }
  const donorElement = stemElement(char);
  if (donorElement) return `${source.label}属${donorElement}，${donorElement}生${analysis.element}，与${target}形成生扶关系。`;
  const hidden = HIDDEN_STEMS[char] ?? [];
  const generating = hidden.filter((stem) => {
    const element = stemElement(stem);
    return element !== null && GENERATES[element] === analysis.element;
  });
  const donor = generating[0];
  if (!donor) return `${source.label}与${target}的生扶路径见上方。`;
  const element = stemElement(donor);
  return donor === hidden[0]
    ? `${source.label}本气为${donor}${element}，以${element}生${analysis.element}的关系生扶${target}。`
    : `${source.label}中藏${generating.join('、')}${element}，其藏气与${target}有${element}生${analysis.element}的联系。`;
}

export function describeShareUnit(analysis: CharacterAnalysis, unit: ShareUnit): string {
  const target = `${analysis.stem}${analysis.element}`;
  const containsTarget = unit.memberKeys.includes(analysis.target.key);
  const labels = unit.sourceLabels.join('、');
  const roots = analysis.roots.filter((source) => unit.memberKeys.includes(source.pillarKey));
  if (unit.id === 'home:support') {
    const donor = unit.sourceLabels.find((label) => {
      const element = stemElement(label.slice(-1));
      return label.includes('天干') && element !== null && GENERATES[element] === analysis.element;
    });
    const donorRoots = donor ? unit.sourceLabels.filter((label) => label.includes('地支') && rootRelation(donor.slice(-1), label.slice(-1))) : [];
    const connection = donor && donorRoots.length
      ? `${donor}通根${donorRoots.join('、')}，以${stemElement(donor.slice(-1))}生${analysis.element}的关系生扶${target}。`
      : `${labels}在日时家内相互联系。`;
    return `${connection}${containsTarget ? `这条家内来源与${target}自身相连，` : '这条家内生扶来源'}合为一份。`;
  }
  if (containsTarget) {
    return roots.length
      ? `${analysis.location}在${roots.map((root) => root.label).join('、')}有根，自身与坐下根气相连，构成这一份。`
      : `${analysis.location}是所查之字的自身落点，为其中一份。`;
  }
  if (roots.length) return `${roots.map((root) => root.label).join('、')}承接${target}的根气，构成这一份根源。`;
  return `${labels}通过下方的生扶或同气联系参与${target}，构成这一份来源。`;
}
