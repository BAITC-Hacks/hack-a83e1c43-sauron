import { Component, StrictMode, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  FlaskConical,
  Globe2,
  LayoutGrid,
  Menu,
  X,
} from 'lucide-react';
import { AppProvider, useApp } from './store';
import { Brand, CTA, Empty, Eyebrow, Modal } from './components';
import { Home, HowSection } from './Home';
import { Catalog } from './Catalog';
import { Detail } from './Detail';
import { Builder } from './Builder';
import { Teams } from './Teams';
import { Workspace } from './Workspace';
import './styles.css';

function useRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const change = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const [path, query] = hash.slice(1).split('?');
  return { path: path || '/', query: new URLSearchParams(query) };
}
function App() {
  const { path, query } = useRoute();
  const { mode, setMode, error, loading, data } = useApp();
  const [menu, setMenu] = useState(false);
  const [modeDialog, setModeDialog] = useState(false);
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    const titles: Record<string, string> = {
      '/': 'Большие идеи начинаются с задачи',
      '/projects': 'Возможности',
      '/teams': 'Команды',
      '/create': 'Новая задача',
      '/saved': 'Сохранённое',
      '/workspace': 'Рабочее пространство',
      '/workspace/proposals': 'Отклики',
      '/how': 'Как всё устроено',
    };
    document.title = `Sauron — ${titles[path] || 'Пространство идей'}`;
  }, [path]);
  const detail = path.match(/^\/projects\/(\d+)$/);
  const edit = path.match(/^\/edit\/(\d+)$/);
  let page: ReactNode;
  if (path === '/') page = <Home />;
  else if (path === '/projects') page = <Catalog />;
  else if (path === '/saved') page = <Catalog savedOnly />;
  else if (path === '/create') page = <Builder />;
  else if (detail) page = <Detail id={Number(detail[1])} />;
  else if (edit) page = <Builder id={Number(edit[1])} />;
  else if (path === '/teams') page = <Teams />;
  else if (path === '/workspace' || path === '/workspace/proposals')
    page = (
      <Workspace
        tab={path.endsWith('proposals') ? 'proposals' : ''}
        taskFilter={Number(query.get('task')) || 0}
      />
    );
  else if (path === '/how')
    page = (
      <>
        <div className="page-width how-intro">
          <Eyebrow>ОТКРЫТОЕ ПРОСТРАНСТВО SAURON</Eyebrow>
          <h1>
            Хорошая идея заслуживает
            <br />
            <em>реального продолжения.</em>
          </h1>
          <p>
            Бизнес описывает потребность, навигатор помогает составить бриф, а команды предлагают
            решение. Выбор партнёров всегда остаётся за людьми.
          </p>
        </div>
        <HowSection />
        <CTA />
      </>
    );
  else
    page = (
      <div className="page-width inner-page">
        <Empty
          title="Здесь пока нет орбиты"
          text="Такой страницы не существует. Вернёмся к возможностям?"
        >
          <a className="button dark" href="#/">
            На главную
            <ArrowRight size={17} />
          </a>
        </Empty>
      </div>
    );
  const nav = (
    <>
      <a href="#/projects" aria-current={path.startsWith('/projects') ? 'page' : undefined}>
        Возможности
      </a>
      <a href="#/how" aria-current={path === '/how' ? 'page' : undefined}>
        Как это работает
      </a>
      <a href="#/teams" aria-current={path === '/teams' ? 'page' : undefined}>
        Команды
      </a>
    </>
  );
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        К содержимому
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Главная навигация">
            {nav}
          </nav>
          <div className="header-actions">
            <button
              className={`mode-button ${mode}`}
              onClick={() => setModeDialog(true)}
              aria-label="Выбрать режим пространства"
            >
              <span className={`status-dot ${error ? 'offline' : ''}`} />
              {mode === 'demo' ? 'Демо' : error ? 'Нет связи' : 'Пространство'}
              <ChevronDown size={12} />
            </button>
            <a
              className="header-workspace icon-button"
              href="#/workspace"
              aria-label="Рабочее пространство"
            >
              <LayoutGrid size={19} />
            </a>
            <a className="button dark header-create" href="#/create">
              Предложить задачу
              <ArrowUpRight size={16} />
            </a>
            <button
              className="mobile-menu-button icon-button"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-label={menu ? 'Закрыть меню' : 'Открыть меню'}
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav" aria-label="Мобильная навигация">
            {nav}
            <a href="#/workspace">Рабочее пространство</a>
            <a href="#/saved">Сохранённое</a>
            <a href="#/create">
              Предложить задачу
              <ArrowUpRight size={18} />
            </a>
          </nav>
        )}
      </header>
      {mode === 'demo' && (
        <div className="demo-banner">
          <FlaskConical size={13} />
          <span>Демопространство · пример данных · изменения сохраняются в этом браузере</span>
          <button
            onClick={() => {
              setMode('live');
              window.location.hash = '/';
            }}
          >
            К общему пространству
            <ArrowRight size={13} />
          </button>
        </div>
      )}
      <main id="main-content" tabIndex={-1} key={`${mode}:${path}`} className="page-enter">
        {page}
      </main>
      <footer className="site-footer page-width">
        <div className="footer-top">
          <div>
            <Brand />
            <p>
              У хороших идей
              <br />
              <em>должно быть продолжение.</em>
            </p>
          </div>
          <div className="footer-navigation">
            <span className="micro">ИССЛЕДОВАТЬ</span>
            <a href="#/projects">
              Найти задачу
              <ArrowUpRight size={13} />
            </a>
            <a href="#/teams">
              Познакомиться с командами
              <ArrowUpRight size={13} />
            </a>
            <a href="#/how">
              Как это работает
              <ArrowUpRight size={13} />
            </a>
          </div>
          <div className="footer-navigation">
            <span className="micro">ДЕЙСТВОВАТЬ</span>
            <a href="#/create">
              Предложить задачу
              <ArrowUpRight size={13} />
            </a>
            <a href="#/workspace">
              Рабочее пространство
              <ArrowUpRight size={13} />
            </a>
            <button className="text-link" onClick={() => setModeDialog(true)}>
              Выбрать режим
              <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="footer-sign">
            <span>✳</span>
            <span className="micro">
              СОЗДАНО С ЛЮБОПЫТСТВОМ.
              <br />
              ДЛЯ РЕАЛЬНЫХ ИЗМЕНЕНИЙ.
            </span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SAURON</span>
          <span>ОТ ИДЕИ — К ОБЩЕМУ ДЕЛУ</span>
          <a href="#/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            НАВЕРХ ↑
          </a>
        </div>
      </footer>
      {modeDialog && (
        <Modal title="Выберите своё пространство." onClose={() => setModeDialog(false)}>
          <p className="form-intro">
            Общий каталог и демоверсия хранят данные отдельно. Переключение не переносит ваши задачи
            между ними.
          </p>
          <div className="mode-options">
            <button
              className={mode === 'live' ? 'selected' : ''}
              onClick={() => {
                setMode('live');
                setModeDialog(false);
                window.location.hash = '/';
              }}
            >
              <Globe2 size={25} />
              <div>
                <strong>Общее пространство</strong>
                <p>Задачи, команды и отклики вашего проекта. Изменения видны всем участникам.</p>
              </div>
              {mode === 'live' && <Check size={18} />}
            </button>
            <button
              className={mode === 'demo' ? 'selected' : ''}
              onClick={() => {
                setMode('demo');
                setModeDialog(false);
                window.location.hash = '/';
              }}
            >
              <FlaskConical size={25} />
              <div>
                <strong>Попробовать на примере</strong>
                <p>Демонстрационные задачи. Можно пройти весь путь в этом браузере.</p>
              </div>
              {mode === 'demo' && <Check size={18} />}
            </button>
          </div>
          <p className="caption">
            {mode === 'live'
              ? loading
                ? 'Устанавливаем связь…'
                : error
                  ? 'Общее пространство сейчас недоступно. Проверьте, запущен ли сервер проекта.'
                  : `Подключено. Задач: ${data.tasks.length} · команд: ${data.teams.length}`
              : 'Вы находитесь в локальном демопространстве.'}
          </p>
        </Modal>
      )}
    </>
  );
}
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Sauron render error', error, info.componentStack);
  }
  render() {
    return this.state.failed ? (
      <div className="page-width inner-page">
        <Empty
          title="Пространству нужна перезагрузка"
          text="Сохранённые на сервере задачи останутся на месте. Попробуйте открыть страницу заново."
        >
          <button
            className="button dark"
            onClick={() => {
              window.location.hash = '/';
              window.location.reload();
            }}
          >
            Перезагрузить
          </button>
        </Empty>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);
