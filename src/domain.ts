import type { TaskInput, Readiness, ReadinessLevel } from './types';

export const emptyTask: TaskInput = {
  title: '',
  draft_text: '',
  industry: '',
  context: '',
  need: '',
  users: '',
  data: '',
  constraints: '',
  expected_result: '',
  success_criteria: '',
  business_contact: '',
  interaction_format: '',
};
export const industries: Record<string, { label: string; short: string; tone: string }> = {
  education: { label: 'Образование', short: 'EDTECH', tone: 'lilac' },
  retail: { label: 'Ритейл', short: 'RETAIL', tone: 'peach' },
  logistics: { label: 'Логистика', short: 'LOGISTICS', tone: 'blue' },
  sustainability: { label: 'Экология', short: 'GREENTECH', tone: 'green' },
  services: { label: 'Сервисы', short: 'SERVICES', tone: 'pink' },
  technology: { label: 'Технологии', short: 'TECH', tone: 'blue' },
};
export const industryInfo = (key: string) =>
  industries[key] || { label: key || 'Без отрасли', short: key || 'PROJECT', tone: 'green' };
export const levelLabels: Record<ReadinessLevel, string> = {
  draft: 'Черновая',
  working: 'Рабочая',
  ready: 'Готовая',
  priority: 'Приоритетная',
};
export const fieldLabels: Record<keyof TaskInput, string> = {
  title: 'Название задачи',
  draft_text: 'Идея своими словами',
  industry: 'Отрасль',
  context: 'Контекст',
  need: 'Что нужно изменить',
  users: 'Для кого решение',
  data: 'Данные и материалы',
  constraints: 'Ограничения',
  expected_result: 'Ожидаемый результат',
  success_criteria: 'Критерии успеха',
  business_contact: 'Контакт со стороны бизнеса',
  interaction_format: 'Формат взаимодействия',
};
// Mirrors challenges/scoring.py for the local demo and the unsaved preview.
const rules: { key: string; label: string; max: number; fields: (keyof TaskInput)[] }[] = [
  {
    key: 'context_and_need',
    label: 'Контекст и потребность',
    max: 20,
    fields: ['context', 'need'],
  },
  { key: 'data', label: 'Данные и материалы', max: 20, fields: ['data'] },
  { key: 'expected_result', label: 'Ожидаемый результат', max: 15, fields: ['expected_result'] },
  { key: 'success_criteria', label: 'Критерии успеха', max: 15, fields: ['success_criteria'] },
  { key: 'constraints', label: 'Ограничения', max: 10, fields: ['constraints'] },
  { key: 'users', label: 'Пользователи', max: 10, fields: ['users'] },
  {
    key: 'business_connection',
    label: 'Связь с бизнесом',
    max: 10,
    fields: ['business_contact', 'interaction_format'],
  },
];
export const questionFields = rules.flatMap((rule) => rule.fields);
export function hasValue(value: string): boolean {
  const text = value.trim().toLocaleLowerCase('ru').replace(/^[.!? ]+|[.!? ]+$/g, '');
  if (['test', 'тест', 'todo', 'tbd', 'asdf', 'qwerty', 'не знаю', 'уточняется', 'позже', 'n/a'].includes(text)) return false;
  const letters = text.match(/[\p{L}\p{N}]/gu) || [];
  return letters.length >= 3 && new Set(letters).size >= 2;
}
export function calculateReadiness(task: TaskInput): Readiness {
  const breakdown = rules.map((rule) => {
    const missing = rule.fields.filter((field) => !hasValue(task[field] || ''));
    return {
      key: rule.key,
      label: rule.label,
      max_points: rule.max,
      points:
        missing.length === 0
          ? rule.max
          : missing.length < rule.fields.length
            ? Math.floor(rule.max / 2)
            : 0,
      complete: missing.length === 0,
      missing_fields: missing,
    };
  });
  const score = breakdown.reduce((sum, block) => sum + block.points, 0);
  const level =
    score >= 90 ? 'priority' : score >= 70 ? 'ready' : score >= 40 ? 'working' : 'draft';
  return {
    score,
    level,
    level_label: levelLabels[level],
    breakdown,
    missing_fields: breakdown.flatMap((item) => item.missing_fields),
    quality_warnings: questionFields.filter((field) => task[field]?.trim() && !hasValue(task[field])),
  };
}
export function taskPayload(task: TaskInput): TaskInput {
  return Object.fromEntries(
    Object.keys(emptyTask).map((key) => [key, task[key as keyof TaskInput]?.trim() || '']),
  ) as unknown as TaskInput;
}
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(new Date(date));
export function safeExternalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
