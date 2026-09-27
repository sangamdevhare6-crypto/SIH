const { getLiveWeather } = require('../services/weatherService');
const { getRadarMetadata } = require('../services/radarService');

async function getWeather(req, res, next) {
  try {
    const city = req.query.city || 'Chhatrapati Sambhajinagar';
    const weather = await getLiveWeather(city);
    return res.json({
      success: true,
      data: weather
    });
  } catch (err) {
    next(err);
  }
}

async function getNowcast(req, res, next) {
  try {
    const city = req.query.city || 'Chhatrapati Sambhajinagar';
    const weather = await getLiveWeather(city);

    // 5-Hour Forecast array
    const hourly = weather.forecast || [];

    // 3-Day summary
    const threeDays = [
      { day: 'Today', maxTemp: 26, minTemp: 22, rainProb: 95, condition: 'Heavy Rain Downpour', windGust: '48 km/h' },
      { day: 'Tomorrow', maxTemp: 27, minTemp: 22, rainProb: 80, condition: 'Scattered Thunderstorms', windGust: '36 km/h' },
      { day: 'Day 3', maxTemp: 28, minTemp: 23, rainProb: 65, condition: 'Passing Monsoon Showers', windGust: '25 km/h' }
    ];

    // High precision chart data points for the next 5 hours (15-min intervals)
    const chartLabels = ['Now', '+15m', '+30m', '+45m', '+1h', '+1h 15m', '+1h 30m', '+1h 45m', '+2h', '+2h 30m', '+3h', '+4h', '+5h'];
    const precipitationValues = [12.4, 15.2, 18.0, 22.5, 19.8, 16.4, 14.2, 11.0, 9.5, 7.2, 5.0, 3.8, 1.2]; // mm/hr
    const floodProbability = [88, 92, 95, 96, 94, 90, 85, 78, 72, 65, 58, 45, 30]; // %

    // Forecast Risk Assessment Card
    const riskAssessment = {
      overallRisk: 'CRITICAL CONVECTIVE PLUME',
      floodProbabilityMax: 96,
      peakRainfallRate: '22.5 mm/hr at +45 mins',
      runOffIndex: 'Extreme (9.4 / 10)',
      soilSaturation: '98.5% (Field Capacity Exceeded)',
      drainageCapacity: 'Overflow imminent in low-lying corridors'
    };

    return res.json({
      success: true,
      city,
      hourly,
      threeDays,
      chartData: {
        labels: chartLabels,
        precipitationRate: precipitationValues,
        floodProbability: floodProbability
      },
      riskAssessment
    });
  } catch (err) {
    next(err);
  }
}

function getRadar(req, res, next) {
  try {
    const radarData = getRadarMetadata();
    return res.json({
      success: true,
      data: radarData
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWeather,
  getNowcast,
  getRadar
};
