import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  ExternalLink,
  FileText,
  Inbox,
  LayoutDashboard,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import { api } from './api';
import { formatDate, industryInfo, safeExternalUrl } from './domain';
import { useApp } from './store';
import { Empty, ErrorState, Eyebrow, FormError, Modal, Spinner } from './components';
import { PublishDialog } from './Detail';
import type { Proposal, ProposalStatus, Task } from './types';

const proposalLabels: Record<ProposalStatus, string> = {
  pending: 'На рассмотрении',
  accepted: 'Принят',
  rejected: 'Отклонён',
};
function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { data, mode, updateData, toast } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [decision, setDecision] = useState<'accepted' | 'rejected' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const task = data.tasks.find((t) => t.id === proposal.task_id);
  const link = safeExternalUrl(proposal.prototype_url);
  async function decide() {
    if (!decision || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api(mode).decide(proposal.id, decision);
      updateData((data) => ({
        ...data,
        proposals: data.proposals.map((p) => (p.id === result.id ? result : p)),
      }));
      toast(
        decision === 'accepted'
          ? 'Отклик принят. Контакт бизнеса указан в карточке задачи.'
          : 'Решение по отклику сохранено',
      );
      setDecision(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить решение.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="proposal-card">
      <div className="proposal-card-heading">
        <div className="team-monogram small">
          {proposal.team_details.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3>{proposal.team_details.name}</h3>
          <a href={`#/projects/${proposal.task_id}`}>
            {task?.title || `Задача №${proposal.task_id}`}
            <ArrowUpRight size={13} />
          </a>
        </div>
        <span className={`status-pill ${proposal.status}`}>{proposalLabels[proposal.status]}</span>
      </div>
      <p className="proposal-idea">{proposal.idea}</p>
      <div className="proposal-meta">
        <span>{proposal.timeline}</span>
        <span>{formatDate(proposal.created_at)}</span>
        <button
          className="text-link"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? 'Свернуть' : 'План и команда'}
          <ChevronRight size={15} className={expanded ? 'rotate-down' : ''} />
        </button>
      </div>
      {expanded && (
        <div className="proposal-expanded">
          <div>
            <span className="micro">ПЛАН РАБОТЫ</span>
            <p>{proposal.plan}</p>
          </div>
          <div className="form-columns">
            <div>
              <span className="micro">НАВЫКИ</span>
              <p>{proposal.team_details.skills || 'Не указаны'}</p>
            </div>
            <div>
              <span className="micro">ТЕХНОЛОГИИ</span>
              <p>{proposal.team_details.technologies || 'Не указаны'}</p>
            </div>
          </div>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-link">
              Открыть прототип
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}
      <div className="proposal-decisions">
        <span className="caption">Решение представителя бизнеса</span>
        {proposal.status !== 'rejected' && (
          <button className="button secondary compact" onClick={() => setDecision('rejected')}>
            <X size={14} />
            Отклонить
          </button>
        )}
        {proposal.status !== 'accepted' && (
          <button className="button dark compact" onClick={() => setDecision('accepted')}>
            <Check size={14} />
            Принять
          </button>
        )}
        {proposal.status === 'accepted' && (
          <span className="accepted-label">
            <Check size={16} />
            Можно начинать диалог
          </span>
        )}
      </div>
      {decision && (
        <Modal
          title={decision === 'accepted' ? 'Начать работу вместе?' : 'Отклонить этот подход?'}
          onClose={() => {
            if (!busy) setDecision(null);
          }}
        >
          <p className="form-intro">
            {decision === 'accepted'
              ? `Отклик команды ${proposal.team_details.name} получит статус «Принят». Вы можете принять несколько команд на одну задачу.`
              : `Отклик команды ${proposal.team_details.name} получит статус «Отклонён». Решение можно изменить позже.`}
          </p>
          <FormError message={error} />
          <div className="form-actions">
            <button className="button secondary" disabled={busy} onClick={() => setDecision(null)}>
              Отмена
            </button>
            <button className="button dark" disabled={busy} onClick={() => void decide()}>
              {busy && <LoaderCircle className="spin" size={16} />}Подтвердить
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </article>
  );
}
export function Workspace({ tab = '', taskFilter = 0 }: { tab?: string; taskFilter?: number }) {
  const { data, loading, error, refresh, saved, mode } = useApp();
  const [status, setStatus] = useState('all');
  const [proposalStatus, setProposalStatus] = useState('all');
  const [teamFilter, setTeamFilter] = useState('');
  const [publishing, setPublishing] = useState<Task | null>(null);
  const tasks = data.tasks
    .filter((task) => status === 'all' || task.status === status)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const proposals = data.proposals.filter(
    (p) =>
      (!taskFilter || p.task_id === taskFilter) &&
      (proposalStatus === 'all' || p.status === proposalStatus) &&
      (!teamFilter || p.team === Number(teamFilter)),
  );
  const pending = data.proposals.filter((p) => p.status === 'pending').length;
  const proposalTab = tab === 'proposals';
  return (
    <div className="workspace page-width">
      <aside className="workspace-nav">
        <div className="workspace-mark">
          S<span>✳</span>
        </div>
        <div className="micro">ВАШЕ ПРОСТРАНСТВО</div>
        <h3>
          Здесь идеи
          <br />
          <em>становятся делом.</em>
        </h3>
        <nav aria-label="Рабочее пространство">
          <a className={!proposalTab ? 'active' : ''} href="#/workspace">
            <LayoutDashboard size={17} />
            Обзор задач<span>{data.tasks.length}</span>
          </a>
          <a className={proposalTab ? 'active' : ''} href="#/workspace/proposals">
            <Inbox size={17} />
            Отклики{pending > 0 && <span>{pending}</span>}
          </a>
          <a href="#/teams">
            <Users size={17} />
            Команды<span>{data.teams.length}</span>
          </a>
          <a href="#/saved">
            <Bookmark size={17} />
            Сохранённое<span>{saved.length}</span>
          </a>
        </nav>
        <div className="workspace-note">
          <span className="status-dot" />
          <b>{mode === 'demo' ? 'Демонстрационное пространство' : 'Общее пространство'}</b>
          <p>
            {mode === 'demo'
              ? 'Изменения остаются в этом браузере.'
              : 'Задачи, команды и отклики видны всем участникам.'}
          </p>
        </div>
      </aside>
      <div className="workspace-main">
        <div className="workspace-heading">
          <div>
            <Eyebrow>
              {proposalTab ? 'ДИАЛОГ НАЧИНАЕТСЯ С ИДЕИ' : 'ОТ НАМЕРЕНИЯ К РЕЗУЛЬТАТУ'}
            </Eyebrow>
            <h1>
              {proposalTab ? (
                <>
                  Новые <em>подходы.</em>
                </>
              ) : (
                <>
                  Всё <em>в движении.</em>
                </>
              )}
            </h1>
          </div>
          <div className="button-row">
            <button
              className="icon-button bordered"
              aria-label="Обновить данные"
              disabled={loading}
              onClick={() => void refresh()}
            >
              <RefreshCw size={17} className={loading ? 'spin' : ''} />
            </button>
            <a className="button dark" href="#/create">
              <Plus size={17} />
              Новая задача
            </a>
          </div>
        </div>
        <div className="stats-grid">
          <div>
            <span className="micro">ЗАДАЧ В КАТАЛОГЕ</span>
            <strong>
              {String(data.tasks.filter((t) => t.status === 'published').length).padStart(2, '0')}
            </strong>
            <ArrowUpRight size={20} />
          </div>
          <div>
            <span className="micro">ИДЕЙ НА РАССМОТРЕНИИ</span>
            <strong>{String(pending).padStart(2, '0')}</strong>
            <Inbox size={20} />
          </div>
          <div>
            <span className="micro">ПРИНЯТЫХ ОТКЛИКОВ</span>
            <strong>
              {String(data.proposals.filter((p) => p.status === 'accepted').length).padStart(
                2,
                '0',
              )}
            </strong>
            <Check size={20} />
          </div>
        </div>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState />
        ) : proposalTab ? (
          <>
            <div className="workspace-list-heading">
              <h2>{taskFilter ? `Отклики · задача №${taskFilter}` : 'Предложения команд'}</h2>
              {taskFilter > 0 && (
                <a href="#/workspace/proposals" className="text-link">
                  Все задачи
                  <X size={14} />
                </a>
              )}
            </div>
            <div className="proposal-filters">
              <div className="segmented">
                {[
                  ['all', 'Все'],
                  ['pending', 'Ожидают'],
                  ['accepted', 'Приняты'],
                  ['rejected', 'Отклонены'],
                ].map(([key, label]) => (
                  <button
                    className={proposalStatus === key ? 'active' : ''}
                    key={key}
                    onClick={() => setProposalStatus(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                aria-label="Отклики команды"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <option value="">Все команды</option>
                {data.teams.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {proposals.length ? (
              <div className="proposal-list">
                {proposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            ) : (
              <Empty
                title="Диалог ещё впереди"
                text="Здесь появятся идеи команд. Найдите интересную задачу и предложите первый подход."
              >
                <a href="#/projects" className="button dark">
                  Исследовать задачи
                  <ArrowUpRight size={17} />
                </a>
              </Empty>
            )}
          </>
        ) : (
          <>
            <div className="workspace-list-heading">
              <h2>Задачи пространства</h2>
              <div className="segmented">
                {[
                  ['all', 'Все'],
                  ['published', 'В каталоге'],
                  ['draft', 'Черновики'],
                  ['closed', 'Закрыты'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={status === key ? 'active' : ''}
                    onClick={() => setStatus(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {tasks.length ? (
              <div className="workspace-tasks">
                {tasks.map((task) => (
                  <article className="workspace-task" key={task.id}>
                    <div className={`task-mini-art ${industryInfo(task.industry).tone}`}>
                      <FileText size={23} strokeWidth={1} />
                    </div>
                    <div className="workspace-task-info">
                      <span className="micro">{industryInfo(task.industry).label}</span>
                      <h3>
                        <a href={`#/projects/${task.id}`}>{task.title || 'Задача без названия'}</a>
                      </h3>
                      <span>
                        {formatDate(task.updated_at)} ·{' '}
                        {data.proposals.filter((p) => p.task_id === task.id).length} откл.
                      </span>
                    </div>
                    <div className="workspace-task-score">
                      <strong>
                        {task.score}
                        <small>/100</small>
                      </strong>
                      <span className={`status-pill ${task.status}`}>
                        {task.status === 'published'
                          ? 'В каталоге'
                          : task.status === 'draft'
                            ? 'Черновик'
                            : 'Завершена'}
                      </span>
                    </div>
                    <div className="workspace-task-actions">
                      {task.status === 'draft' && (
                        <button
                          className="icon-button"
                          aria-label={`Опубликовать: ${task.title}`}
                          onClick={() => setPublishing(task)}
                        >
                          <ArrowUpRight size={19} />
                        </button>
                      )}
                      <a
                        className="icon-button"
                        href={`#/edit/${task.id}`}
                        aria-label={`Редактировать: ${task.title}`}
                      >
                        <Pencil size={17} />
                      </a>
                      <a
                        className="icon-button"
                        href={`#/projects/${task.id}`}
                        aria-label={`Открыть: ${task.title}`}
                      >
                        <ArrowRight size={18} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="Место для вашей следующей идеи"
                text="Начните с короткого описания. Навигатор поможет превратить его в понятную задачу."
              >
                <a className="button dark" href="#/create">
                  Создать задачу
                  <Plus size={17} />
                </a>
              </Empty>
            )}
            <div className="workspace-bottom-card">
              <div>
                <span className="micro">ЕСТЬ ТОЛЬКО СМУТНАЯ МЫСЛЬ?</span>
                <h3>
                  Этого уже <em>достаточно.</em>
                </h3>
                <p>Дайте навигатору помочь с первым шагом.</p>
              </div>
              <a href="#/create" className="circle-link" aria-label="Начать с навигатором">
                <ArrowUpRight size={28} />
              </a>
            </div>
          </>
        )}
      </div>
      {publishing && <PublishDialog task={publishing} onClose={() => setPublishing(null)} />}
    </div>
  );
}
