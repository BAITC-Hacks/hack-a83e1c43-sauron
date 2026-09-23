import {
  ArrowDown,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Check,
  MoveUpRight,
} from 'lucide-react';
import { useApp } from './store';
import { CTA, ErrorState, Eyebrow, Spinner, TaskCard } from './components';

function Orbit() {
  return (
    <div className="orbit-scene" aria-label="Орбитальная композиция: идеи притягивают людей">
      <div className="orbit-background" />
      <div className="orbit-axis x-axis" />
      <div className="orbit-axis y-axis" />
      <span className="orbit-coordinate top">FIG. 01 — ПОЛЕ ВОЗМОЖНОСТЕЙ</span>
      <span className="orbit-coordinate bottom">43°14′ N · 76°55′ E</span>
      <div className="orbit-sculpture">
        <div className="sphere-shadow" />
        <svg className="orbital-lines" viewBox="0 0 600 600" aria-hidden="true">
          <defs>
            <linearGradient id="orbitGradient" x1="0" x2="1" y1="0" y2="1">
              <stop stopColor="#b1d274" />
              <stop offset=".24" stopColor="#e5f7bd" />
              <stop offset=".53" stopColor="#224b3b" />
              <stop offset=".78" stopColor="#7b9b48" />
              <stop offset="1" stopColor="#c5eaa1" />
            </linearGradient>
            <radialGradient id="coreGradient" cx=".33" cy=".25">
              <stop stopColor="#e9fbc1" />
              <stop offset=".4" stopColor="#a8c878" />
              <stop offset=".78" stopColor="#446949" />
              <stop offset="1" stopColor="#173b30" />
            </radialGradient>
          </defs>
          <g transform="translate(300 300) rotate(-28)">
            {Array.from({ length: 30 }, (_, index) => (
              <ellipse
                key={index}
                rx={192 - Math.abs(index - 15) * 0.3}
                ry={40 + index * 4.8}
                transform={`rotate(${index * 6})`}
                fill="none"
                stroke="url(#orbitGradient)"
                strokeWidth={index % 3 === 0 ? 2 : 1.2}
                opacity={0.5 + index / 70}
              />
            ))}
            <ellipse rx="222" ry="71" fill="none" stroke="#2a513c" strokeWidth="1" opacity=".35" />
            <circle r="78" fill="url(#coreGradient)" />
            <ellipse
              rx="222"
              ry="71"
              fill="none"
              stroke="url(#orbitGradient)"
              strokeWidth="2"
              strokeDasharray="510 530"
            />
          </g>
        </svg>
        <div className="orbit-point point-one" />
        <div className="orbit-point point-two" />
      </div>
      <div className="floating-card orbit-ai">
        <span className="ai-symbol">
          <Sparkles size={21} />
        </span>
        <div>
          <span className="micro">SAURON AI</span>
          <strong>
            Находим суть.
            <br />
            Открываем возможности.
          </strong>
        </div>
        <span className="signal-bars">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="floating-card orbit-note">
        <span className="tiny-orbit" />
        <div>
          <span className="micro">ИЗ МЫСЛИ В ДЕЙСТВИЕ</span>
          <strong>Ваша идея обретает форму</strong>
        </div>
        <Check size={16} />
      </div>
      <span className="orbit-caption">
        Всё начинается
        <br />
        <em>с притяжения.</em>
        <ArrowDownRight size={27} strokeWidth={1} />
      </span>
      <span className="orbit-star star-one">✳</span>
      <span className="orbit-star star-two">+</span>
    </div>
  );
}
export function Home() {
  const { data, loading, error } = useApp();
  const tasks = data.tasks
    .filter((task) => task.status === 'published')
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return (
    <>
      <section className="hero page-width">
        <div className="hero-copy">
          <Eyebrow>ПРОСТРАНСТВО РЕАЛЬНЫХ ЗАДАЧ</Eyebrow>
          <h1>
            У больших идей
            <br />
            <em>своя гравитация.</em>
            <span className="headline-spark">✳</span>
          </h1>
          <p className="hero-lead">
            Бизнесу — свежий взгляд.
            <br />
            Талантливым командам — дело со смыслом.
            <br />
            <span>Sauron помогает им найти друг друга.</span>
          </p>
          <div className="hero-actions">
            <a href="#/projects" className="button dark">
              Найти свою задачу
              <ArrowUpRight size={20} />
            </a>
            <a href="#/create" className="text-link">
              Я представляю бизнес
              <ArrowRight size={17} />
            </a>
          </div>
          <div className="hero-proof">
            <div className="avatar-group">
              <span>А</span>
              <span>М</span>
              <span>Д</span>
              <span>↗</span>
            </div>
            <p>
              Разные таланты.
              <br />
              <strong>Общее направление.</strong>
            </p>
            <span className="proof-line" />
          </div>
        </div>
        <Orbit />
        <div className="hero-bottom">
          <a href="#/how">
            ХОРОШИЕ ИДЕИ НЕ ДОЛЖНЫ ЖДАТЬ
            <ArrowDown size={14} />
          </a>
          <span className="micro">СОЗДАНО ДЛЯ ТЕХ, КТО МЕНЯЕТ</span>
        </div>
      </section>
      <div className="discipline-strip">
        <div className="page-width">
          <span>БИЗНЕС СТАВИТ ВОПРОС</span>
          <span className="strip-star">✳</span>
          <span>AI ПОМОГАЕТ УВИДЕТЬ СУТЬ</span>
          <span className="strip-star">✳</span>
          <span>КОМАНДЫ НАХОДЯТ ОТВЕТ</span>
          <ArrowUpRight size={20} />
        </div>
      </div>
      <section className="section page-width opportunities">
        <div className="section-heading">
          <div>
            <Eyebrow>01 / ТОЧКИ ПРИТЯЖЕНИЯ</Eyebrow>
            <h2>
              Найдите то, что
              <br />
              <em>зажигает именно вас.</em>
            </h2>
          </div>
          <div className="section-heading-right">
            <p>
              За каждой задачей — реальный бизнес.
              <br />
              За каждым решением можете стоять вы.
            </p>
            <a className="text-link" href="#/projects">
              Все возможности
              <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState />
        ) : tasks.length ? (
          <div className="task-grid">
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} />
            ))}
          </div>
        ) : (
          <div className="empty-inline">
            Первые возможности ещё впереди. <a href="#/create">Предложите свою задачу →</a>
          </div>
        )}
        <div className="section-note">
          <span className="status-dot" />
          Открыты идеи из любой отрасли. Главное — реальная потребность.
        </div>
      </section>
      <section className="manifesto">
        <div className="page-width manifesto-inner">
          <div className="manifesto-side">
            <Eyebrow light>НАША ТОЧКА ЗРЕНИЯ</Eyebrow>
            <div className="manifesto-symbol" aria-hidden="true">
              s<span>✳</span>
            </div>
            <span className="micro">
              МЕНЬШЕ ДИСТАНЦИИ.
              <br />
              БОЛЬШЕ ВОЗМОЖНОСТЕЙ.
            </span>
          </div>
          <div className="manifesto-copy">
            <h2>
              Талантам нужен
              <br />
              не ещё один кейс.
              <br />
              <em>А настоящее дело.</em>
            </h2>
            <p>
              Мы верим, что лучшие решения появляются на пересечении опыта и любопытства. Поэтому
              соединяем бизнес, которому нужен новый взгляд, с командами, готовыми его предложить.
            </p>
            <a className="text-link light-link" href="#/teams">
              Познакомиться с командами
              <ArrowUpRight size={20} />
            </a>
          </div>
        </div>
      </section>
      <HowSection />
      <CTA />
    </>
  );
}
export function HowSection() {
  return (
    <section className="section page-width how-section">
      <div className="section-heading">
        <div>
          <Eyebrow>02 / ОТ НАМЕРЕНИЯ К ДЕЙСТВИЮ</Eyebrow>
          <h2>
            Немного ясности.
            <br />
            <em>Много возможностей.</em>
          </h2>
        </div>
        <p className="section-intro">
          Большие перемены не требуют
          <br />
          идеального первого шага.
        </p>
      </div>
      <div className="steps-grid">
        <article className="step-card">
          <div className="step-top">
            <span>01</span>
            <span className="micro">СФОРМУЛИРОВАТЬ</span>
            <ArrowUpRight size={18} />
          </div>
          <div className="step-visual question-visual">
            <div>
              А что, если
              <br />
              <em>попробовать иначе?</em>
              <span>✳</span>
            </div>
          </div>
          <h3>Начните с мысли</h3>
          <p>Опишите, что хочется изменить. Обычными словами, без сложных технических заданий.</p>
          <a className="text-link" href="#/create">
            Рассказать об идее
            <ArrowRight size={15} />
          </a>
        </article>
        <article className="step-card">
          <div className="step-top">
            <span>02</span>
            <span className="micro">ПРОЯСНИТЬ</span>
            <Sparkles size={18} />
          </div>
          <div className="step-visual focus-visual">
            <i />
            <i />
            <i />
            <span>✳</span>
            <b>СУТЬ НАЙДЕНА</b>
          </div>
          <h3>Найдите фокус с AI</h3>
          <p>
            Ответьте на уточняющие вопросы, добавьте контекст и получите понятную карточку задачи.
          </p>
          <a className="text-link" href="#/create">
            Открыть навигатор
            <ArrowRight size={15} />
          </a>
        </article>
        <article className="step-card">
          <div className="step-top">
            <span>03</span>
            <span className="micro">ОБЪЕДИНИТЬСЯ</span>
            <MoveUpRight size={18} />
          </div>
          <div className="step-visual people-visual">
            <i />
            <span>А</span>
            <span>М</span>
            <span>Д</span>
            <b>↗</b>
          </div>
          <h3>Действуйте вместе</h3>
          <p>
            Команды предлагают подход. Бизнес выбирает, с кем работать. Решение всегда за людьми.
          </p>
          <a className="text-link" href="#/projects">
            Найти точку старта
            <ArrowRight size={15} />
          </a>
        </article>
      </div>
    </section>
  );
}
