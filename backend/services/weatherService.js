const https = require('https');
const { memoryStore } = require('../config/db');
const env = require('../config/env');

/**
 * Get LIVE current weather + 5-day forecast for ANY valid city
 * using OpenWeather Geocoding + Current Weather + 5-Day Forecast APIs.
 */
async function getLiveWeather(city = 'Chhatrapati Sambhajinagar') {
  const normCity = String(city).trim();

  if (!normCity) {
    throw new Error('City name is required');
  }

  if (
    !env.WEATHER_API_KEY ||
    env.WEATHER_API_KEY === 'demo_weather_key'
  ) {
    throw new Error('WEATHER_API_KEY is not configured');
  }

  try {
    // =========================================================
    // STEP 1: CITY NAME -> LATITUDE / LONGITUDE
    // =========================================================

    const geoUrl =
      `https://api.openweathermap.org/geo/1.0/direct` +
      `?q=${encodeURIComponent(normCity)}` +
      `&limit=1` +
      `&appid=${encodeURIComponent(env.WEATHER_API_KEY)}`;

    console.log(`[WEATHER] Searching city: ${normCity}`);

    const geoData = await fetchJson(geoUrl);

    if (
      !Array.isArray(geoData) ||
      geoData.length === 0
    ) {
      throw new Error(`Location "${normCity}" not found`);
    }

    const location = geoData[0];

    const lat = Number(location.lat);
    const lon = Number(location.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error(`Invalid coordinates for "${normCity}"`);
    }

    console.log(
      `[WEATHER] Location found: ${location.name}, ${location.country}`
    );

    console.log(
      `[WEATHER] Coordinates: ${lat}, ${lon}`
    );

    // =========================================================
    // STEP 2: LIVE CURRENT WEATHER
    // =========================================================

    const currentUrl =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${lat}` +
      `&lon=${lon}` +
      `&appid=${encodeURIComponent(env.WEATHER_API_KEY)}` +
      `&units=metric`;

    console.log(
      `[WEATHER] Fetching current weather: ${location.name}`
    );

    const weather = await fetchJson(currentUrl);

    if (!weather || Number(weather.cod) !== 200) {
      throw new Error(
        weather?.message || 'Current weather API request failed'
      );
    }

    // =========================================================
    // STEP 3: 5-DAY / 3-HOUR FORECAST
    // =========================================================

    const forecastUrl =
      `https://api.openweathermap.org/data/2.5/forecast` +
      `?lat=${lat}` +
      `&lon=${lon}` +
      `&appid=${encodeURIComponent(env.WEATHER_API_KEY)}` +
      `&units=metric`;

    console.log(
      `[WEATHER] Fetching 5-day forecast: ${location.name}`
    );

    const forecastData = await fetchJson(forecastUrl);

    if (
      !forecastData ||
      !Array.isArray(forecastData.list)
    ) {
      throw new Error('5-day forecast API request failed');
    }

    // =========================================================
    // CURRENT WEATHER DATA
    // =========================================================

    const weatherInfo = weather.weather?.[0] || {};
    const main = weather.main || {};
    const wind = weather.wind || {};
    const clouds = weather.clouds || {};
    const rain = weather.rain || {};

    const rainfall =
      Number(rain['1h']) ||
      Number(rain['3h']) ||
      0;

    const windDirection =
      getWindDirection(wind.deg);

    const visibility =
      weather.visibility
        ? weather.visibility / 1000
        : 10;

    // =========================================================
    // PROCESS 5-DAY FORECAST
    // =========================================================

    const fiveDay = buildFiveDayForecast(
      forecastData.list,
      weather.timezone || 0
    );

    // =========================================================
    // HOURLY / NEXT FORECAST PERIODS
    // =========================================================

    const forecast = forecastData.list
      .slice(0, 5)
      .map(item => ({
        time: formatForecastTime(item.dt, forecastData.city?.timezone),
        temp: Math.round(item.main?.temp ?? 0),
        feels_like: Math.round(item.main?.feels_like ?? 0),
        rainProb: Math.round((item.pop || 0) * 100),
        humidity: item.main?.humidity ?? 0,
        pressure: item.main?.pressure ?? 0,
        wind_speed: item.wind?.speed ?? 0,
        wind_direction: getWindDirection(item.wind?.deg),
        rainfall_mm: getForecastRainfall(item),
        condition: capitalize(
          item.weather?.[0]?.description || 'Unknown'
        ),
        weather_main:
          item.weather?.[0]?.main || 'Unknown',
        icon:
          item.weather?.[0]?.icon || null
      }));

    // =========================================================
    // FINAL RESPONSE
    // =========================================================

    return {
      city:
        location.name ||
        weather.name ||
        normCity,

      country:
        location.country ||
        weather.sys?.country ||
        '',

      state:
        location.state || '',

      latitude: lat,
      longitude: lon,

      // Current temperature
      temperature: Math.round(main.temp),

      feels_like:
        Math.round(main.feels_like),

      min_temperature:
        Math.round(main.temp_min),

      max_temperature:
        Math.round(main.temp_max),

      // Humidity
      humidity:
        main.humidity,

      // Pressure
      pressure:
        main.pressure,

      // Rainfall
      rainfall_mm:
        Number(rainfall.toFixed(2)),

      // Wind
      wind_speed:
        Number((wind.speed || 0).toFixed(1)),

      wind_direction:
        windDirection,

      wind_degree:
        wind.deg || 0,

      wind_gust:
        Number((wind.gust || 0).toFixed(1)),

      // Clouds
      cloudiness:
        clouds.all || 0,

      // Visibility
      visibility:
        Number(visibility.toFixed(1)),

      // Weather condition
      condition:
        capitalize(
          weatherInfo.description || 'Unknown'
        ),

      weather_main:
        weatherInfo.main || 'Unknown',

      weather_icon:
        weatherInfo.icon || null,

      weather_id:
        weatherInfo.id || null,

      // Sunrise / Sunset
      sunrise:
        weather.sys?.sunrise || null,

      sunset:
        weather.sys?.sunset || null,

      timezone:
        weather.timezone || 0,

      // Next forecast periods
      forecast,

      // 5-day grouped forecast
      fiveDay,

      // Compatibility with existing weather.js
      sevenDay: fiveDay,

      source:
        'OPENWEATHER LIVE API',

      updated_at:
        new Date().toISOString()
    };

  } catch (error) {

    console.error(
      '[WEATHER SERVICE ERROR]',
      error.message
    );

    // =========================================================
    // IMPORTANT:
    // ONLY USE FALLBACK FOR THE EXACT SAME CITY.
    // NEVER USE ANOTHER CITY'S WEATHER.
    // =========================================================

    const fallback =
      memoryStore.weather_data[normCity];

    if (fallback) {
      return {
        ...fallback,
        city: normCity,
        source: 'FALLBACK DATA',
        error: error.message
      };
    }

    throw error;
  }
}


/**
 * Convert OpenWeather forecast list into
 * one forecast card per day.
 */
function buildFiveDayForecast(list, timezoneOffset = 0) {

  const groups = {};

  for (const item of list) {

    const localDate =
      getLocalDateFromUnix(
        item.dt,
        timezoneOffset
      );

    if (!groups[localDate]) {
      groups[localDate] = [];
    }

    groups[localDate].push(item);
  }

  return Object.entries(groups)
    .slice(0, 5)
    .map(([date, items], index) => {

      const temperatures =
        items
          .map(item => Number(item.main?.temp))
          .filter(Number.isFinite);

      const rainfallValues =
        items.map(item =>
          getForecastRainfall(item)
        );

      const rainProbabilities =
        items.map(item =>
          Math.round((item.pop || 0) * 100)
        );

      const middleItem =
        items[Math.floor(items.length / 2)] ||
        items[0];

      const maxTemp =
        temperatures.length
          ? Math.round(Math.max(...temperatures))
          : null;

      const minTemp =
        temperatures.length
          ? Math.round(Math.min(...temperatures))
          : null;

      const maxRainProbability =
        rainProbabilities.length
          ? Math.max(...rainProbabilities)
          : 0;

      const totalRain =
        rainfallValues.reduce(
          (sum, value) => sum + value,
          0
        );

      return {
        date,

        day:
          index === 0
            ? 'Today'
            : formatDayName(date),

        high:
          maxTemp,

        low:
          minTemp,

        maxTemp:
          maxTemp,

        minTemp:
          minTemp,

        rainProb:
          maxRainProbability,

        rainfall_mm:
          Number(totalRain.toFixed(2)),

        condition:
          capitalize(
            middleItem?.weather?.[0]?.description ||
            'Unknown'
          ),

        weather_main:
          middleItem?.weather?.[0]?.main ||
          'Unknown',

        weather_icon:
          middleItem?.weather?.[0]?.icon ||
          null,

        wind_speed:
          Number(
            (
              middleItem?.wind?.speed || 0
            ).toFixed(1)
          ),

        wind_direction:
          getWindDirection(
            middleItem?.wind?.deg
          )
      };
    });
}


/**
 * Forecast rainfall.
 *
 * OpenWeather forecast normally provides
 * rain.3h for 3-hour forecast periods.
 */
function getForecastRainfall(item) {

  if (item?.rain?.['3h'] !== undefined) {
    return Number(item.rain['3h']) || 0;
  }

  if (item?.rain?.['1h'] !== undefined) {
    return Number(item.rain['1h']) || 0;
  }

  return 0;
}


/**
 * Get local YYYY-MM-DD using
 * OpenWeather timezone offset.
 */
function getLocalDateFromUnix(
  unixSeconds,
  timezoneOffset = 0
) {

  const date =
    new Date(
      (unixSeconds + timezoneOffset) * 1000
    );

  return date
    .toISOString()
    .slice(0, 10);
}


/**
 * Format forecast time.
 */
function formatForecastTime(
  unixSeconds,
  timezoneOffset = 0
) {

  const date =
    new Date(
      (unixSeconds + timezoneOffset) * 1000
    );

  const hours =
    date.getUTCHours();

  const minutes =
    String(date.getUTCMinutes())
      .padStart(2, '0');

  const hour12 =
    hours % 12 || 12;

  const period =
    hours >= 12 ? 'PM' : 'AM';

  return `${hour12}:${minutes} ${period}`;
}


/**
 * Format day name.
 */
function formatDayName(dateString) {

  const date =
    new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'short'
    }
  );
}


/**
 * Convert wind degree to compass direction.
 */
function getWindDirection(degree) {

  if (
    degree === undefined ||
    degree === null ||
    Number.isNaN(Number(degree))
  ) {
    return 'N';
  }

  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW'
  ];

  const index =
    Math.round(Number(degree) / 22.5) % 16;

  return directions[index];
}


/**
 * Capitalize weather description.
 */
function capitalize(text) {

  if (!text) {
    return '';
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}


/**
 * HTTPS JSON request.
 */
function fetchJson(url) {

  return new Promise(
    (resolve, reject) => {

      const request =
        https.get(
          url,
          {
            timeout: 10000
          },
          (res) => {

            let data = '';

            res.on(
              'data',
              chunk => {
                data += chunk;
              }
            );

            res.on(
              'end',
              () => {

                try {

                  const json =
                    JSON.parse(data);

                  if (
                    res.statusCode < 200 ||
                    res.statusCode >= 300
                  ) {

                    return reject(
                      new Error(
                        json.message ||
                        `HTTP ${res.statusCode}`
                      )
                    );
                  }

                  resolve(json);

                } catch (error) {

                  reject(error);

                }
              }
            );
          }
        );

      request.on(
        'timeout',
        () => {

          request.destroy();

          reject(
            new Error(
              'Weather API request timed out'
            )
          );
        }
      );

      request.on(
        'error',
        reject
      );
    }
  );
}


module.exports = {
  getLiveWeather
};
