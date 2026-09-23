import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { emptyTask } from './domain';

afterEach(() => vi.unstubAllGlobals());
describe('Django request contract', () => {
  it('requires the documented explicit publication payload', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 9, status: 'published' })));
    vi.stubGlobal('fetch', fetch);
    await api('live').publish(9);
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/tasks/9/publish/');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ confirmed: true });
  });
  it('uses PATCH for an existing task and excludes read-only fields', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 7 })));
    vi.stubGlobal('fetch', fetch);
    await api('live').saveTask({ ...emptyTask, title: 'Updated' }, 7);
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/tasks/7/');
    expect(fetch.mock.calls[0][1].method).toBe('PATCH');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty('status');
  });
  it('reports server validation errors without pretending a write succeeded', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ title: ['Too long.'] }), { status: 400 })),
    );
    await expect(api('live').saveTask({ ...emptyTask, title: 'Bad' })).rejects.toThrow(
      'Название задачи: Too long.',
    );
  });
  it('does not substitute demo data after a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('live').snapshot()).rejects.toThrow('Не удалось связаться с сервером');
  });
});
