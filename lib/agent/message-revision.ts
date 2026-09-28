export type MessageRevision = { index: number; expectedContent: string; expectedMessageCount: number };
export type RevisionMessage = { id: string; role: string; content: string };
export function prepareMessageRevision(messages: RevisionMessage[], revision: MessageRevision) {
  if (!Number.isInteger(revision.index) || revision.index < 0 || revision.index >= messages.length || messages.length !== revision.expectedMessageCount) throw new Error('对话已变化，请刷新后重新编辑');
  const target = messages[revision.index];
  if (target.role !== 'user' || target.content !== revision.expectedContent) throw new Error('原问题已变化，请刷新后重新编辑');
  return { history: messages.slice(0, revision.index), replacedIds: messages.slice(revision.index).map((message) => message.id), snapshot: messages.map(({ id, role, content }) => ({ id, role, content })) };
}
export function revisionMatches(current: RevisionMessage[], snapshot: RevisionMessage[]) {
  return current.length === snapshot.length && current.every((message, index) => message.id === snapshot[index].id && message.role === snapshot[index].role && message.content === snapshot[index].content);
}
