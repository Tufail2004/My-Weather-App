// Weather App — fetches current weather from WeatherAPI and renders it.

// Your WeatherAPI key
const API_KEY = '5235e9636d784018ac585542251111';

// DOM elements
const form = document.getElementById('searchForm');
const input = document.getElementById('cityInput');
const errorBox = document.getElementById('error');
const card = document.getElementById('card');
const emptyState = document.getElementById('empty');
const loader = document.getElementById('loader');
const unitCBtn = document.getElementById('unitC');
const unitFBtn = document.getElementById('unitF');

// 'C' for Celsius, 'F' for Fahrenheit. Remember the user's choice.
let unit = localStorage.getItem('weather_unit') || 'C';
// Keep the last successful response so switching units re-renders instantly.
let lastData = null;

const isCelsius = () => unit === 'C';

// Format a temperature in the currently selected unit.
const formatTemp = (tempC, tempF) =>
  Math.round(isCelsius() ? tempC : tempF) + '°' + unit;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
  errorBox.textContent = '';
}

// Fetch current weather for a city and render it.
async function getWeather(city) {
  const query = city.trim();
  if (!query) {
    showError('Please enter a city name.');
    return;
  }
  hideError();

  // Show the card with a loading spinner.
  emptyState.classList.add('hidden');
  card.classList.remove('hidden');
  loader.classList.remove('hidden');

  try {
    const url =
      'https://api.weatherapi.com/v1/current.json' +
      '?key=' + API_KEY +
      '&q=' + encodeURIComponent(query) +
      '&aqi=no';
    const response = await fetch(url);
    if (!response.ok) throw new Error('City not found');

    const data = await response.json();
    lastData = data;
    renderWeather(data);
  } catch (err) {
    loader.classList.add('hidden');
    card.classList.add('hidden');
    emptyState.classList.remove('hidden');
    showError('City not found. Please try another city.');
  }
}

// Fill the weather card with data from the API response.
function renderWeather(data) {
  loader.classList.add('hidden');

  const location = data.location;
  const current = data.current;

  const icon = document.getElementById('weatherIcon');
  icon.src = 'https:' + current.condition.icon;
  icon.alt = current.condition.text;

  document.getElementById('temp').textContent =
    formatTemp(current.temp_c, current.temp_f);
  document.getElementById('condition').textContent = current.condition.text;
  document.getElementById('location').textContent =
    location.name + ', ' + location.country;

  document.getElementById('feels').textContent =
    formatTemp(current.feelslike_c, current.feelslike_f);
  document.getElementById('humidity').textContent = current.humidity + '%';
  document.getElementById('wind').textContent = current.wind_kph + ' km/h';
  document.getElementById('pressure').textContent = current.pressure_mb + ' hPa';
  document.getElementById('visibility').textContent = current.vis_km + ' km';
}

// Switch temperature unit and re-render if we already have data.
function setUnit(newUnit) {
  unit = newUnit;
  localStorage.setItem('weather_unit', unit);
  unitCBtn.classList.toggle('active', isCelsius());
  unitFBtn.classList.toggle('active', !isCelsius());
  if (lastData) renderWeather(lastData);
}

// Search on button click or Enter key (form submit handles both).
form.addEventListener('submit', (event) => {
  event.preventDefault();
  getWeather(input.value);
});

unitCBtn.addEventListener('click', () => setUnit('C'));
unitFBtn.addEventListener('click', () => setUnit('F'));

// Apply the saved unit on page load.
setUnit(unit);
