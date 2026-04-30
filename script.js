const API_KEY = '5235e9636d784018ac585542251111';
const FORECAST_DAYS = 3;
const BASE_FORECAST = 'https://api.weatherapi.com/v1/forecast.json';

// Elements
const el = {
  searchForm: document.getElementById('searchForm'),
  cityInput: document.getElementById('cityInput'),
  searchBtn: document.getElementById('searchBtn'),
  geoBtn: document.getElementById('geoBtn'),
  unitToggle: document.getElementById('unitToggle'),
  themeToggle: document.getElementById('themeToggle'),
  history: document.getElementById('history'),
  loader: document.getElementById('loader'),
  error: document.getElementById('error'),
  weather: document.getElementById('weather'),
  weatherIcon: document.getElementById('weatherIcon'),
  location: document.getElementById('location'),
  localtime: document.getElementById('localtime'),
  temp: document.getElementById('temp'),
  feels: document.getElementById('feels'),
  humidity: document.getElementById('humidity'),
  wind: document.getElementById('wind'),
  condition: document.getElementById('condition'),
  forecast: document.getElementById('forecast'),
  card: document.getElementById('card')
};

// State & cache
let unit = localStorage.getItem('weather_unit') || 'C';
let theme = localStorage.getItem('weather_theme') || 'light';
let history = JSON.parse(localStorage.getItem('weather_history') || '[]');
const cache = new Map();

// Utilities
const debounce = (fn, wait = 350) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
};

const setLoading = (on = true) => {
  el.loader.classList.toggle('hidden', !on);
  if (on) {
    el.weather.classList.add('hidden');
    el.error.classList.add('hidden');
  }
};

const showError = (message) => {
  setLoading(false);
  el.error.classList.remove('hidden');
  el.error.innerHTML = `<div>${message}</div><button id="tryAgain">Retry</button>`;
  document.getElementById('tryAgain').addEventListener('click', () => {
    const q = el.cityInput.value.trim();
    if (q) fetchWeather(q);
  });
};

const clearError = () => {
  el.error.classList.add('hidden');
  el.error.innerHTML = '';
};

const saveHistory = (q) => {
  if (!q) return;
  history = history.filter(s => s.toLowerCase() !== q.toLowerCase());
  history.unshift(q);
  if (history.length > 6) history.pop();
  localStorage.setItem('weather_history', JSON.stringify(history));
  renderHistory();
};

const renderHistory = () => {
  el.history.innerHTML = '';
  if (!history.length) {
    el.history.innerHTML = `<div class="small">No recent searches</div>`;
    return;
  }
  history.forEach(item => {
    const btn = document.createElement('button');
    btn.textContent = item;
    btn.addEventListener('click', () => {
      el.cityInput.value = item;
      fetchWeather(item);
    });
    el.history.appendChild(btn);
  });
};

const setTheme = (t) => {
  theme = t;
  localStorage.setItem('weather_theme', t);
  document.body.classList.toggle('dark', t === 'dark');
};

const setUnit = (u) => {
  unit = u;
  localStorage.setItem('weather_unit', u);
  el.unitToggle.textContent = u === 'C' ? '°C' : '°F';
};

const formatTemp = (data) => {
  return unit === 'C' ? `${Math.round(data.temp_c)}°C` : `${Math.round(data.temp_f)}°F`;
};

const formatFeels = (data) => {
  return unit === 'C' ? `Feels: ${Math.round(data.feelslike_c)}°C` : `Feels: ${Math.round(data.feelslike_f)}°F`;
};

const buildIcon = (iconUrl, text) => {
  // WeatherAPI returns an icon like //cdn.weatherapi.com/...
  const src = iconUrl.startsWith('//') ? 'https:' + iconUrl : iconUrl;
  el.weatherIcon.innerHTML = `<img src="${src}" alt="${text}" loading="lazy">`;
};

const mapBackground = (conditionText, is_day) => {
  const text = (conditionText || '').toLowerCase();
  if (text.includes('rain') || text.includes('shower') || text.includes('drizzle')) return 'rain';
  if (text.includes('snow') || text.includes('sleet')) return 'snow';
  if (text.includes('cloud') || text.includes('overcast')) return 'cloud';
  if (text.includes('thunder')) return 'thunder';
  if (text.includes('mist') || text.includes('fog')) return 'fog';
  return is_day ? 'sun' : 'night';
};

const applyBackground = (bgKey) => {
  switch (bgKey) {
    case 'rain':
      document.body.style.background = 'linear-gradient(180deg,#3a6ea5 0%,#6fb1d8 100%)';
      break;
    case 'snow':
      document.body.style.background = 'linear-gradient(180deg,#cddff6 0%,#ffffff 100%)';
      break;
    case 'cloud':
      document.body.style.background = 'linear-gradient(180deg,#b7c0cf 0%,#dde7f2 100%)';
      break;
    case 'thunder':
      document.body.style.background = 'linear-gradient(180deg,#2b3a67 0%,#4b67a1 100%)';
      break;
    case 'fog':
      document.body.style.background = 'linear-gradient(180deg,#d7dde3 0%,#f3f6f9 100%)';
      break;
    case 'night':
      document.body.style.background = 'linear-gradient(180deg,#071033 0%,#12264f 100%)';
      break;
    default:
      document.body.style.background = 'linear-gradient(135deg,#a1c4fd 0%,#c2e9fb 100%)';
  }
};

// Render functions
const renderWeather = (data) => {
  setLoading(false);
  clearError();
  const loc = data.location;
  const cur = data.current;

  el.location.textContent = `${loc.name}${loc.region ? ', '+loc.region : ''}${loc.country ? ', '+loc.country : ''}`;
  el.localtime.textContent = `Local: ${loc.localtime}`;
  el.temp.textContent = formatTemp(cur);
  el.feels.textContent = formatFeels(cur);
  el.humidity.textContent = cur.humidity + '%';
  el.wind.textContent = `${cur.wind_kph} kph`;
  el.condition.textContent = cur.condition.text;

  buildIcon(cur.condition.icon, cur.condition.text);

  el.weather.classList.remove('hidden');

  // Background
  const bg = mapBackground(cur.condition.text, cur.is_day);
  applyBackground(bg);

  // Forecast
  if (data.forecast && data.forecast.forecastday) {
    renderForecast(data.forecast.forecastday);
  }
};

const renderForecast = (days) => {
  el.forecast.classList.remove('hidden');
  el.forecast.innerHTML = '';
  days.forEach(d => {
    const date = new Date(d.date).toLocaleDateString(undefined, {weekday:'short',month:'short',day:'numeric'});
    const ic = d.day.condition.icon.startsWith('//') ? 'https:' + d.day.condition.icon : d.day.condition.icon;
    const f = document.createElement('div');
    f.className = 'day';
    f.innerHTML = `
      <div class="date">${date}</div>
      <img src="${ic}" alt="${d.day.condition.text}" width="48" height="48" loading="lazy">
      <div class="day-temp">${unit==='C'?Math.round(d.day.avgtemp_c)+'°C':Math.round(d.day.avgtemp_f)+'°F'}</div>
      <div class="day-cond">${d.day.condition.text}</div>
    `;
    el.forecast.appendChild(f);
  });
};

// Fetch weather (with forecast) and cache
const fetchWeather = async (q) => {
  if (!q) return;
  const key = q.toLowerCase();
  if (cache.has(key)) {
    renderWeather(cache.get(key));
    saveHistory(q);
    return;
  }

  setLoading(true);
  try {
    const url = `${BASE_FORECAST}?key=${API_KEY}&q=${encodeURIComponent(q)}&days=${FORECAST_DAYS}&aqi=no&alerts=no`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Location not found');
    const data = await res.json();
    cache.set(key, data);
    renderWeather(data);
    saveHistory(q);
  } catch (err) {
    console.error(err);
    showError('Could not fetch weather. Try another search or check your network.');
  }
};

// Geolocation
const tryGeolocation = () => {
  if (!navigator.geolocation) {
    showError('Geolocation not supported in this browser.');
    return;
  }
  setLoading(true);
  navigator.geolocation.getCurrentPosition(pos => {
    const {latitude, longitude} = pos.coords;
    fetchWeather(`${latitude},${longitude}`);
  }, err => {
    console.error(err);
    showError('Unable to retrieve your location.');
  }, {timeout:10000});
};

// Handlers
const onSearch = (e) => {
  if (e) e.preventDefault();
  const q = el.cityInput.value.trim();
  if (!q) {
    showError('Please enter a city or coordinates');
    return;
  }
  fetchWeather(q);
};

const onKeyPress = (e) => {
  if (e.key === 'Enter') {
    onSearch(e);
  }
};

// Init
const init = () => {
  // initial theme & unit
  setUnit(unit);
  setTheme(theme);

  renderHistory();

  // Event listeners
  el.searchForm.addEventListener('submit', onSearch);
  el.searchBtn.addEventListener('click', onSearch);
  el.cityInput.addEventListener('keydown', onKeyPress);

  el.geoBtn.addEventListener('click', tryGeolocation);

  el.unitToggle.addEventListener('click', () => {
    setUnit(unit === 'C' ? 'F' : 'C');
    // re-render last search if exists
    const q = el.cityInput.value.trim() || history[0];
    if (q) fetchWeather(q);
  });

  el.themeToggle.addEventListener('click', () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  });

  // Debounce input for possible future autosuggest (keeps searches smooth)
  el.cityInput.addEventListener('input', debounce(() => {
    // placeholder for autosuggest - currently no API used
  }, 400));

  // Start with last search or a default
  const start = history[0] || 'madhubani';
  el.cityInput.value = start;
  fetchWeather(start);
};

// Run
init();
