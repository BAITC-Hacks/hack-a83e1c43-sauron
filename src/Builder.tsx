import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck as CloudCheck,
  LoaderCircle,
  Save,
  Sparkles,
} from 'lucide-react';
import { api } from './api';
import { questions as fallbackQuestions } from './demo';
import { calculateReadiness, emptyTask, fieldLabels, industries, taskPayload } from './domain';
import { readLocal, saveLocal, useApp } from './store';
import {
  Breadcrumb,
  Empty,
  ErrorState,
  Eyebrow,
  FormError,
  ReadinessPanel,
  Spinner,
} from './components';
import { PublishDialog } from './Detail';
import type { Analysis, Task, TaskInput } from './types';

const stepNames = ['Идея', 'Уточнение', 'Контекст', 'Обзор'];
const hints: Partial<Record<keyof TaskInput, string>> = {
  users: 'Кто столкнулся с проблемой? Например, кураторы первых курсов.',
  data: 'Таблицы, исследования, примеры. Укажите, что реально доступно.',
  expected_result: 'Что должно получиться: прототип, модель, исследование?',
  success_criteria: 'Измеримый признак успеха: время, качество, результат.',
  constraints: 'Сроки, бюджет, доступы, технологии, работа с данными.',
  context: 'Как устроен процесс сейчас? Что привело к этой задаче?',
  need: 'Какую проблему важно решить и почему именно сейчас?',
  business_contact: 'Имя, роль и рабочий способ связи',
  interaction_format: 'Например, онлайн-встреча раз в неделю',
};
export function Builder({ id }: { id?: number }) {
  const { data, loading, error } = useApp();
  if (id && loading)
    return (
      <div className="page-width inner-page">
        <Spinner />
      </div>
    );
  if (id && error)
    return (
      <div className="page-width inner-page">
        <ErrorState />
      </div>
    );
  const task = id ? data.tasks.find((t) => t.id === id) : undefined;
  if (id && !task)
    return (
      <div className="page-width inner-page">
        <Empty
          title="Задача не найдена"
          text="Проверьте ссылку или выберите задачу в рабочем пространстве."
        >
          <a className="button dark" href="#/workspace">
            В пространство
            <ArrowRight size={17} />
          </a>
        </Empty>
      </div>
    );
  return <BuilderForm task={task} />;
}
function BuilderForm({ task }: { task?: Task }) {
  const { mode, updateData, toast } = useApp();
  const storageKey = `sauron:draft:${mode}:${task?.id || 'new'}`;
  const [cached] = useState(() =>
    readLocal<{ form: TaskInput; savedId?: number } | null>(storageKey, null),
  );
  const [form, setForm] = useState<TaskInput>(
    () =>
      Object.fromEntries(
        Object.keys(emptyTask).map((key) => [
          key,
          typeof cached?.form?.[key as keyof TaskInput] === 'string'
            ? cached.form[key as keyof TaskInput]
            : task?.[key as keyof TaskInput] || '',
        ]),
      ) as unknown as TaskInput,
  );
  const [savedId, setSavedId] = useState(task?.id || cached?.savedId);
  const [step, setStep] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [localSaved, setLocalSaved] = useState(true);
  const [publishing, setPublishing] = useState<Task | null>(null);
  const readiness = calculateReadiness(form);
  useEffect(() => {
    const timer = setTimeout(() => setLocalSaved(saveLocal(storageKey, { form, savedId })), 450);
    return () => clearTimeout(timer);
  }, [form, savedId, storageKey]);
  function clearDraft() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* Storage availability is already displayed in the form. */
    }
  }
  const setField = (key: keyof TaskInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  function changeStep(next: number) {
    setStep(next);
    setError('');
    document
      .querySelector('.builder-heading')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function next(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (step === 0) {
      if (form.draft_text.trim().length < 10 || !form.title.trim() || !form.industry.trim()) {
        setError('Добавьте название, отрасль и описание хотя бы из 10 символов.');
        return;
      }
      setBusy(true);
      setError('');
      try {
        const result = await api(mode).analyze(form.draft_text.trim());
        setAnalysis(result);
        changeStep(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось получить вопросы.');
      } finally {
        setBusy(false);
      }
    } else changeStep(Math.min(3, step + 1));
  }
  async function save(publish: boolean) {
    if (busy) return;
    if (!form.title.trim()) {
      setError('Дайте задаче название перед сохранением.');
      setStep(0);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api(mode).saveTask(taskPayload(form), savedId);
      updateData((data) => ({
        ...data,
        tasks: [...data.tasks.filter((t) => t.id !== result.id), result],
      }));
      setSavedId(result.id);
      if (publish && result.status !== 'published') {
        setPublishing(result);
        toast('Бриф сохранён. Осталось подтвердить публикацию.');
      } else {
        clearDraft();
        toast('Изменения сохранены');
        window.location.hash = `/projects/${result.id}`;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить бриф.');
    } finally {
      setBusy(false);
    }
  }
  function field(key: keyof TaskInput, label = fieldLabels[key], rows = 3) {
    const short = ['business_contact', 'interaction_format', 'title', 'industry'].includes(key);
    return (
      <label className="field" key={key}>
        <span>{label}</span>
        {short ? (
          <input
            maxLength={key === 'industry' ? 100 : 200}
            value={form[key]}
            placeholder={hints[key]}
            onChange={(e) => setField(key, e.target.value)}
          />
        ) : (
          <textarea
            rows={rows}
            maxLength={15000}
            value={form[key]}
            placeholder={hints[key]}
            onChange={(e) => setField(key, e.target.value)}
          />
        )}
      </label>
    );
  }
  const questionList = (analysis?.questions || fallbackQuestions).filter(
    (q, index, list) =>
      q.field in emptyTask && list.findIndex((other) => other.field === q.field) === index,
  );
  return (
    <div className="page-width inner-page builder-page">
      <Breadcrumb>
        <a href="#/workspace">Рабочее пространство</a>
        <span>/</span>
        {task ? 'Редактирование задачи' : 'Новая задача'}
      </Breadcrumb>
      <div className="builder-heading">
        <Eyebrow>SAURON / НАВИГАТОР ИДЕЙ</Eyebrow>
        <h1>
          Придадим вашей мысли
          <br />
          <em>ясную форму.</em>
        </h1>
        <p>Расскажите о задаче. Мы поможем задать правильные вопросы.</p>
      </div>
      <div className="builder-layout">
        <div>
          <div className="stepper" aria-label="Этапы создания задачи">
            {stepNames.map((name, index) => (
              <button
                key={name}
                className={`${step === index ? 'active' : ''} ${step > index ? 'complete' : ''}`}
                disabled={index > step || busy}
                onClick={() => changeStep(index)}
                aria-current={index === step ? 'step' : undefined}
              >
                <span>
                  {step > index ? <Check size={14} /> : String(index + 1).padStart(2, '0')}
                </span>
                {name}
              </button>
            ))}
          </div>
          <form className="builder-form" onSubmit={next}>
            <div className="builder-form-heading">
              <span className="micro">ШАГ {String(step + 1).padStart(2, '0')} / 04</span>
              <span className="autosave">
                <CloudCheck size={14} />
                {localSaved ? 'Черновик на устройстве' : 'Автосохранение недоступно'}
              </span>
            </div>
            {step === 0 && (
              <div className="form-stack">
                <h2>С чего всё начинается?</h2>
                <p className="form-intro">
                  Не нужно знать решение заранее. Начните с того, что сейчас не работает или может
                  стать лучше.
                </p>
                <label className="field">
                  <span>
                    Название задачи <b>*</b>
                  </span>
                  <input
                    autoFocus
                    required
                    maxLength={200}
                    placeholder="Например, помочь городу дышать свободнее"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>
                    Направление <b>*</b>
                  </span>
                  <select
                    required
                    value={form.industry}
                    onChange={(e) => setField('industry', e.target.value)}
                  >
                    <option value="">Выберите отрасль</option>
                    {Object.entries(industries).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                    {form.industry && !industries[form.industry] && (
                      <option value={form.industry}>{form.industry}</option>
                    )}
                  </select>
                </label>
                <label className="field">
                  <span>
                    Идея своими словами <b>*</b>
                    <small>{form.draft_text.length} / 10 000</small>
                  </span>
                  <textarea
                    required
                    minLength={10}
                    maxLength={10000}
                    rows={7}
                    placeholder="У нас есть… Мы замечаем, что… Хотелось бы…"
                    value={form.draft_text}
                    onChange={(e) => setField('draft_text', e.target.value)}
                  />
                </label>
                <div className="navigator-note">
                  <Sparkles size={21} />
                  <p>
                    Навигатор предложит уточняющие вопросы. Факты и решения в бриф добавляете вы.
                  </p>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="form-stack">
                <div className="question-heading">
                  <h2>Немного больше ясности.</h2>
                  <span className="provider-badge">
                    <Sparkles size={13} />
                    {analysis?.provider === 'openai' ? 'AI-навигатор' : 'Базовый навигатор'}
                  </span>
                </div>
                <p className="form-intro">
                  Отвечайте на то, что уже знаете. Остальное можно дополнить позже — незаполненное
                  поле не мешает публикации.
                </p>
                {questionList.map((q, index) => (
                  <div className="question-block" key={q.field}>
                    <span className="question-number">{String(index + 1).padStart(2, '0')}</span>
                    {field(q.field as keyof TaskInput, q.question)}
                  </div>
                ))}
              </div>
            )}
            {step === 2 && (
              <div className="form-stack">
                <h2>Соединим детали.</h2>
                <p className="form-intro">
                  Контекст и контакт с бизнесом помогают командам предложить реалистичное решение.
                </p>
                {field('context')}
                {field('need')}
                {field('business_contact')}
                {field('interaction_format')}
                <p className="caption">
                  Указывайте рабочие контакты, которые готовы разместить в общем каталоге.
                </p>
              </div>
            )}
            {step === 3 && (
              <div className="form-stack">
                <h2>Вот во что выросла идея.</h2>
                <p className="form-intro">
                  Проверьте карточку перед публикацией. Оценка справа показывает, где команде ещё
                  может не хватать контекста.
                </p>
                <div className="brief-preview">
                  <span className="micro">{industries[form.industry]?.label || form.industry}</span>
                  <h3>{form.title}</h3>
                  <p>{form.draft_text}</p>
                  {(
                    [
                      'context',
                      'need',
                      'users',
                      'data',
                      'expected_result',
                      'success_criteria',
                      'constraints',
                      'business_contact',
                      'interaction_format',
                    ] as (keyof TaskInput)[]
                  ).map((key) => (
                    <div key={key}>
                      <h4>{fieldLabels[key]}</h4>
                      <p className={!form[key] ? 'muted' : ''}>{form[key] || 'Пока не уточнено'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <FormError message={error} />
            <div className="builder-actions">
              {step > 0 ? (
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => changeStep(step - 1)}
                >
                  <ArrowLeft size={15} />
                  Назад
                </button>
              ) : (
                <a className="text-link" href="#/workspace">
                  В пространство
                </a>
              )}
              {step < 3 ? (
                <button className="button dark" type="submit" disabled={busy}>
                  {busy ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : step === 0 ? (
                    <Sparkles size={17} />
                  ) : null}
                  {busy
                    ? 'Находим нужные вопросы…'
                    : step === 0
                      ? 'Уточнить с навигатором'
                      : 'Продолжить'}
                  {!busy && <ArrowRight size={17} />}
                </button>
              ) : (
                <button
                  className="button dark"
                  type="button"
                  disabled={busy}
                  onClick={() => void save(task?.status !== 'published')}
                >
                  {busy ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={17} />}{' '}
                  {task?.status === 'published' ? 'Сохранить изменения' : 'К публикации'}
                </button>
              )}
            </div>
            {step === 0 && error && (
              <button
                className="text-link manual-next"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (form.title.trim() && form.draft_text.trim().length >= 10 && form.industry) {
                    setAnalysis(null);
                    changeStep(1);
                  } else setError('Сначала заполните название, отрасль и описание.');
                }}
              >
                Заполнить бриф самостоятельно
                <ArrowRight size={15} />
              </button>
            )}
          </form>
        </div>
        <aside className="builder-sidebar">
          <ReadinessPanel readiness={readiness} preview />
          <button
            className="button secondary full-width save-draft"
            disabled={busy}
            onClick={() => void save(false)}
          >
            <Save size={16} />
            {task?.status === 'published' ? 'Сохранить изменения' : 'Сохранить черновик'}
          </button>
          <p className="caption">
            {mode === 'demo'
              ? 'В деморежиме всё сохраняется только в этом браузере.'
              : 'Сохранённый черновик доступен в рабочем пространстве. В каталог он попадёт после подтверждения публикации.'}
          </p>
        </aside>
      </div>
      {publishing && (
        <PublishDialog
          task={publishing}
          onClose={() => setPublishing(null)}
          onPublished={() => {
            clearDraft();
            window.location.hash = `/projects/${publishing.id}`;
          }}
        />
      )}
    </div>
  );
}
