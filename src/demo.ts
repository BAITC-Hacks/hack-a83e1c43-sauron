import { calculateReadiness, emptyTask, taskPayload, hasValue } from './domain';
import type {
  Analysis,
  ProposalInput,
  Snapshot,
  TaskInput,
  Task,
  TeamInput,
  ProposalStatus,
} from './types';

const KEY = 'sauron:demo:v1';
const now = () => new Date().toISOString();
export const questions = [
  { field: 'users', question: 'Кто будет пользоваться будущим решением?' },
  { field: 'data', question: 'Какие данные и материалы вы можете передать команде?' },
  { field: 'expected_result', question: 'Что команда должна показать в конце работы?' },
  { field: 'success_criteria', question: 'Как вы поймёте, что задача решена успешно?' },
  { field: 'constraints', question: 'Какие сроки, технологии и ограничения нужно учесть?' },
];
function makeTask(id: number, fields: Partial<TaskInput>): Task {
  const values = { ...emptyTask, ...fields };
  const readiness = calculateReadiness(values);
  return {
    ...values,
    id,
    readiness,
    score: readiness.score,
    readiness_level: readiness.level,
    status: 'published',
    created_at: now(),
    updated_at: now(),
    published_at: now(),
  };
}
function seed(): Snapshot {
  const tasks = [
    makeTask(1, {
      title: 'Увидеть потенциал каждого студента',
      industry: 'education',
      draft_text: 'Помочь кураторам вовремя поддерживать студентов.',
      context:
        'Кураторы видят сложности студентов слишком поздно. Данные о посещаемости и оценках хранятся отдельно.',
      need: 'Выявлять группы риска и вовремя предлагать поддержку.',
      users: 'Студенты первого курса и кураторы.',
      data: 'Обезличенная посещаемость и результаты тестов за два семестра.',
      constraints: 'Только обезличенные данные. На прототип — четыре недели.',
      expected_result: 'Интерактивная панель для куратора с объяснением факторов риска.',
      success_criteria: 'Куратор находит группу риска за две минуты.',
      business_contact: 'Куратор образовательной программы',
      interaction_format: 'Онлайн-встреча раз в неделю',
    }),
    makeTask(2, {
      title: 'Меньше остатков. Больше свежего хлеба.',
      industry: 'retail',
      draft_text: 'Пекарне нужно лучше планировать выпечку.',
      context: 'Вечером остаётся непроданная продукция, а утром не хватает популярных позиций.',
      need: 'Оценивать спрос на следующий день.',
      users: 'Управляющий пекарни.',
      data: 'Продажи по дням и часам за последний год.',
      expected_result: 'Простая таблица с прогнозом спроса.',
    }),
    makeTask(3, {
      title: 'Городские маршруты с новым смыслом',
      industry: 'logistics',
      draft_text: 'Улучшить планирование маршрутов доставки.',
      context: 'Маршруты составляются по фиксированным правилам.',
      need: 'Уменьшить холостой пробег.',
      users: 'Логисты и водители.',
      data: 'История доставок и координаты остановок.',
      constraints: 'Прототип без интеграции с навигатором.',
      expected_result: 'Модель рекомендаций маршрута.',
      success_criteria: 'Сокращение пробега на 10%.',
    }),
    makeTask(4, {
      title: 'Экологический след — в одной картине',
      industry: 'sustainability',
      draft_text: 'Компании нужен понятный экологический отчёт.',
      context: 'Данные о ресурсах находятся в разных таблицах.',
      need: 'Собрать показатели в единый отчёт.',
      users: 'Специалист по устойчивому развитию.',
      data: 'Таблицы потребления воды и электроэнергии.',
      constraints: 'Без передачи данных во внешние сервисы.',
      expected_result: 'Редактируемый макет отчёта.',
      success_criteria: 'Подготовка отчёта занимает не более часа.',
      business_contact: 'ESG-менеджер',
      interaction_format: 'Две онлайн-встречи в неделю',
    }),
    makeTask(5, {
      title: 'Услышать клиента за каждым обращением',
      industry: 'services',
      draft_text: 'Быстрее разбирать обращения клиентов.',
      context: 'Операторы вручную сортируют обращения.',
      need: 'Находить повторяющиеся темы.',
      users: 'Операторы сервисного центра.',
    }),
  ];
  const teams = [
    {
      id: 1,
      name: 'EduMinds',
      interests: 'Образование, доступная среда',
      skills: 'Аналитика данных, UX',
      technologies: 'Python, Django',
      created_at: now(),
    },
    {
      id: 2,
      name: 'DataCraft',
      interests: 'Ритейл, прогнозирование',
      skills: 'Data science, визуализация',
      technologies: 'Python, pandas',
      created_at: now(),
    },
    {
      id: 3,
      name: 'CivicFlow',
      interests: 'Умный город',
      skills: 'Дизайн продукта, картография',
      technologies: 'React, GIS',
      created_at: now(),
    },
    {
      id: 4,
      name: 'GreenByte',
      interests: 'Устойчивое развитие',
      skills: 'Автоматизация, отчётность',
      technologies: 'Python, PostgreSQL',
      created_at: now(),
    },
  ];
  const proposals = [
    {
      id: 1,
      task_id: 1,
      team: 1,
      team_details: teams[0],
      idea: 'Создадим понятную панель, которая поможет кураторам замечать трудности раньше.',
      plan: 'Изучим данные, проведём интервью с кураторами, соберём прототип и проверим его на примерах.',
      timeline: '4 недели',
      prototype_url: '',
      status: 'pending' as const,
      created_at: now(),
      updated_at: now(),
    },
  ];
  return { tasks, teams, proposals };
}
function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.tasks) && Array.isArray(data.teams) && Array.isArray(data.proposals))
        return data;
    }
  } catch {
    /* Invalid or blocked storage starts a clean, clearly labelled demo. */
  }
  return seed();
}
function write(data: Snapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    throw new Error(
      'Браузер не разрешает сохранять данные. Разрешите локальное хранилище и повторите.',
    );
  }
}
const nextId = (rows: { id: number }[]) => Math.max(0, ...rows.map((row) => row.id)) + 1;
export const demo = {
  snapshot: async () => read(),
  analyze: async (draft_text: string, input?: TaskInput): Promise<Analysis> => ({
    provider: 'mock',
    draft_text,
    questions: [...questions].sort((a, b) => Number(hasValue(input?.[a.field as keyof TaskInput] || '')) - Number(hasValue(input?.[b.field as keyof TaskInput] || ''))),
    missing_fields: questions.filter((q) => !hasValue(input?.[q.field as keyof TaskInput] || '')).map((q) => q.field),
  }),
  saveTask: async (input: TaskInput, id?: number, confirmed = false) => {
    const data = read();
    const old = id ? data.tasks.find((task) => task.id === id) : undefined;
    if (id && !old) throw new Error('Задача не найдена.');
    if (old?.status === 'published' && !confirmed) throw new Error('Подтвердите изменения опубликованной карточки.');
    const task = {
      ...makeTask(id || nextId(data.tasks), taskPayload(input)),
      status: old?.status || ('draft' as const),
      created_at: old?.created_at || now(),
      published_at: old?.published_at || null,
    };
    data.tasks = old
      ? data.tasks.map((item) => (item.id === id ? task : item))
      : [...data.tasks, task];
    write(data);
    return task;
  },
  publish: async (id: number) => {
    const data = read();
    const task = data.tasks.find((item) => item.id === id);
    if (!task) throw new Error('Задача не найдена.');
    task.status = 'published';
    task.published_at = now();
    task.updated_at = now();
    write(data);
    return task;
  },
  saveTeam: async (input: TeamInput, id?: number) => {
    const data = read();
    const old = data.teams.find((team) => team.id === id);
    if (id && !old) throw new Error('Команда не найдена.');
    const team = { ...input, id: id || nextId(data.teams), created_at: old?.created_at || now() };
    data.teams = old
      ? data.teams.map((item) => (item.id === id ? team : item))
      : [...data.teams, team];
    data.proposals = data.proposals.map((p) =>
      p.team === team.id ? { ...p, team_details: team } : p,
    );
    write(data);
    return team;
  },
  sendProposal: async (taskId: number, input: ProposalInput) => {
    const data = read();
    const team = data.teams.find((team) => team.id === input.team);
    if (!team) throw new Error('Сначала выберите команду.');
    if (data.tasks.find((task) => task.id === taskId)?.status !== 'published')
      throw new Error('Задача больше не принимает отклики.');
    const proposal = {
      ...input,
      id: nextId(data.proposals),
      task_id: taskId,
      team_details: team,
      status: 'pending' as const,
      created_at: now(),
      updated_at: now(),
    };
    data.proposals.unshift(proposal);
    write(data);
    return proposal;
  },
  decide: async (id: number, decision: Exclude<ProposalStatus, 'pending'>) => {
    const data = read();
    const proposal = data.proposals.find((p) => p.id === id);
    if (!proposal) throw new Error('Отклик не найден.');
    proposal.status = decision;
    proposal.updated_at = now();
    write(data);
    return proposal;
  },
};
