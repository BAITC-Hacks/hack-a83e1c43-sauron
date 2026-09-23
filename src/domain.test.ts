import { describe, expect, it } from 'vitest';
import { calculateReadiness, emptyTask, safeExternalUrl, taskPayload } from './domain';

describe('Readiness contract with Django', () => {
  it('ignores whitespace and non-scoring metadata', () => {
    expect(
      calculateReadiness({
        ...emptyTask,
        title: 'A title',
        industry: 'education',
        context: '  \n ',
      }).score,
    ).toBe(0);
  });
  it('awards half of a two-field block, as the backend does', () => {
    const result = calculateReadiness({
      ...emptyTask,
      context: 'Context',
      business_contact: 'Contact',
    });
    expect(result.score).toBe(15);
    expect(result.missing_fields).toContain('need');
    expect(result.missing_fields).not.toContain('context');
    expect(result.breakdown[0].complete).toBe(false);
  });
  it('respects all readiness thresholds', () => {
    const working = { ...emptyTask, context: 'Контекст бизнеса', need: 'Нужен прогноз', data: 'Продажи за год' };
    const ready = { ...working, expected_result: 'Прототип панели', success_criteria: 'Точность 80 процентов' };
    const priority = { ...ready, constraints: 'Две недели', users: 'Управляющий пекарни' };
    expect(calculateReadiness(working)).toMatchObject({ score: 40, level: 'working' });
    expect(calculateReadiness(ready)).toMatchObject({ score: 70, level: 'ready' });
    expect(calculateReadiness(priority)).toMatchObject({ score: 90, level: 'priority' });
    expect(
      calculateReadiness({ ...priority, business_contact: 'Менеджер проекта', interaction_format: 'Еженедельная встреча' }),
    ).toMatchObject({ score: 100, level: 'priority', missing_fields: [] });
  });
  it('does not award points for placeholder answers', () => {
    for (const value of ['x', 'xxx', 'test', 'тест', '???', 'TODO']) {
      const result = calculateReadiness({ ...emptyTask, context: value, need: value, data: value });
      expect(result.score).toBe(0);
      expect(result.quality_warnings).toContain('context');
    }
  });
});
describe('Untrusted and server-owned fields', () => {
  it('never sends score, status or IDs when saving an editable brief', () => {
    const input = { ...emptyTask, title: '  A task  ', score: 100, id: 123, status: 'published' };
    const result = taskPayload(input);
    expect(result.title).toBe('A task');
    expect(result).not.toHaveProperty('score');
    expect(result).not.toHaveProperty('status');
    expect(result).not.toHaveProperty('id');
  });
  it('only opens HTTP(S) prototype links', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeExternalUrl('data:text/html,hello')).toBeUndefined();
    expect(safeExternalUrl('not a link')).toBeUndefined();
    expect(safeExternalUrl('https://example.com/prototype')).toBe('https://example.com/prototype');
  });
});
