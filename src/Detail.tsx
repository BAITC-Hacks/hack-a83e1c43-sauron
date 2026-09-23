import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  Download,
  Link,
  LoaderCircle,
  Pencil,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';
import { api } from './api';
import { fieldLabels, formatDate, industryInfo, safeExternalUrl } from './domain';
import { readLocal, saveLocal, useApp } from './store';
import {
  Breadcrumb,
  ConfirmCheck,
  Empty,
  ErrorState,
  Eyebrow,
  FormError,
  Modal,
  ReadinessPanel,
  Spinner,
  SubmitButton,
  TaskArt,
  TaskCard,
} from './components';
import { TeamForm } from './Teams';
import type { ProposalInput, Task, TaskInput } from './types';

function ProposalForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const { data, mode, updateData, toast } = useApp();
  const [form, setForm] = useState<ProposalInput>(() => ({
    team: readLocal<number>(`sauron:team:${mode}`, 0),
    idea: '',
    plan: '',
    timeline: '',
    prototype_url: '',
  }));
  const [newTeam, setNewTeam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const selected = data.teams.some((team) => team.id === form.team) ? form.team : 0;
  const duplicate = data.proposals.some(
    (proposal) =>
      proposal.task_id === task.id && proposal.team === selected && proposal.status !== 'rejected',
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!selected || !form.idea.trim() || !form.plan.trim() || !form.timeline.trim()) {
      setError('Выберите команду и заполните идею, план и сроки.');
      return;
    }
    if (form.prototype_url.trim() && !safeExternalUrl(form.prototype_url.trim())) {
      setError('Добавьте ссылку, начинающуюся с https:// или http://.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const proposal = await api(mode).sendProposal(task.id, {
        ...form,
        team: selected,
        idea: form.idea.trim(),
        plan: form.plan.trim(),
        timeline: form.timeline.trim(),
        prototype_url: form.prototype_url.trim(),
      });
      updateData((data) => ({ ...data, proposals: [proposal, ...data.proposals] }));
      saveLocal(`sauron:team:${mode}`, selected);
      setSent(true);
      toast('Отклик отправлен на рассмотрение');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить отклик.');
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div className="success-state">
        <span className="success-icon">
          <Check size={30} />
        </span>
        <h3>Первый шаг сделан.</h3>
        <p>Ваш подход уже в рабочем пространстве. Бизнес рассмотрит его и примет решение.</p>
        <a className="button dark" href="#/workspace/proposals" onClick={onClose}>
          Перейти к откликам
          <ArrowRight size={17} />
        </a>
      </div>
    );
  if (newTeam)
    return (
      <TeamForm
        onCancel={() => setNewTeam(false)}
        onDone={(team) => {
          setForm({ ...form, team: team.id });
          setNewTeam(false);
        }}
      />
    );
  return (
    <form className="form-stack" onSubmit={submit}>
      <p className="form-intro">
        Ваш подход к задаче «{task.title}». Покажите, как вы мыслите и с чего готовы начать.
      </p>
      <label className="field">
        <span>
          Ваша команда <b>*</b>
        </span>
        <select
          required
          value={selected || ''}
          onChange={(e) => setForm({ ...form, team: Number(e.target.value) })}
        >
          <option value="">Выберите команду</option>
          {data.teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <button className="text-link align-start" type="button" onClick={() => setNewTeam(true)}>
        <Plus size={15} />
        Создать новую команду
      </button>
      {duplicate && (
        <p className="inline-note">
          У этой команды уже есть отклик на задачу. Его статус доступен в рабочем пространстве.
        </p>
      )}
      <label className="field">
        <span>
          Идея решения <b>*</b>
        </span>
        <textarea
          autoFocus
          required
          maxLength={10000}
          rows={3}
          placeholder="Как вы предлагаете подойти к задаче?"
          value={form.idea}
          onChange={(e) => setForm({ ...form, idea: e.target.value })}
        />
      </label>
      <label className="field">
        <span>
          Первые шаги <b>*</b>
        </span>
        <textarea
          required
          maxLength={10000}
          rows={3}
          placeholder="Исследование → прототип → проверка гипотезы…"
          value={form.plan}
          onChange={(e) => setForm({ ...form, plan: e.target.value })}
        />
      </label>
      <div className="form-columns">
        <label className="field">
          <span>
            Сроки <b>*</b>
          </span>
          <input
            required
            maxLength={200}
            placeholder="Например, 3–4 недели"
            value={form.timeline}
            onChange={(e) => setForm({ ...form, timeline: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Ссылка на прототип</span>
          <input
            type="url"
            maxLength={200}
            placeholder="https://…"
            value={form.prototype_url}
            onChange={(e) => setForm({ ...form, prototype_url: e.target.value })}
          />
        </label>
      </div>
      <FormError message={error} />
      <SubmitButton busy={busy}>Отправить отклик</SubmitButton>
      <p className="caption">
        Отправка отклика не означает автоматического назначения. Решение принимает бизнес.
      </p>
    </form>
  );
}
export function PublishDialog({
  task,
  onClose,
  onPublished,
}: {
  task: Task;
  onClose: () => void;
  onPublished?: () => void;
}) {
  const { mode, updateData, toast } = useApp();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function publish() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api(mode).publish(task.id);
      updateData((data) => ({
        ...data,
        tasks: data.tasks.map((item) => (item.id === result.id ? result : item)),
      }));
      toast('Задача опубликована и открыта для откликов');
      onPublished?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось опубликовать задачу.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Дайте задаче встретить команду."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="form-intro">
        «{task.title}» появится в общем каталоге. Команды смогут прочитать бриф и предложить свой
        подход.
      </p>
      <div className="publish-score">
        <Sparkles size={24} />
        <div>
          <b>Готовность: {task.score} из 100</b>
          <p>
            {task.score < 70
              ? 'Можно публиковать сейчас и дополнять карточку позже.'
              : 'У команды уже достаточно контекста для первого шага.'}
          </p>
        </div>
      </div>
      <ConfirmCheck checked={confirmed} onChange={setConfirmed}>
        Я проверил описание и подтверждаю публикацию задачи в открытом каталоге.
      </ConfirmCheck>
      <FormError message={error} />
      <button
        className="button dark full-width"
        disabled={!confirmed || busy}
        onClick={() => void publish()}
      >
        {busy ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}Опубликовать задачу
      </button>
    </Modal>
  );
}
export function Detail({ id }: { id: number }) {
  const { data, loading, error, saved, toggleSave, toast } = useApp();
  const [modal, setModal] = useState<'proposal' | 'publish' | null>(null);
  const task = data.tasks.find((task) => task.id === id);
  if (loading)
    return (
      <div className="page-width inner-page">
        <Spinner />
      </div>
    );
  if (error)
    return (
      <div className="page-width inner-page">
        <ErrorState />
      </div>
    );
  if (!task)
    return (
      <div className="page-width inner-page">
        <Empty
          title="Задача не найдена"
          text="Возможно, ссылка устарела или задача находится в другом режиме пространства."
        >
          <a className="button dark" href="#/projects">
            К каталогу
            <ArrowLeft size={17} />
          </a>
        </Empty>
      </div>
    );
  const info = industryInfo(task.industry);
  const proposals = data.proposals.filter((p) => p.task_id === id);
  const sections: (keyof TaskInput)[] = [
    'context',
    'need',
    'users',
    'data',
    'expected_result',
    'success_criteria',
    'constraints',
    'business_contact',
    'interaction_format',
  ];
  function download() {
    const content = `# ${task!.title}\n\nОтрасль: ${info.label}\nГотовность: ${task!.score}/100\n\n${sections.map((key) => `## ${fieldLabels[key]}\n\n${task![key] || 'Пока не указано.'}`).join('\n\n')}`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sauron-brief-${id}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="page-width inner-page">
      <Breadcrumb>
        <a href="#/projects">Возможности</a>
        <ChevronRight size={12} />
        <span>Задача / {String(id).padStart(3, '0')}</span>
      </Breadcrumb>
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-topline">
            <span className={`industry-badge ${info.tone}`}>{info.label}</span>
            <span className="micro">
              {task.status === 'published'
                ? 'ОТКРЫТА ДЛЯ ИДЕЙ'
                : task.status === 'closed'
                  ? 'ЗАВЕРШЕНА'
                  : 'ЧЕРНОВИК'}
            </span>
          </div>
          <h1>{task.title || 'Задача без названия'}</h1>
          <p className="detail-lead">{task.draft_text}</p>
          <div className="detail-tools">
            <span>Добавлена {formatDate(task.created_at)}</span>
            <div>
              <button
                className={`icon-button ${saved.includes(id) ? 'is-saved' : ''}`}
                onClick={() => toggleSave(id)}
                aria-pressed={saved.includes(id)}
                aria-label="Сохранить задачу"
              >
                <Bookmark size={18} fill={saved.includes(id) ? 'currentColor' : 'none'} />
              </button>
              <button
                className="icon-button"
                aria-label="Скопировать ссылку"
                onClick={() =>
                  navigator.clipboard
                    .writeText(window.location.href)
                    .then(() => toast('Ссылка скопирована'))
                    .catch(() => toast('Скопируйте ссылку из адресной строки браузера.'))
                }
              >
                <Link size={18} />
              </button>
              <button className="icon-button" onClick={download} aria-label="Скачать бриф">
                <Download size={18} />
              </button>
            </div>
          </div>
          <TaskArt industry={task.industry} large />
          <div className="brief-sections">
            {sections.map((key, index) => (
              <section className={`brief-section ${!task[key] ? 'incomplete' : ''}`} key={key}>
                <span className="micro">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{fieldLabels[key]}</h3>
                  <p>{task[key] || 'Пока не уточнено. Это можно обсудить с бизнесом.'}</p>
                </div>
              </section>
            ))}
          </div>
          <div className="detail-bottom-actions">
            <button className="button secondary" onClick={download}>
              <Download size={16} />
              Скачать бриф
            </button>
            <a className="text-link" href={`#/edit/${id}`}>
              <Pencil size={15} />
              Дополнить задачу
            </a>
          </div>
        </div>
        <aside className="detail-sidebar">
          <ReadinessPanel readiness={task.readiness} />
          <div className="detail-apply">
            <Eyebrow>ВАШ ВЗГЛЯД МОЖЕТ ВСЁ ИЗМЕНИТЬ</Eyebrow>
            <h3>
              {task.status === 'published' ? 'Есть идея решения?' : 'Следующий шаг — за вами.'}
            </h3>
            <p>
              {task.status === 'published'
                ? 'Расскажите, как ваша команда подойдёт к этой задаче.'
                : 'Дополните карточку и откройте её для команд.'}
            </p>
            {task.status === 'published' ? (
              <button className="button lime full-width" onClick={() => setModal('proposal')}>
                Предложить подход
                <ArrowUpRight size={19} />
              </button>
            ) : task.status === 'draft' ? (
              <button className="button lime full-width" onClick={() => setModal('publish')}>
                Опубликовать
                <ArrowUpRight size={19} />
              </button>
            ) : (
              <span className="caption">Приём откликов завершён</span>
            )}
            <a className="detail-proposal-link" href={`#/workspace/proposals?task=${id}`}>
              Отклики на задачу
              <span>
                {proposals.length}
                <ArrowRight size={14} />
              </span>
            </a>
          </div>
        </aside>
      </div>
      {data.tasks.some((t) => t.id !== id && t.status === 'published') && (
        <section className="related-section">
          <div className="section-heading">
            <h2>
              Ещё немного <em>возможностей.</em>
            </h2>
            <a className="text-link" href="#/projects">
              Все задачи
              <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="task-grid">
            {data.tasks
              .filter((t) => t.id !== id && t.status === 'published')
              .slice(0, 3)
              .map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
          </div>
        </section>
      )}
      {modal === 'proposal' && (
        <Modal title="У хорошей идеи есть автор." wide onClose={() => setModal(null)}>
          <ProposalForm task={task} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'publish' && <PublishDialog task={task} onClose={() => setModal(null)} />}
    </div>
  );
}
