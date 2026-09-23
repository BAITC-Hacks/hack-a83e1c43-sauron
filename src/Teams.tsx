import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUpRight, ArrowRight, Plus, Search, Users, Pencil } from 'lucide-react';
import { api } from './api';
import { useApp } from './store';
import {
  Breadcrumb,
  Empty,
  ErrorState,
  Eyebrow,
  FormError,
  Modal,
  Spinner,
  SubmitButton,
} from './components';
import type { Team, TeamInput } from './types';

export function TeamForm({
  team,
  onDone,
  onCancel,
}: {
  team?: Team;
  onDone: (team: Team) => void;
  onCancel?: () => void;
}) {
  const { mode, updateData, toast } = useApp();
  const [form, setForm] = useState<TeamInput>(
    team || { name: '', interests: '', skills: '', technologies: '' },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!form.name.trim()) {
      setError('Добавьте название команды.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api(mode).saveTeam(
        {
          name: form.name.trim(),
          interests: form.interests.trim(),
          skills: form.skills.trim(),
          technologies: form.technologies.trim(),
        },
        team?.id,
      );
      updateData((data) => ({
        ...data,
        teams: [...data.teams.filter((item) => item.id !== result.id), result],
        proposals: data.proposals.map((p) =>
          p.team === result.id ? { ...p, team_details: result } : p,
        ),
      }));
      toast(team ? 'Профиль команды обновлён' : 'Команда готова к новым возможностям');
      onDone(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить команду.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <p className="form-intro">
        Расскажите, что вам интересно и что вы умеете. Этот профиль увидит бизнес вместе с вашим
        откликом.
      </p>
      <label className="field">
        <span>
          Название команды <b>*</b>
        </span>
        <input
          autoFocus
          required
          maxLength={120}
          placeholder="Например, Northern Lights"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Что вас интересует</span>
        <textarea
          rows={2}
          maxLength={3000}
          placeholder="Образование, города, устойчивое развитие…"
          value={form.interests}
          onChange={(e) => setForm({ ...form, interests: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Навыки</span>
        <textarea
          rows={2}
          maxLength={3000}
          placeholder="Дизайн продукта, аналитика, разработка…"
          value={form.skills}
          onChange={(e) => setForm({ ...form, skills: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Технологии</span>
        <input
          maxLength={3000}
          placeholder="React, Python, Figma…"
          value={form.technologies}
          onChange={(e) => setForm({ ...form, technologies: e.target.value })}
        />
      </label>
      <FormError message={error} />
      <div className="form-actions">
        {onCancel && (
          <button className="button secondary" type="button" disabled={busy} onClick={onCancel}>
            Назад
          </button>
        )}
        <SubmitButton busy={busy}>{team ? 'Сохранить профиль' : 'Создать команду'}</SubmitButton>
      </div>
    </form>
  );
}
export function Teams() {
  const { data, loading, error } = useApp();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Team | 'new' | null>(null);
  const teams = data.teams
    .filter((team) =>
      `${team.name} ${team.interests} ${team.skills} ${team.technologies}`
        .toLocaleLowerCase('ru')
        .includes(search.toLocaleLowerCase('ru').trim()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="page-width inner-page">
      <Breadcrumb>Команды</Breadcrumb>
      <div className="section-heading inner-heading">
        <div>
          <Eyebrow>ЛЮДИ, КОТОРЫЕ ДВИГАЮТ ВПЕРЁД</Eyebrow>
          <h1>
            Разные таланты.
            <br />
            <em>Одна сила притяжения.</em>
          </h1>
          <p className="page-lead">
            Знакомьтесь с командами, которые превращают любопытство в решения.
          </p>
        </div>
        <button className="button dark" onClick={() => setEditing('new')}>
          <Plus size={18} />
          Создать команду
        </button>
      </div>
      <label className="search-field team-search">
        <Search size={19} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Найти команду"
          placeholder="Название, интерес или технология"
        />
      </label>
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState />
      ) : teams.length ? (
        <div className="teams-grid">
          {teams.map((team, index) => (
            <article className="team-card" key={team.id}>
              <div className="team-card-top">
                <div className={`team-monogram tone-${index % 4}`}>
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="micro">КОМАНДА / {String(team.id).padStart(2, '0')}</span>
              </div>
              <h3>{team.name}</h3>
              <p>{team.interests || 'Открыты к новым направлениям'}</p>
              <div className="team-skills">
                <span className="micro">СИЛЬНЫЕ СТОРОНЫ</span>
                <p>{team.skills || 'Команда пока не добавила навыки.'}</p>
              </div>
              <div className="tag-list">
                {team.technologies
                  .split(/[,;]/)
                  .filter(Boolean)
                  .slice(0, 6)
                  .map((tech, index) => (
                    <span key={index}>{tech.trim()}</span>
                  ))}
              </div>
              <div className="team-card-footer">
                <button className="text-link" onClick={() => setEditing(team)}>
                  Профиль команды
                  <Pencil size={14} />
                </button>
                <a
                  className="circle-link"
                  href="#/projects"
                  aria-label={`Найти задачу для ${team.name}`}
                >
                  <ArrowUpRight size={19} />
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Команды ещё впереди"
          text={
            search
              ? 'Попробуйте поискать по другому навыку или названию.'
              : 'Соберите единомышленников и начните с профиля.'
          }
        >
          <button
            className="button dark"
            onClick={() => (search ? setSearch('') : setEditing('new'))}
          >
            {search ? 'Сбросить поиск' : 'Создать команду'}
            <ArrowRight size={16} />
          </button>
        </Empty>
      )}
      <div className="info-banner">
        <Users size={21} />
        <p>
          Команда сама выбирает задачу и предлагает подход. Бизнес знакомится с откликами и
          принимает решение.
        </p>
      </div>
      {editing && (
        <Modal
          title={editing === 'new' ? 'Соберите своё созвездие.' : 'Профиль вашей команды.'}
          onClose={() => setEditing(null)}
        >
          <TeamForm
            team={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
