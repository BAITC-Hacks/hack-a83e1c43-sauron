import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  SearchX,
  X,
  Sparkles,
} from 'lucide-react';
import { industryInfo, levelLabels } from './domain';
import { useApp } from './store';
import type { Readiness, Task } from './types';

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <a className={`brand ${small ? 'small' : ''}`} href="#/" aria-label="Sauron — главная">
      <svg viewBox="0 0 48 40" aria-hidden="true">
        <path
          d="M3 20C14 0 34 0 45 20 34 40 14 40 3 20Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <ellipse cx="24" cy="20" rx="7" ry="14" fill="currentColor" />
        <path d="M24 5v30" stroke="var(--paper)" strokeWidth="2" />
      </svg>
      <span>
        sauron<span className="brand-dot">®</span>
      </span>
    </a>
  );
}
export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <div className={`eyebrow ${light ? 'light' : ''}`}>
      <span className="little-cross">✳</span>
      {children}
    </div>
  );
}
export function Spinner({ label = 'Загружаем пространство' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={25} />
      <span>{label}</span>
    </div>
  );
}
export function Empty({
  title = 'Здесь пока тихо',
  text,
  children,
}: {
  title?: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <SearchX size={30} strokeWidth={1} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function ErrorState() {
  const { error, refresh, setMode, mode } = useApp();
  if (!error) return null;
  return (
    <div className="error-state" role="alert">
      <div>
        <strong>Не получилось загрузить пространство</strong>
        <p>{error}</p>
      </div>
      <div className="button-row">
        <button className="button secondary" onClick={() => void refresh()}>
          <RefreshCw size={15} />
          Повторить
        </button>
        {mode === 'live' && (
          <button className="button dark" onClick={() => setMode('demo')}>
            Открыть демо
            <ArrowUpRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
export function FormError({ message }: { message: string }) {
  return message ? (
    <div className="form-error" role="alert">
      {message}
    </div>
  ) : null;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      className={`modal ${wide ? 'wide' : ''}`}
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-head">
        <Eyebrow>SAURON / WORKSPACE</Eyebrow>
        <button className="icon-button" onClick={onClose} aria-label="Закрыть окно">
          <X size={20} />
        </button>
      </div>
      <h2 id="modal-title">{title}</h2>
      {children}
    </dialog>
  );
}
export function TaskArt({ industry, large = false }: { industry: string; large?: boolean }) {
  const info = industryInfo(industry);
  return (
    <div className={`task-art ${info.tone} ${large ? 'large' : ''}`} aria-hidden="true">
      <div
        className={`object object-${industry in { education: 1, retail: 1, logistics: 1, sustainability: 1, services: 1 } ? industry : 'education'}`}
      >
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="art-coordinate">SAURON / {info.short}</span>
      <span className="art-cross">+</span>
      <div className="art-grid" />
    </div>
  );
}
export function TaskCard({ task, index = 0 }: { task: Task; index?: number }) {
  const { saved, toggleSave } = useApp();
  const info = industryInfo(task.industry);
  return (
    <article className="task-card" style={{ animationDelay: `${index * 65}ms` }}>
      <a href={`#/projects/${task.id}`} className="task-art-link" tabIndex={-1} aria-hidden="true">
        <TaskArt industry={task.industry} />
      </a>
      <button
        className={`save-button ${saved.includes(task.id) ? 'saved' : ''}`}
        onClick={() => toggleSave(task.id)}
        aria-label={saved.includes(task.id) ? 'Убрать из сохранённого' : 'Сохранить задачу'}
        aria-pressed={saved.includes(task.id)}
      >
        <Bookmark size={18} fill={saved.includes(task.id) ? 'currentColor' : 'none'} />
      </button>
      <div className="task-card-content">
        <div className="task-topline">
          <span className="micro">{info.short}</span>
          <span className={`readiness-pill ${task.readiness_level}`}>
            <i />
            {task.score}/100
          </span>
        </div>
        <h3>
          <a href={`#/projects/${task.id}`}>{task.title || 'Задача без названия'}</a>
        </h3>
        <p>{task.need || task.draft_text || 'Описание пока не добавлено.'}</p>
        <div className="task-card-bottom">
          <span>
            {task.status === 'draft'
              ? 'Черновик'
              : task.status === 'closed'
                ? 'Завершена'
                : 'Открыта для идей'}
          </span>
          <a
            href={`#/projects/${task.id}`}
            className="circle-link"
            aria-label={`Открыть: ${task.title}`}
          >
            <ArrowUpRight size={20} />
          </a>
        </div>
      </div>
    </article>
  );
}
export function ReadinessPanel({
  readiness,
  preview = false,
}: {
  readiness: Readiness;
  preview?: boolean;
}) {
  return (
    <div className="readiness-panel">
      <div className="panel-eyebrow">
        <span className="micro">{preview ? 'ПРЕДВАРИТЕЛЬНАЯ ОЦЕНКА' : 'ГОТОВНОСТЬ ЗАДАЧИ'}</span>
        <Sparkles size={17} />
      </div>
      <div className="score-display">
        <span>{readiness.score}</span>
        <span>/ 100</span>
        <svg viewBox="0 0 90 90" aria-hidden="true">
          <circle
            cx="45"
            cy="45"
            r="38"
            fill="none"
            stroke="currentColor"
            opacity=".1"
            strokeWidth="3"
          />
          <circle
            cx="45"
            cy="45"
            r="38"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${readiness.score * 2.388} 238.8`}
            transform="rotate(-90 45 45)"
          />
          <path d="m35 45 7 7 15-16" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <div className="score-label">
        {levelLabels[readiness.level]}
        <span>Ясность помогает действовать.</span>
      </div>
      <div className="score-breakdown">
        {readiness.breakdown.map((item) => (
          <div className="score-item" key={item.key}>
            <div>
              <span>{item.label}</span>
              <b>
                {item.points}
                <em>/{item.max_points}</em>
              </b>
            </div>
            <div className="score-track">
              <span style={{ width: `${(item.points / item.max_points) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="caption">
        Оценка показывает полноту брифа. Даже с низким баллом можно опубликовать задачу и получить
        отклик.
      </p>
    </div>
  );
}
export function Breadcrumb({ children }: { children: ReactNode }) {
  return (
    <div className="breadcrumb">
      <a href="#/">Главная</a>
      <ChevronRight size={12} />
      {children}
    </div>
  );
}
export function CTA() {
  return (
    <section className="closing-cta">
      <div className="cta-contour" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} style={{ transform: `translate(-50%,-50%) rotate(${i * 13}deg)` }} />
        ))}
      </div>
      <Eyebrow light>СЛЕДУЮЩЕЕ БОЛЬШОЕ НАЧИНАЕТСЯ ЗДЕСЬ</Eyebrow>
      <h2>
        У вас есть вызов.
        <br />
        <em>У кого-то — ваш ответ.</em>
      </h2>
      <a className="button lime" href="#/create">
        Дать идее начало
        <ArrowUpRight size={20} />
      </a>
      <span className="cta-foot micro">ОТ ОДНОЙ МЫСЛИ — К ОБЩЕМУ ДЕЛУ</span>
    </section>
  );
}
export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button className="button dark" type="submit" disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={17} /> : null}
      {busy ? 'Сохраняем…' : children}
      {!busy && <ArrowRight size={17} />}
    </button>
  );
}
export function ConfirmCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="confirm-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
      />
      <span className="check-square">{checked && <Check size={13} />}</span>
      <span>{children}</span>
    </label>
  );
}
