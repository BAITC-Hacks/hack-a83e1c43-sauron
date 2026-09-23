import { demo } from './demo';
import { taskPayload, fieldLabels, questionFields } from './domain';
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
    const csrf = typeof document === 'undefined' ? undefined : document.cookie.split('; ').find((value) => value.startsWith('csrftoken='))?.split('=')[1];
    const response = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(csrf ? { 'X-CSRFToken': decodeURIComponent(csrf) } : {}),
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
  analyze: async (draft_text: string, input?: TaskInput) => {
    const card = input ? Object.fromEntries(questionFields.map((field) => [field, input[field].slice(0, 12000)])) : {};
    const result = await request<Analysis>('/tasks/analyze/', 'POST', { draft_text, card });
    if (!Array.isArray(result.questions) || result.questions.length < 3 || result.questions.length > 9 ||
        result.questions.some((item) => !item || !questionFields.includes(item.field as keyof TaskInput) || typeof item.question !== 'string' || item.question.trim().length < 10 || item.question.length > 600) ||
        new Set(result.questions.map((item) => item.field)).size !== result.questions.length) {
      throw new Error('AI вернул некорректные вопросы. Повторите запрос или заполните бриф самостоятельно.');
    }
    return result;
  },
  saveTask: (input: TaskInput, id?: number, confirmed = false) =>
    request<Task>(id ? `/tasks/${id}/` : '/tasks/', id ? 'PATCH' : 'POST', { ...taskPayload(input), ...(confirmed ? { confirmed: true } : {}) }),
  publish: (id: number) => request<Task>(`/tasks/${id}/publish/`, 'POST', { confirmed: true }),
  saveTeam: (input: TeamInput, id?: number) =>
    request<Team>(id ? `/teams/${id}/` : '/teams/', id ? 'PATCH' : 'POST', input),
  sendProposal: (taskId: number, input: ProposalInput) =>
    request<Proposal>(`/tasks/${taskId}/proposals/`, 'POST', input),
  decide: (id: number, decision: Exclude<ProposalStatus, 'pending'>) =>
    request<Proposal>(`/proposals/${id}/decision/`, 'POST', { decision }),
};
export const api = (mode: Mode) => (mode === 'demo' ? demo : live);
