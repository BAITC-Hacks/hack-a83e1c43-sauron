import { demo } from './demo';
import { taskPayload, fieldLabels } from './domain';
import type {
  Analysis,
  Mode,
  Proposal,
  ProposalInput,
  ProposalStatus,
  Task,
  TaskInput,
  Team,
  TeamInput,
  Snapshot,
} from './types';

const BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
function errorText(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) return payload.map(errorText).join(' ');
  if (payload && typeof payload === 'object')
    return Object.entries(payload)
      .map(
        ([key, value]) =>
          `${key === 'detail' || key === 'non_field_errors' ? '' : `${fieldLabels[key as keyof TaskInput] || key}: `}${errorText(value)}`,
      )
      .join(' ');
  return 'Не удалось выполнить запрос.';
}
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), path.includes('analyze') ? 65000 : 15000);
  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        payload ? errorText(payload) : 'Сервис временно недоступен. Повторите попытку.',
      );
    if (payload === null) throw new Error('Сервис вернул пустой ответ. Проверьте подключение.');
    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw new Error('Сервис отвечает слишком долго. Повторите попытку.');
    if (error instanceof TypeError)
      throw new Error('Не удалось связаться с сервером. Проверьте подключение или откройте демо.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
async function list<T>(path: string): Promise<T[]> {
  const payload = await request<T[] | { results: T[]; next: string | null }>(path);
  // Current Django API is unpaginated. Reject truncation if the backend enables pagination.
  if (!Array.isArray(payload) && payload.next)
    throw new Error('Сервис включил постраничную выдачу. Требуется обновить API-адаптер.');
  return Array.isArray(payload) ? payload : payload.results;
}
const live = {
  snapshot: async (): Promise<Snapshot> => {
    const [tasks, teams, proposals] = await Promise.all([
      list<Task>('/tasks/?include_drafts=true'),
      list<Team>('/teams/'),
      list<Proposal>('/proposals/'),
    ]);
    return { tasks, teams, proposals };
  },
  analyze: (draft_text: string) => request<Analysis>('/tasks/analyze/', 'POST', { draft_text }),
  saveTask: (input: TaskInput, id?: number) =>
    request<Task>(id ? `/tasks/${id}/` : '/tasks/', id ? 'PATCH' : 'POST', taskPayload(input)),
  publish: (id: number) => request<Task>(`/tasks/${id}/publish/`, 'POST', { confirmed: true }),
  saveTeam: (input: TeamInput, id?: number) =>
    request<Team>(id ? `/teams/${id}/` : '/teams/', id ? 'PATCH' : 'POST', input),
  sendProposal: (taskId: number, input: ProposalInput) =>
    request<Proposal>(`/tasks/${taskId}/proposals/`, 'POST', input),
  decide: (id: number, decision: Exclude<ProposalStatus, 'pending'>) =>
    request<Proposal>(`/proposals/${id}/decision/`, 'POST', { decision }),
};
export const api = (mode: Mode) => (mode === 'demo' ? demo : live);
