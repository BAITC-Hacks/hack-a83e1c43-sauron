const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

mainNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const filterTabs = [...document.querySelectorAll('.filter-tab')];
const projectCards = [...document.querySelectorAll('.project-card')];
const searchInput = document.querySelector('#project-search');
const emptyState = document.querySelector('#empty-state');
let currentFilter = 'all';

function updateProjects() {
  const query = searchInput.value.trim().toLocaleLowerCase('ru');
  let visible = 0;
  projectCards.forEach((card) => {
    const matchesFilter = currentFilter === 'all' || card.dataset.category === currentFilter;
    const matchesQuery = !query || `${card.dataset.search} ${card.textContent}`.toLocaleLowerCase('ru').includes(query);
    card.hidden = !(matchesFilter && matchesQuery);
    if (!card.hidden) visible += 1;
  });
  emptyState.hidden = visible > 0;
}

filterTabs.forEach((tab) => tab.addEventListener('click', () => {
  currentFilter = tab.dataset.filter;
  filterTabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  updateProjects();
}));
searchInput?.addEventListener('input', updateProjects);

document.querySelectorAll('.save-button').forEach((button) => button.addEventListener('click', () => {
  const saved = button.classList.toggle('saved');
  button.textContent = saved ? '♥' : '♡';
  button.setAttribute('aria-pressed', String(saved));
}));

const modals = {
  login: document.querySelector('#login-modal'),
  brief: document.querySelector('#brief-modal'),
};
document.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', (event) => {
  const modal = modals[button.dataset.open];
  if (!modal) return;
  event.preventDefault();
  modal.showModal();
}));
document.querySelectorAll('.modal-close').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('.modal').forEach((modal) => {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.close();
  });
  modal.querySelector('form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const note = modal.querySelector('.form-note');
    note.textContent = 'Спасибо! В демо-версии данные не отправляются, но идея уже с нами.';
    modal.querySelector('button[type="submit"]').textContent = 'Готово ✓';
  });
});
