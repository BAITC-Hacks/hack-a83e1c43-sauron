import { useMemo, useState } from 'react';
import { ArrowUpRight, Bookmark, Search, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from './store';
import { industries, industryInfo, levelLabels } from './domain';
import { Breadcrumb, Empty, ErrorState, Eyebrow, Spinner, TaskCard } from './components';

export function Catalog({ savedOnly = false }: { savedOnly?: boolean }) {
  const { data, saved, loading, error } = useApp();
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [level, setLevel] = useState('');
  const [sort, setSort] = useState('score');
  const [showFilters, setShowFilters] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const available = useMemo(
    () => [
      ...new Set(
        data.tasks
          .filter((t) => t.status === 'published')
          .map((t) => t.industry)
          .filter(Boolean),
      ),
    ],
    [data.tasks],
  );
  const tasks = useMemo(
    () =>
      data.tasks
        .filter(
          (task) =>
            task.status === 'published' &&
            (!savedOnly || saved.includes(task.id)) &&
            (!industry || task.industry === industry) &&
            (!level || task.readiness_level === level) &&
            task.score >= minScore &&
            `${task.title} ${task.context} ${task.need} ${industryInfo(task.industry).label}`
              .toLocaleLowerCase('ru')
              .includes(search.trim().toLocaleLowerCase('ru')),
        )
        .sort((a, b) =>
          sort === 'newest'
            ? b.created_at.localeCompare(a.created_at)
            : sort === 'title'
              ? a.title.localeCompare(b.title, 'ru')
              : b.score - a.score,
        ),
    [data.tasks, industry, level, minScore, search, sort, savedOnly, saved],
  );
  const clear = () => {
    setSearch('');
    setIndustry('');
    setLevel('');
    setMinScore(0);
  };
  return (
    <div className="page-width inner-page">
      <Breadcrumb>{savedOnly ? 'Сохранённое' : 'Возможности'}</Breadcrumb>
      <div className="catalog-heading">
        <div>
          <Eyebrow>
            {savedOnly ? 'ВАША КОЛЛЕКЦИЯ ВОЗМОЖНОСТЕЙ' : 'НАЙДИТЕ СВОЮ ТОЧКУ ПРИЛОЖЕНИЯ СИЛ'}
          </Eyebrow>
          <h1>
            {savedOnly ? (
              <>
                Идеи, которые
                <br />
                <em>остались с вами.</em>
              </>
            ) : (
              <>
                Задачи настоящие.
                <br />
                <em>Возможности — ваши.</em>
              </>
            )}
          </h1>
          <p>
            {savedOnly
              ? 'Сохранённые задачи всегда под рукой в этом браузере.'
              : 'Выбирайте по интересу. Исследуйте по любопытству. Создавайте со смыслом.'}
          </p>
        </div>
        <div className="catalog-stamp" aria-hidden="true">
          <span>OPEN FOR</span>
          <b>✳</b>
          <span>YOUR IDEAS</span>
        </div>
      </div>
      <div className="catalog-controls">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="Поиск задач"
            placeholder="Какую задачу вы хотите решить?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="icon-button"
              onClick={() => setSearch('')}
              aria-label="Очистить поиск"
            >
              <X size={16} />
            </button>
          )}
        </label>
        <button
          className={`button secondary ${showFilters ? 'selected' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={16} />
          Фильтры
          {(level || minScore > 0) && (
            <span className="filter-count">{Number(!!level) + Number(minScore > 0)}</span>
          )}
        </button>
        <a className="button dark" href={savedOnly ? '#/projects' : '#/saved'}>
          {savedOnly ? (
            'Все задачи'
          ) : (
            <>
              <Bookmark size={16} />
              Сохранённое<span className="button-count">{saved.length}</span>
            </>
          )}
        </a>
      </div>
      <div className="industry-tabs" aria-label="Отрасли">
        <button className={!industry ? 'active' : ''} onClick={() => setIndustry('')}>
          Все направления<span>{data.tasks.filter((t) => t.status === 'published').length}</span>
        </button>
        {Object.keys(industries)
          .filter((key) => available.includes(key))
          .concat(available.filter((key) => !industries[key]))
          .map((key) => (
            <button
              key={key}
              className={industry === key ? 'active' : ''}
              onClick={() => setIndustry(key)}
            >
              {industryInfo(key).label}
            </button>
          ))}
      </div>
      {showFilters && (
        <div className="filter-panel">
          <label className="field">
            <span>Готовность задачи</span>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">Любая готовность</option>
              {Object.entries(levelLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Минимальный балл: {minScore}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            />
          </label>
          <button className="text-link" onClick={clear}>
            Сбросить фильтры
            <X size={15} />
          </button>
        </div>
      )}
      <div className="results-heading">
        <span className="micro">
          {loading ? 'ЗАГРУЖАЕМ ЗАДАЧИ' : `НАЙДЕНО: ${String(tasks.length).padStart(2, '0')}`}
        </span>
        <label className="sort-select">
          Сначала
          <select
            aria-label="Сортировка задач"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="score">самые готовые</option>
            <option value="newest">новые</option>
            <option value="title">по алфавиту</option>
          </select>
        </label>
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState />
      ) : tasks.length ? (
        <div className="task-grid catalog-grid">
          {tasks.map((task, index) => (
            <TaskCard key={task.id} task={task} index={index % 3} />
          ))}
        </div>
      ) : (
        <Empty
          title={
            savedOnly && !saved.length
              ? 'Сохраните свою первую возможность'
              : 'Пока не нашли совпадений'
          }
          text={
            savedOnly && !saved.length
              ? 'Нажмите на закладку у задачи, которая вас заинтересовала.'
              : 'Попробуйте другую отрасль или более короткий запрос.'
          }
        >
          {search || industry || level || minScore ? (
            <button className="button dark" onClick={clear}>
              Сбросить фильтры
            </button>
          ) : (
            <a className="button dark" href={savedOnly ? '#/projects' : '#/create'}>
              {savedOnly ? 'Исследовать задачи' : 'Предложить задачу'}
              <ArrowUpRight size={17} />
            </a>
          )}
        </Empty>
      )}
      <div className="catalog-bottom">
        <span>Не нашли свой вызов?</span>
        <a href="#/create" className="text-link">
          Начните с собственной идеи
          <ArrowUpRight size={18} />
        </a>
      </div>
    </div>
  );
}
