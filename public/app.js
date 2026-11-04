const el = id => document.getElementById(id);
const date = el('date'), checkin = el('checkin'), status = el('status');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata',
  year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
date.value = today < date.min ? date.min : today > date.max ? date.max : today;
let key = '', data;

function theme(value) {
  document.documentElement.dataset.theme = value;
  el('theme').textContent = value === 'dark' ? 'Light mode' : 'Dark mode';
}
theme(localStorage.getItem('tracker-theme') || 'dark');
el('theme').onclick = () => {
  const value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tracker-theme', value);
  theme(value);
};

async function api(options = {}) {
  const response = await fetch('/api/tracker', { ...options, headers: {
    Authorization: 'Bearer ' + key, 'Content-Type': 'application/json'
  }, signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

function add(parent, tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  parent.append(node);
  return node;
}

function render() {
  const meals = el('meals');
  meals.replaceChildren();
  const plan = data.meals.filter(row => row[0] === date.value);
  for (const slot of ['Breakfast','Lunch','Snack','Dinner']) {
    const meal = plan.find(row => row[1] === slot);
    if (!meal) continue;
    const [, kind, dish, ingredients, prep, nutrients] = meal;
    const card = add(meals, 'article', '');
    add(card, 'p', kind, 'eyebrow');
    add(card, 'h3', dish);
    const list = add(card, 'ul', '');
    for (const ingredient of (ingredients ?? '').split(';')) add(list, 'li', ingredient.trim());
    add(card, 'p', prep);
    add(card, 'p', nutrients);
  }
  if (!plan.length) add(meals, 'p', 'There is no meal plan in the Sheet for this date yet.');
  const entry = data.progress.find(row => row[0] === date.value) ?? [];
  ['weight','activity','notes'].forEach((name,i) => { checkin.elements[name].value = entry[i + 1] ?? ''; });
  const weighted = data.progress.filter(row => Number(row[1]) > 0);
  const first = weighted[0], latest = weighted.at(-1);
  el('trend').textContent = latest ? 'Latest weight ' + latest[1] + ' kg · Starting weight ' + first[1] + ' kg' : 'Your weight history will appear here.';
  const history = el('history');
  history.replaceChildren();
  for (const [day, weight, activity] of data.progress.slice(-7).reverse()) {
    add(history, 'li', [day, weight && weight + ' kg', activity !== '' && activity != null && activity + ' min'].filter(Boolean).join(' · '));
  }
}

async function submit(form, working, action) {
  const button = form.querySelector('button');
  const label = button.textContent;
  button.disabled = true;
  button.textContent = working;
  status.textContent = '';
  try { await action(); } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; button.textContent = label; }
}

el('unlock').onsubmit = event => {
  event.preventDefault();
  submit(event.currentTarget, 'Unlocking…', async () => {
    key = el('unlock').elements.key.value.trim();
    data = await api();
    el('unlock').reset();
    render();
    el('locked').hidden = true;
    el('dashboard').hidden = false;
  });
};
checkin.onsubmit = event => {
  event.preventDefault();
  if (!date.reportValidity()) return;
  submit(checkin, 'Saving…', async () => {
    const fields = new FormData(checkin);
    const number = name => fields.get(name) === '' ? null : Number(fields.get(name));
    await api({ method: 'POST', body: JSON.stringify({
      date: date.value, weight: number('weight'), activity: number('activity'), notes: fields.get('notes')
    }) });
    status.textContent = 'Check-in saved.';
    try { data = await api(); render(); }
    catch { status.textContent = 'Check-in saved. Reopen the dashboard to refresh your history.'; }
  });
};
date.onchange = () => { if (date.value && date.checkValidity()) render(); };
el('lock').onclick = () => location.reload();
