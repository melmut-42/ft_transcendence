const tabs = [...document.querySelectorAll('.view-tab')];
const views = [...document.querySelectorAll('.view')];

function setView(id) {
  tabs.forEach((tab) => {
    const active = tab.dataset.view === id;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  views.forEach((view) => view.classList.toggle('is-active', view.id === id));
  history.replaceState(null, '', `#${id}`);
}

tabs.forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));

const initialView = location.hash.slice(1);
if (views.some((view) => view.id === initialView)) setView(initialView);

document.querySelectorAll('[data-card]').forEach((card) => {
  card.addEventListener('click', () => card.classList.toggle('is-selected'));
});

const toast = document.querySelector('.toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

document.querySelector('[data-copy]')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('ABCD-1234');
    showToast('Room code copied');
  } catch {
    showToast('Room code: ABCD-1234');
  }
});

document.querySelectorAll('.option').forEach((option) => {
  option.addEventListener('click', () => {
    option.closest('.option-row').querySelectorAll('.option').forEach((item) => item.classList.remove('is-selected'));
    option.classList.add('is-selected');
  });
});
