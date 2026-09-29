const API_KEY = '5235e9636d784018ac585542251111';
const FORECAST_DAYS = 3;
const BASE = 'https://api.weatherapi.com/v1/forecast.json';

const el = {
  form: document.getElementById('searchForm'),
  input: document.getElementById('cityInput'),
  geoBtn: document.getElementById('geoBtn'),
  unitToggle: document.getElementById('unitToggle'),
  history: document.getElementById('history'),
  loader: document.getElementById('loader'),
  error: document.getElementById('error'),
  weather: document.getElementById('weather'),
  empty: document.getElementById('empty'),
  icon: document.getElementById('weatherIcon'),
  location: document.getElementById('location'),
  localtime: document.getElementById('localtime'),
  temp: document.getElementById('temp'),
  condition: document.getElementById('condition'),
  feels: document.getElementById('feels'),
  humidity: document.getElementById('humidity'),
  wind: document.getElementById('wind'),
  forecast: document.getElementById('forecast'),
};

let unit = localStorage.getItem('weather_unit') || 'C';
let history = JSON.parse(localStorage.getItem('weather_history') || '[]');
const cache = new Map();

const setLoading = (on) => el.loader.classList.toggle('hidden', !on);

const showError = (msg) => {
  setLoading(false);
  el.error.textContent = msg;
  el.error.classList.remove('hidden');
};

const clearError = () => {
  el.error.classList.add('hidden');
  el.error.textContent = '';
};

const tempOf = (c, f) => (unit === 'C' ? Math.round(c) + '°C' : Math.round(f) + '°F');

const saveHistory = (q) => {
  history = [q, ...history.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 5);
  localStorage.setItem('weather_history', JSON.stringify(history));
  renderHistory();
};

const renderHistory = () => {
  el.history.innerHTML = '';
  history.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item;
    b.onclick = () => {
      el.input.value = item;
      fetchWeather(item);
    };
    el.history.appendChild(b);
  });
};

const iconSrc = (icon) => (icon.startsWith('//') ? 'https:' + icon : icon);

function renderWeather(data) {
  setLoading(false);
  clearError();
  const loc = data.location;
  const cur = data.current;

  el.location.textContent = [loc.name, loc.region, loc.country].filter(Boolean).join(', ');
  el.localtime.textContent = loc.localtime;
  el.icon.src = iconSrc(cur.condition.icon);
  el.icon.alt = cur.condition.text;
  el.temp.textContent = tempOf(cur.temp_c, cur.temp_f);
  el.condition.textContent = cur.condition.text;
  el.feels.textContent = 'Feels like ' + tempOf(cur.feelslike_c, cur.feelslike_f);
  el.humidity.textContent = cur.humidity + '%';
  el.wind.textContent = cur.wind_kph + ' kph';

  el.forecast.innerHTML = '';
  (data.forecast?.forecastday || []).forEach((d) => {
    const date = new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const div = document.createElement('div');
    div.className = 'day';
    div.innerHTML =
      '<div class="d">' + date + '</div>' +
      '<img src="' + iconSrc(d.day.condition.icon) + '" alt="' + d.day.condition.text + '">' +
      '<div class="t">' + tempOf(d.day.avgtemp_c, d.day.avgtemp_f) + '</div>';
    el.forecast.appendChild(div);
  });

  el.empty.classList.add('hidden');
  el.weather.classList.remove('hidden');
}

async function fetchWeather(q) {
  q = (q || '').trim();
  if (!q) {
    showError('Please enter a city name.');
    return;
  }
  const key = q.toLowerCase();
  if (cache.has(key)) {
    renderWeather(cache.get(key));
    saveHistory(q);
    return;
  }
  setLoading(true);
  clearError();
  try {
    const url = BASE + '?key=' + API_KEY + '&q=' + encodeURIComponent(q) +
      '&days=' + FORECAST_DAYS + '&aqi=no&alerts=no';
    const res = await fetch(url);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    cache.set(key, data);
    renderWeather(data);
    saveHistory(q);
  } catch (e) {
    showError('Could not find that place. Try another search.');
  }
}

el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  fetchWeather(el.input.value);
});

el.geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported in this browser.');
    return;
  }
  setLoading(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchWeather(pos.coords.latitude + ',' + pos.coords.longitude),
    () => showError('Could not get your location.'),
    { timeout: 10000 }
  );
});

el.unitToggle.addEventListener('click', () => {
  unit = unit === 'C' ? 'F' : 'C';
  localStorage.setItem('weather_unit', unit);
  el.unitToggle.textContent = '°' + unit;
  const q = el.input.value.trim() || history[0];
  if (q) fetchWeather(q);
});

// init
el.unitToggle.textContent = '°' + unit;
renderHistory();
const start = history[0] || 'Madhubani';
el.input.value = start;
fetchWeather(start);
