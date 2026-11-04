const el = id => document.getElementById(id);
const date = el('date'), status = el('status');
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
const sampleProgress = [0,1,3,4,6].map((day,i) => [
  new Date(Date.parse(sampleDate) - (6-day)*86400000).toISOString().slice(0,10),
  [89,88.7,88.9,88.3,88.1][i], [20,0,35,22,40][i]
]);
const sampleFood = [[sampleDate,'Breakfast','Curd and oats','1 bowl'],[sampleDate,'Lunch','Chana and brown rice','1 plate']];

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
  if (preview) return { meals: sampleMeals, progress: sampleProgress, foodLog: sampleFood };
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

const dayMs = 86400000;
const slots = ['Breakfast','Lunch','Snack','Dinner'];
const chartNode = (parent, name, attributes, value) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, val] of Object.entries(attributes)) node.setAttribute(key, val);
  if (value !== undefined) node.textContent = value;
  parent.append(node);
  return node;
};

function plot(id, points, bars = false) {
  const parent = el(id);
  parent.replaceChildren();
  const values = points.filter(point => point.value !== null);
  if (!values.length) {
    add(parent, 'p', bars ? 'Activity will appear here when you log minutes.' : 'Your first weigh-in will start this chart.', 'muted');
    return;
  }
  const svg = chartNode(parent, 'svg', { viewBox:'0 0 420 150', class:'chart', role:'img',
    'aria-label':values.map(p => p.date + ': ' + p.value + (bars ? ' minutes' : ' kg')).join(', ') });
  const min = bars ? 0 : Math.floor(Math.min(...values.map(p => p.value)) - 0.2);
  const max = Math.max(min + 1, Math.ceil(Math.max(...values.map(p => p.value)) + (bars ? 0 : 0.2)));
  const y = v => 117 - 94 * (v - min) / (max - min);
  for (const value of [min, (min + max) / 2, max]) {
    chartNode(svg,'line',{x1:46,x2:406,y1:y(value),y2:y(value),class:'grid'});
    chartNode(svg,'text',{x:40,y:y(value)+4,'text-anchor':'end'},Number(value.toFixed(1)));
  }
  const start = Date.parse(points[0].date), end = Date.parse(points.at(-1).date);
  const x = day => start === end ? 226 : 61 + 330 * (Date.parse(day) - start) / (end - start);
  if (!bars && values.length > 1) {
    chartNode(svg,'polyline',{points:values.map(p => x(p.date)+','+y(p.value)).join(' '),class:'line'});
  }
  for (const point of values) {
    const px = x(point.date), py = y(point.value);
    const mark = bars
      ? chartNode(svg,'rect',{x:px-12,y:Math.min(py,115),width:24,height:Math.max(2,117-py),rx:3,class:'bar'})
      : chartNode(svg,'circle',{cx:px,cy:py,r:values.length > 25 ? 2 : 4});
    chartNode(mark,'title',{},point.date+' · '+point.value+(bars?' min':' kg'));
  }
  const labels = bars || points.length === 1 ? points : [points[0],points.at(-1)];
  for (const point of labels) chartNode(svg,'text',{x:x(point.date),y:139,'text-anchor':'middle'},point.date.slice(5));
  add(parent,'p', bars ? 'Blank days have no activity entry.' :
    values.length === 1 ? 'Starting point recorded. Add another weigh-in to see a trend.' :
    values.length + ' weigh-ins through the selected date.', 'chart-summary');
}

const metricNumber = value => value === '' || value == null || !Number.isFinite(Number(value)) ? null : Number(value);

function renderProgress(food) {
  const progress = data.progress.filter(row => row[0] <= date.value);
  const entry = progress.find(row => row[0] === date.value);
  const weights = progress.map(([day,weight]) => ({date:day,value:metricNumber(weight)})).filter(p => p.value > 0);
  const latest = weights.at(-1);
  const change = latest ? latest.value - weights[0].value : 0;
  const activity = metricNumber(entry?.[2]);
  const count = new Set(food.map(row => row[1])).size;
  const day = Math.round((Date.parse(date.value) - Date.parse(date.min)) / dayMs) + 1;
  const length = Math.round((Date.parse(date.max) - Date.parse(date.min)) / dayMs) + 1;
  el('journey-day').textContent = 'Five-month journey · Day ' + day + ' of ' + length;
  el('weight-value').textContent = latest ? latest.value + ' kg' : '—';
  el('weight-detail').textContent = weights.length > 1
    ? new Intl.NumberFormat('en',{signDisplay:'exceptZero',maximumFractionDigits:1}).format(change) + ' kg since first weigh-in'
    : latest ? 'First weigh-in' : 'No weigh-ins yet';
  el('activity-value').textContent = activity === null ? '—' : activity + ' min';
  el('meals-value').textContent = count;
  const momentum = [];
  if (count) momentum.push(count + (count === 1 ? ' meal logged' : ' meals logged'));
  if (activity > 0) momentum.push(activity + ' minutes of activity');
  el('encouragement').textContent = momentum.length
    ? momentum.join(' and ') + ' on this day. Those small actions are how you build a routine.'
    : latest ? 'You have a starting point. Keep showing up, one meal or walk at a time.'
    : 'Start with one thing you can track today: a meal, a walk, or a weigh-in.';
  plot('weight-chart', weights);
  const dates = Array.from({length:7},(_,i) => new Date(Date.parse(date.value) - (6-i)*dayMs).toISOString().slice(0,10));
  plot('activity-chart', dates.map(day => ({
    date:day, value:metricNumber(progress.find(row => row[0] === day)?.[2])
  })), true);
}

function render() {
  const food = (data.foodLog ?? []).filter(row => row[0] === date.value);
  renderProgress(food);
  const log = el('food-log');
  log.replaceChildren();
  if (!food.length) add(log,'li','No meals logged for this date yet.','muted');
  for (const [,slot,dish,quantity,notes] of food) {
    const item = add(log,'li','');
    add(item,'strong',dish);
    add(item,'span',[slot,quantity,notes].filter(Boolean).join(' · '),'muted');
  }

  const meals = el('meals');
  meals.replaceChildren();
  const plan = data.meals.filter(row => row[0] === date.value);
  for (const slot of slots) {
    const meal = plan.find(row => row[1] === slot);
    if (!meal) continue;
    const [,kind,dish,ingredients,prep,nutrients,image] = meal;
    const card = add(meals,'article','','meal');
    if (image && /^https:\/\//i.test(image)) {
      const photo = document.createElement('img');
      photo.alt = dish;
      photo.loading = 'lazy';
      photo.addEventListener('error', () => photo.remove(), {once:true});
      photo.src = image;
      card.append(photo);
    }
    add(card,'p',kind,'eyebrow');
    add(card,'h3',dish);
    const details = add(card,'details','');
    add(details,'summary','Ingredients per serving');
    const list = add(details,'ul','');
    for (const item of (ingredients ?? '').split(';').map(x=>x.trim()).filter(Boolean)) add(list,'li',item);
    const recipe = add(card,'details','');
    recipe.open = true;
    add(recipe,'summary','Step-by-step prep');
    const steps = add(recipe,'ol','');
    const instructions = (prep ?? '').split(/\n+|\.(?=\s+[A-Z])/).map(x=>x.trim()).filter(Boolean);
    for (const instruction of instructions) {
      if (/^\d+\s*(?:min|hour)/i.test(instruction)) add(recipe,'p',instruction,'muted');
      else add(steps,'li',instruction.replace(/^\d+[.)]\s+/, ''));
    }
    if (nutrients) add(card,'p',nutrients,'muted');
  }
  if (!plan.length) add(meals,'p','The Sheet has no menu for this date yet.','muted');
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
el('refresh').onclick = async () => {
  const button = el('refresh');
  button.disabled = true;
  button.textContent = 'Refreshing…';
  try { data = await api(); render(); status.textContent = 'Up to date with Google Sheets.'; }
  catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Refresh from Sheets'; }
};
date.onchange = () => { if (date.value && date.checkValidity()) render(); };
el('lock').onclick = () => location.reload();

if (preview) {
  data = await api();
  el('locked').hidden = true;
  el('dashboard').hidden = false;
  el('lock').hidden = true; el('refresh').hidden = true;
  status.textContent = 'Local preview · Illustrative meals, weigh-ins and activity.';
  render();
}