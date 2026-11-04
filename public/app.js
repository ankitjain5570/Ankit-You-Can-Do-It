const el = id => document.getElementById(id);
const date = el('date'), checkin = el('checkin'), status = el('status');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata',
  year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
date.value = today < date.min ? date.min : today > date.max ? date.max : today;
let key = '', data;
const preview = ['127.0.0.1', 'localhost'].includes(location.hostname) &&
  new URLSearchParams(location.search).get('preview') === '1';
const sampleDate = date.value;
const sampleMeals = [
  ['Breakfast', 'Curd, oat and guava bowl', '45 g rolled oats; 200 g plain curd; 1 small guava; 1 tbsp ground flaxseed; 60 ml water', 'Stir the oats, curd and water together. Add chopped guava and flaxseed. 5 min.', 'Curd provides protein and calcium. Flaxseed adds fibre and plant omega-3.'],
  ['Lunch', 'Lemon chana and brown rice', '150 g cooked chickpeas; 120 g cooked brown rice; 100 g cucumber; 100 g tomato; ½ lemon; 1 tsp oil; ¼ tsp cumin; pinch of iodised salt', 'Warm the chickpeas with oil and cumin. Serve with rice and the chopped salad dressed with lemon and salt. 12 min with cooked staples.', 'Chickpeas supply fibre and iron. Lemon and tomato add vitamin C.'],
  ['Snack', 'Apple and roasted chana', '1 apple; 30 g roasted chana', 'Slice the apple and serve with roasted chana. 3 min.', 'Fruit and chickpeas add fibre.'],
  ['Dinner', 'Tofu and capsicum wraps', '180 g firm tofu; 2 small whole-wheat rotis; 100 g capsicum; 75 g spinach; 1 tsp oil; 1 garlic clove; pinch of iodised salt', 'Sauté garlic and capsicum in oil. Add crumbled tofu, spinach and salt. Cook until hot and fold into warmed rotis. 15 min.', 'Tofu provides protein and spinach adds folate.']
].map(meal => [sampleDate, ...meal]);
let sampleProgress = [];

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
  if (preview) {
    if (options.method === 'POST') {
      const { date, weight, activity, notes } = JSON.parse(options.body);
      if (weight === null && activity === null && !notes.trim()) {
        throw new Error('Enter a weight, activity time or note.');
      }
      sampleProgress = sampleProgress.filter(row => row[0] !== date);
      sampleProgress.push([date, weight, activity, notes]);
      sampleProgress.sort((a,b) => a[0].localeCompare(b[0]));
      return { saved: true };
    }
    return { meals: sampleMeals, progress: sampleProgress };
  }
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
    status.textContent = preview ? 'Sample check-in saved for this preview.' : 'Check-in saved.';
    try { data = await api(); render(); }
    catch { status.textContent = 'Check-in saved. Reopen the dashboard to refresh your history.'; }
  });
};
date.onchange = () => { if (date.value && date.checkValidity()) render(); };
el('lock').onclick = () => location.reload();

if (preview) {
  data = await api();
  el('locked').hidden = true;
  el('dashboard').hidden = false;
  el('lock').hidden = true;
  status.textContent = 'Local preview · Sample meals and check-ins. Entries reset when you reload.';
  render();
}