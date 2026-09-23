import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test('home, live catalog, search, bookmark, and readable desktop layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('своя гравитация.');
  await expect(page.locator('.task-card')).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Найти свою задачу' }).click();
  await expect(page.locator('.task-card')).toHaveCount(5);
  await page.getByRole('textbox', { name: 'Поиск задач' }).fill('пекарни');
  await expect(page.locator('.task-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Сохранить задачу', exact: true }).click();
  await page
    .getByRole('link', { name: /Сохранённое/ })
    .first()
    .click();
  await expect(page.locator('.task-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.task-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Убрать из сохранённого' }).click();
  await expect(
    page.getByRole('heading', { name: 'Сохраните свою первую возможность' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('complete live flow: analyze, draft, publish, team, proposal, and business decision', async ({
  page,
}) => {
  const title = `__SAURON_E2E_${Date.now()}`;
  const teamName = `${title}_TEAM`;
  const cleanup: { title: string; teamName: string; taskId?: number; teamId?: number } = {
    title,
    teamName,
  };
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/e2e-created.json', JSON.stringify(cleanup));
  await page.goto('/#/create');
  await page.getByLabel('Название задачи').fill(title);
  await page.getByLabel('Направление').selectOption('education');
  await page
    .getByLabel('Идея своими словами')
    .fill(
      'Нужна панель для кураторов, чтобы вовремя помогать студентам и видеть изменения посещаемости.',
    );
  await page.getByRole('button', { name: 'Уточнить с навигатором' }).click();
  await expect(page.getByRole('heading', { name: 'Немного больше ясности.' })).toBeVisible();
  const fields = page.locator('.question-block textarea');
  await expect(fields).toHaveCount(5);
  for (let index = 0; index < 5; index++)
    await fields
      .nth(index)
      .fill(
        [
          'Кураторы первого курса',
          'Обезличенные таблицы посещаемости',
          'Рабочий прототип панели',
          'Поиск риска за две минуты',
          'Четыре недели, только обезличенные данные',
        ][index],
      );
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await page
    .getByLabel('Контекст', { exact: true })
    .fill('Кураторы собирают информацию из разных таблиц вручную.');
  await page
    .getByLabel('Что нужно изменить')
    .fill('Сделать состояние групп понятным в одной панели.');
  await page.getByLabel('Контакт со стороны бизнеса').fill('Куратор тестовой программы');
  await page.getByLabel('Формат взаимодействия').fill('Встреча раз в неделю');
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.locator('.score-display')).toContainText('100');
  await page.getByRole('button', { name: 'К публикации' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const tasks = await (await page.request.get('/api/v1/tasks/?include_drafts=true')).json();
  cleanup.taskId = tasks.find((task: { title: string }) => task.title === title).id;
  writeFileSync('artifacts/e2e-created.json', JSON.stringify(cleanup));
  await expect(
    page.getByRole('button', { name: 'Опубликовать задачу', exact: true }),
  ).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Опубликовать задачу', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Предложить подход' }).click();
  await page.getByRole('button', { name: 'Создать новую команду' }).click();
  await page.getByLabel('Название команды').fill(teamName);
  await page.getByLabel('Что вас интересует').fill('Доступное образование');
  await page.getByLabel('Навыки', { exact: true }).fill('UX, аналитика данных');
  await page.getByLabel('Технологии', { exact: true }).fill('React, Python');
  await page.getByRole('button', { name: 'Создать команду', exact: true }).click();
  await page
    .getByLabel('Идея решения')
    .fill('Создадим понятную панель с объяснением факторов риска.');
  await page
    .getByLabel('Первые шаги')
    .fill('Интервью с кураторами, анализ данных, интерактивный прототип.');
  await page.getByLabel('Сроки', { exact: false }).fill('4 недели');
  await page.getByRole('button', { name: 'Отправить отклик' }).click();
  await expect(page.getByRole('heading', { name: 'Первый шаг сделан.' })).toBeVisible();
  const teams = await (await page.request.get('/api/v1/teams/')).json();
  cleanup.teamId = teams.find((team: { name: string }) => team.name === teamName).id;
  writeFileSync('artifacts/e2e-created.json', JSON.stringify(cleanup));
  await page.getByRole('link', { name: 'Перейти к откликам' }).click();
  const card = page
    .locator('.proposal-card')
    .filter({ has: page.getByRole('heading', { name: teamName, exact: true }) });
  await expect(card).toContainText('На рассмотрении');
  await card.getByRole('button', { name: 'Принять', exact: true }).click();
  await page.getByRole('button', { name: 'Подтвердить', exact: true }).click();
  await expect(card.locator('.status-pill')).toHaveText('Принят');
  await page.reload();
  await expect(card.locator('.status-pill')).toHaveText('Принят');
  await page.screenshot({ path: 'artifacts/workspace-desktop.png', fullPage: true });
  await page.goto(`/#/edit/${cleanup.taskId}`);
  await page.getByLabel('Название задачи').fill(`${title} edited`);
  await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click();
  await expect(page.getByRole('heading', { name: `${title} edited`, exact: true })).toBeVisible();
  cleanup.title = `${title} edited`;
  writeFileSync('artifacts/e2e-created.json', JSON.stringify(cleanup));
});

test('mobile navigation and core pages have no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.task-card').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.locator('.mobile-nav').getByRole('link', { name: 'Возможности' }).click();
  await expect(page.locator('.catalog-heading')).toBeVisible();
  for (const path of [
    '/projects',
    '/projects/1',
    '/create',
    '/teams',
    '/workspace',
    '/workspace/proposals',
  ]) {
    await page.goto(`/#${path}`);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.loading-state')).toHaveCount(0);
    const sizes = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(sizes.scroll, `Overflow on ${path}`).toBeLessThanOrEqual(sizes.width);
  }
  await page.goto('/#/projects/1');
  await page.screenshot({ path: 'artifacts/detail-mobile.png', fullPage: true });
});

test('network failure is visible and switching to demo is explicit', async ({ page }) => {
  await page.route('**/api/v1/**', (route) => route.abort());
  await page.goto('/#/projects');
  await expect(page.getByRole('alert')).toContainText('Не получилось загрузить пространство');
  await expect(page.locator('.task-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Открыть демо', exact: true }).click();
  await expect(page.locator('.demo-banner')).toContainText('Демопространство');
  await expect(page.locator('.task-card')).toHaveCount(5);
  await page.reload();
  await expect(page.locator('.demo-banner')).toBeVisible();
  await expect(page.locator('.task-card')).toHaveCount(5);
});
