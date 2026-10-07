const { getLiveWeather, searchCities } = require('../services/weatherService');
const { getRadarMetadata } = require('../services/radarService');

async function searchWeatherLocations(req, res, next) {
  const query = String(req.query.q || '').trim();

  if (query.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Enter at least two characters to search for a city'
    });
  }

  try {
    const locations = await searchCities(query);
    return res.json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
}


/**
 * ============================================================
 * GET CURRENT WEATHER
 * /api/weather?city=Mumbai
 * ============================================================
 */
async function getWeather(req, res, next) {

  try {

    const city =
      String(
        req.query.city ||
        'Chhatrapati Sambhajinagar'
      ).trim();

    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City name is required'
      });
    }

    const hasLatitude = req.query.lat !== undefined;
    const hasLongitude = req.query.lon !== undefined;

    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({
        success: false,
        message: 'Both latitude and longitude are required'
      });
    }

    const coordinates = hasLatitude ? {
      latitude: Number(req.query.lat),
      longitude: Number(req.query.lon),
      state: String(req.query.state || ''),
      country: String(req.query.country || '')
    } : null;

    const weather =
      await getLiveWeather(city, coordinates);

    return res.json({
      success: true,
      data: weather
    });

  } catch (err) {

    console.error(
      '[GET WEATHER ERROR]',
      err.message
    );

    return res.status(502).json({
      success: false,
      message: err.message || 'Unable to fetch live weather'
    });
  }
}


/**
 * ============================================================
 * GET LIVE NOWCAST / FORECAST
 * /api/weather/nowcast?city=Mumbai
 * ============================================================
 */
async function getNowcast(req, res, next) {

  try {

    const city =
      String(
        req.query.city ||
        'Chhatrapati Sambhajinagar'
      ).trim();

    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City name is required'
      });
    }

    const hasLatitude = req.query.lat !== undefined;
    const hasLongitude = req.query.lon !== undefined;

    const coordinates = (hasLatitude && hasLongitude) ? {
      latitude: Number(req.query.lat),
      longitude: Number(req.query.lon),
      state: String(req.query.state || ''),
      country: String(req.query.country || '')
    } : null;

    const weather =
      await getLiveWeather(city, coordinates);

    /*
     * Next available OpenWeather forecast periods.
     * OpenWeather's forecast API provides 3-hour forecast
     * intervals, so we DO NOT invent 15-minute values.
     */
    const hourly =
      weather.forecast || [];


    /*
     * Real 5-day forecast
     */
    const threeDays =
      (weather.fiveDay || [])
        .slice(0, 3)
        .map(day => ({
          day: day.day,
          date: day.date,

          maxTemp:
            day.maxTemp,

          minTemp:
            day.minTemp,

          rainProb:
            day.rainProb,

          rainfall_mm:
            day.rainfall_mm,

          condition:
            day.condition,

          windGust:
            day.wind_speed
              ? `${day.wind_speed} km/h`
              : 'N/A',

          windDirection:
            day.wind_direction
        }));


    /*
     * Real forecast chart data.
     *
     * These are OpenWeather forecast intervals,
     * not fake 15-minute predictions.
     */
    const chartLabels =
      hourly.map(item => item.time);

    const precipitationValues =
      hourly.map(item =>
        Number(
          item.rainfall_mm || 0
        )
      );

    const rainProbabilities =
      hourly.map(item =>
        Number(
          item.rainProb || 0
        )
      );


    /*
     * Maximum forecast precipitation probability
     */
    const maxRainProbability =
      rainProbabilities.length
        ? Math.max(...rainProbabilities)
        : 0;


    /*
     * Highest forecast rainfall
     */
    const maxRainfall =
      precipitationValues.length
        ? Math.max(...precipitationValues)
        : 0;


    /*
     * Risk information based ONLY on
     * weather forecast values.
     *
     * This is NOT a government flood warning.
     */
    const riskAssessment = {

      overallRisk:
        getWeatherRisk(
          maxRainProbability,
          maxRainfall
        ),

      floodProbabilityMax:
        maxRainProbability,

      peakRainfallRate:
        `${maxRainfall.toFixed(1)} mm / forecast period`,

      runOffIndex:
        getRunoffIndex(
          maxRainProbability,
          maxRainfall
        ),

      soilSaturation:
        'Not provided by OpenWeather',

      drainageCapacity:
        'Not provided by OpenWeather'
    };


    return res.json({

      success: true,

      city:
        weather.city,

      country:
        weather.country,

      latitude:
        weather.latitude,

      longitude:
        weather.longitude,

      hourly,

      threeDays,

      fiveDay:
        weather.fiveDay || [],

      chartData: {

        labels:
          chartLabels,

        precipitationRate:
          precipitationValues,

        floodProbability:
          rainProbabilities
      },

      riskAssessment
    });

  } catch (err) {

    console.error(
      '[GET NOWCAST ERROR]',
      err.message
    );

    return res.status(502).json({
      success: false,
      message:
        err.message ||
        'Unable to fetch forecast'
    });
  }
}


/**
 * ============================================================
 * WEATHER RISK
 * ============================================================
 */
function getWeatherRisk(
  rainProbability,
  rainfall
) {

  if (
    rainProbability >= 80 ||
    rainfall >= 20
  ) {
    return 'HIGH PRECIPITATION RISK';
  }

  if (
    rainProbability >= 50 ||
    rainfall >= 5
  ) {
    return 'MODERATE PRECIPITATION RISK';
  }

  return 'LOW PRECIPITATION RISK';
}


/**
 * ============================================================
 * RUNOFF INDEX
 * ============================================================
 */
function getRunoffIndex(
  rainProbability,
  rainfall
) {

  if (
    rainfall >= 20 ||
    rainProbability >= 80
  ) {
    return 'High';
  }

  if (
    rainfall >= 5 ||
    rainProbability >= 50
  ) {
    return 'Moderate';
  }

  return 'Low';
}


/**
 * ============================================================
 * RADAR
 * ============================================================
 */
function getRadar(req, res, next) {

  try {

    const radarData =
      getRadarMetadata();

    return res.json({
      success: true,
      data: radarData
    });

  } catch (err) {

    next(err);
  }
}


module.exports = {
  searchWeatherLocations,
  getWeather,
  getNowcast,
  getRadar
};
