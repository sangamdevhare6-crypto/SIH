// GeoJSON geometries and telemetry for rivers, flood risk zones, shelters, and routes

const RIVER_DATA = [
  {
    name: 'Godavari',
    basin: 'Godavari River Basin (Maharashtra / AP)',
    currentLevel: 463.8,
    dangerMark: 464.0,
    warningLevel: 462.5,
    unit: 'm MSL',
    status: 'High Surge (Discharging)',
    dischargeRate: '48,500 cusecs',
    riskLevel: 'Very High',
    trend: 'Rising (+0.12 m/hr)',
    coordinates: [
      [19.9975, 73.7898], // Nashik
      [19.8762, 75.3433], // CS Kham tributary
      [19.4934, 75.3789], // Paithan Jayakwadi
      [19.1500, 77.3000], // Nanded
      [18.9000, 78.5000]  // Telangana border
    ]
  },
  {
    name: 'Krishna',
    basin: 'Krishna River Basin (Mahabaleshwar - Sangli)',
    currentLevel: 538.2,
    dangerMark: 540.0,
    warningLevel: 536.0,
    unit: 'm MSL',
    status: 'Elevated Flow',
    dischargeRate: '32,100 cusecs',
    riskLevel: 'Moderate',
    trend: 'Stable',
    coordinates: [
      [17.9237, 73.6586], // Mahabaleshwar
      [17.2777, 74.1844], // Karad
      [16.8524, 74.5815]  // Sangli
    ]
  },
  {
    name: 'Narmada',
    basin: 'Narmada Valley (Sardar Sarovar Reservoir)',
    currentLevel: 138.4,
    dangerMark: 138.68,
    warningLevel: 135.0,
    unit: 'm MSL',
    status: 'Near Full Capacity',
    dischargeRate: '65,000 cusecs',
    riskLevel: 'High',
    trend: 'Rising (+0.05 m/hr)',
    coordinates: [
      [21.8333, 74.0000],
      [21.8250, 73.7500],
      [21.6500, 73.0000]
    ]
  },
  {
    name: 'Brahmaputra',
    basin: 'Brahmaputra River Corridor (Assam Valley)',
    currentLevel: 105.7,
    dangerMark: 106.0,
    warningLevel: 104.5,
    unit: 'm MSL',
    status: 'Critical Monsoon Spate',
    dischargeRate: '185,000 cusecs',
    riskLevel: 'Very High',
    trend: 'Surging',
    coordinates: [
      [26.1445, 91.7362], // Guwahati
      [26.7500, 92.8000], // Tezpur
      [27.4728, 94.9120]  // Dibrugarh
    ]
  }
];

const FLOOD_RISK_ZONES = [
  {
    id: 'zone_kham_red',
    name: 'Kham River Lowland Inundation Zone',
    riskLevel: 'Very High',
    color: '#FF3366',
    fillColor: 'rgba(255, 51, 102, 0.45)',
    polygon: [
      [19.8880, 75.3250],
      [19.8920, 75.3380],
      [19.8810, 75.3490],
      [19.8690, 75.3420],
      [19.8740, 75.3280]
    ],
    details: 'Depth up to 1.8 meters. High risk of submerged roadways and electrical hazards.'
  },
  {
    id: 'zone_paithan_orange',
    name: 'Paithan Downstream Flood Plain',
    riskLevel: 'High',
    color: '#FFB020',
    fillColor: 'rgba(255, 176, 32, 0.35)',
    polygon: [
      [19.5050, 75.3650],
      [19.5120, 75.3950],
      [19.4800, 75.4050],
      [19.4750, 75.3720]
    ],
    details: 'Spillway release buffer zone. Agricultural lowland inundation active.'
  },
  {
    id: 'zone_cidco_yellow',
    name: 'Cidco Sector Drainage Overflow Basin',
    riskLevel: 'Moderate',
    color: '#00F5FF',
    fillColor: 'rgba(0, 245, 255, 0.25)',
    polygon: [
      [19.8780, 75.3550],
      [19.8850, 75.3750],
      [19.8680, 75.3850],
      [19.8620, 75.3620]
    ],
    details: 'Water accumulation in underpasses and basement parking facilities.'
  }
];

const SHELTERS = [
  {
    id: 'sh_01',
    name: 'Divisional Sports Complex Evacuation Center',
    address: 'Garkheda, Chhatrapati Sambhajinagar',
    lat: 19.8654,
    lng: 75.3521,
    capacity: 2500,
    currentOccupancy: 420,
    status: 'Open',
    supplies: 'Medical Bay, Food Pantry, Clean Water, Sump Backup',
    phone: '+91 240 2334455'
  },
  {
    id: 'sh_02',
    name: 'Cidco Community Hall Safe Hub',
    address: 'N-2 Sector, Cidco',
    lat: 19.8732,
    lng: 75.3621,
    capacity: 1200,
    currentOccupancy: 180,
    status: 'Open',
    supplies: 'First Aid, Dry Rations, Emergency Power Generator',
    phone: '+91 240 2488990'
  },
  {
    id: 'sh_03',
    name: 'Dr. Babasaheb Ambedkar Marathwada University Auditorium',
    address: 'University Campus, CS',
    lat: 19.9015,
    lng: 75.3122,
    capacity: 3500,
    currentOccupancy: 950,
    status: 'Open',
    supplies: 'Dedicated Pediatric Ward, 100kW Generator, High Elevation Refuge',
    phone: '+91 240 2403200'
  }
];

module.exports = {
  RIVER_DATA,
  FLOOD_RISK_ZONES,
  SHELTERS
};
