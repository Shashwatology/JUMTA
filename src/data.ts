export interface TransitStop {
  id: string;
  nameEn: string;
  nameHi: string;
  lat: number;
  lng: number;
  type: 'METRO' | 'BUS' | 'BRTS' | 'AUTO';
  isInterchange: boolean;
  routes: string[];
}

export interface TransitRoute {
  id: string;
  name: string;
  type: 'METRO' | 'BUS' | 'BRTS';
  color: string;
  stops: string[]; // Order of stop IDs
}

// Coordinate baseline: Jaipur Center (Ajmeri Gate)
// lat: 26.9124, lng: 75.8144

export const JAIPUR_STOPS: TransitStop[] = [
  // Metro Pink Line (Phase 1)
  { id: 'M_MANSAROVAR', nameEn: 'Mansarovar Metro', nameHi: 'मानसरोवर मेट्रो', lat: 26.8770, lng: 75.7540, type: 'METRO', isInterchange: true, routes: ['METRO_PINK', 'R_3'] },
  { id: 'M_NEW_ATISH', nameEn: 'New Aatish Market', nameHi: 'नया आतिश मार्केट', lat: 26.8830, lng: 75.7660, type: 'METRO', isInterchange: false, routes: ['METRO_PINK'] },
  { id: 'M_VIVEK_VIHAR', nameEn: 'Vivek Vihar', nameHi: 'विवेक विहार', lat: 26.8890, lng: 75.7760, type: 'METRO', isInterchange: false, routes: ['METRO_PINK'] },
  { id: 'M_SHYAM_NAGAR', nameEn: 'Shyam Nagar', nameHi: 'श्याम नगर', lat: 26.8960, lng: 75.7830, type: 'METRO', isInterchange: false, routes: ['METRO_PINK'] },
  { id: 'M_RAM_NAGAR', nameEn: 'Ram Nagar', nameHi: 'राम नगर', lat: 26.9010, lng: 75.7910, type: 'METRO', isInterchange: false, routes: ['METRO_PINK'] },
  { id: 'M_CIVIL_LINES', nameEn: 'Civil Lines', nameHi: 'सिविल लाइन्स', lat: 26.9080, lng: 75.7970, type: 'METRO', isInterchange: false, routes: ['METRO_PINK'] },
  { id: 'M_RAILWAY', nameEn: 'Railway Station', nameHi: 'रेलवे स्टेशन', lat: 26.9180, lng: 75.7930, type: 'METRO', isInterchange: true, routes: ['METRO_PINK', 'R_3', 'R_14'] },
  { id: 'M_SINDHI_CAMP', nameEn: 'Sindhi Camp', nameHi: 'सिंधी कैंप', lat: 26.9240, lng: 75.8020, type: 'METRO', isInterchange: true, routes: ['METRO_PINK', 'R_3', 'R_14', 'R_15', 'R_16'] },
  { id: 'M_CHANDPOLE', nameEn: 'Chandpole', nameHi: 'चांदपोल', lat: 26.9260, lng: 75.8110, type: 'METRO', isInterchange: true, routes: ['METRO_PINK', 'R_15', 'R_16'] },
  { id: 'M_CHOTI_CHAUPAR', nameEn: 'Chhoti Chaupar', nameHi: 'छोटी चौपड़', lat: 26.9265, lng: 75.8205, type: 'METRO', isInterchange: false, routes: ['METRO_PINK'] },
  { id: 'M_BADI_CHAUPAR', nameEn: 'Badi Chaupar', nameHi: 'बड़ी चौपड़', lat: 26.9270, lng: 75.8310, type: 'METRO', isInterchange: true, routes: ['METRO_PINK', 'R_3', 'R_11'] },

  // Proposed Metro Phase 2 Corridor (Prahladpura -> Todi Mod)
  { id: 'M2_PRAHLADPURA', nameEn: 'Prahladpura', nameHi: 'प्रह्लादपुरा', lat: 26.7640, lng: 75.8450, type: 'METRO', isInterchange: false, routes: ['METRO_ORANGE'] },
  { id: 'M2_GONER_MOD', nameEn: 'Goner Mod', nameHi: 'गोनेर मोड़', lat: 26.7820, lng: 75.8500, type: 'METRO', isInterchange: false, routes: ['METRO_ORANGE'] },
  { id: 'M2_SITAPURA', nameEn: 'Sitapura Industrial Area', nameHi: 'सीतापुरा औद्योगिक क्षेत्र', lat: 26.7970, lng: 75.8550, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_AC1', 'R_AC2'] },
  { id: 'M2_JECC', nameEn: 'JECC Exhibition Centre', nameHi: 'जेईसीसी केंद्र', lat: 26.8040, lng: 75.8580, type: 'METRO', isInterchange: false, routes: ['METRO_ORANGE'] },
  { id: 'M2_HALDIGHATI', nameEn: 'Haldighati Gate', nameHi: 'हल्दीघाटी गेट', lat: 26.8150, lng: 75.8540, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_AC1', 'R_AC2'] },
  { id: 'M2_SANGANER_PS', nameEn: 'Sanganer Police Station', nameHi: 'सांगानेर थाना', lat: 26.8240, lng: 75.8420, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_AC1'] },
  { id: 'M2_SANGANER', nameEn: 'Sanganer Town', nameHi: 'सांगानेर टाउन', lat: 26.8280, lng: 75.8320, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_AC1'] },
  { id: 'M2_B2_BYPASS', nameEn: 'B2 Bypass Circle', nameHi: 'बी2 बाईपास चौराहा', lat: 26.8430, lng: 75.8150, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_AC1', 'R_AC2', 'R_3'] },
  { id: 'M2_DURGAPURA', nameEn: 'Durgapura Rail Station', nameHi: 'दुर्गापुरा रेलवे स्टेशन', lat: 26.8520, lng: 75.8120, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_3', 'R_AC1', 'R_AC2'] },
  { id: 'M2_GOPALPURA', nameEn: 'Gopalpura Flyover', nameHi: 'गोपालपुरा फ्लाईओवर', lat: 26.8640, lng: 75.8090, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_3', 'R_AC1', 'R_AC2'] },
  { id: 'M2_MNIT', nameEn: 'MNIT Campus', nameHi: 'एमएनआईटी परिसर', lat: 26.8662, lng: 75.8079, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_3', 'R_AC1', 'R_AC2'] },
  { id: 'M2_GLA', nameEn: 'Tonk Phatak (GLA)', nameHi: 'टोंक फाटक (जीएलए)', lat: 26.8780, lng: 75.8060, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_3', 'R_AC1', 'R_AC2'] },
  { id: 'M2_NEHRU_PLACE', nameEn: 'Nehru Place', nameHi: 'नेहरू प्लेस', lat: 26.8910, lng: 75.8090, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_3', 'R_AC1'] },
  { id: 'M2_RBC', nameEn: 'Rambagh Circle', nameHi: 'रामबाग सर्किल', lat: 26.8980, lng: 75.8080, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_3', 'R_AC1', 'R_AC2'] },
  { id: 'M2_NSCIR', nameEn: 'Narayan Singh Circle', nameHi: 'नारायण सिंह सर्किल', lat: 26.9030, lng: 75.8120, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_3', 'R_AC1', 'R_AC2', 'R_7'] },
  { id: 'M2_AJG', nameEn: 'Ajmeri Gate', nameHi: 'अजमेरी गेट', lat: 26.9124, lng: 75.8144, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_3', 'R_7', 'R_11'] },
  { id: 'M2_KHASA_KOTHI', nameEn: 'Khasa Kothi Circle', nameHi: 'खासा कोठी चौराहा', lat: 26.9200, lng: 75.7980, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'METRO_PINK', 'R_14', 'R_15'] },
  { id: 'M2_COLLECTORATE', nameEn: 'Collectorate Circle', nameHi: 'कलेक्ट्रेट सर्किल', lat: 26.9280, lng: 75.7950, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_14'] },
  { id: 'M2_VIDHYADHAR', nameEn: 'Vidhyadhar Nagar', nameHi: 'विद्याधर नगर', lat: 26.9580, lng: 75.7860, type: 'METRO', isInterchange: true, routes: ['METRO_ORANGE', 'R_16'] },
  { id: 'M2_TODI_MOD', nameEn: 'Todi Mod Terminus', nameHi: 'टोडी मोड़ टर्मिनस', lat: 27.0250, lng: 75.7720, type: 'METRO', isInterchange: false, routes: ['METRO_ORANGE'] },

  // Key JCTSL Bus Stops
  { id: 'B_KUKAS', nameEn: 'Kukas Hub', nameHi: 'कुकस हब', lat: 27.0350, lng: 75.8920, type: 'BUS', isInterchange: false, routes: ['R_AC1'] },
  { id: 'B_GOBINDPURA', nameEn: 'Gobindpura', nameHi: 'गोविंदपुरा', lat: 26.9150, lng: 75.6980, type: 'BUS', isInterchange: false, routes: ['R_AC2'] },
  { id: 'B_MGH', nameEn: 'Mahatma Gandhi Hospital', nameHi: 'महात्मा गांधी अस्पताल', lat: 26.7810, lng: 75.8650, type: 'BUS', isInterchange: false, routes: ['R_AC2'] },
  { id: 'B_TRANS_NAGAR', nameEn: 'Transport Nagar', nameHi: 'ट्रांसपोर्ट नगर', lat: 26.9060, lng: 75.8520, type: 'BUS', isInterchange: true, routes: ['R_3', 'R_7', 'R_11'] },
  { id: 'B_SANGANER_RLY', nameEn: 'Sanganer Railway Station', nameHi: 'सांगानेर रेलवे स्टेशन', lat: 26.8120, lng: 75.8110, type: 'BUS', isInterchange: false, routes: ['R_3'] },
];

export const TRANSIT_ROUTES: TransitRoute[] = [
  {
    id: 'METRO_PINK',
    name: 'Jaipur Metro Pink Line',
    type: 'METRO',
    color: '#E07A5F', // Heritage Pink
    stops: [
      'M_MANSAROVAR', 'M_NEW_ATISH', 'M_VIVEK_VIHAR', 'M_SHYAM_NAGAR',
      'M_RAM_NAGAR', 'M_CIVIL_LINES', 'M_RAILWAY', 'M_SINDHI_CAMP',
      'M_CHANDPOLE', 'M_CHOTI_CHAUPAR', 'M_BADI_CHAUPAR'
    ]
  },
  {
    id: 'METRO_ORANGE',
    name: 'Proposed Metro Orange Line (Ph 2)',
    type: 'METRO',
    color: '#185FA5', // JMRC Blue
    stops: [
      'M2_PRAHLADPURA', 'M2_GONER_MOD', 'M2_SITAPURA', 'M2_JECC',
      'M2_HALDIGHATI', 'M2_SANGANER_PS', 'M2_SANGANER', 'M2_B2_BYPASS',
      'M2_DURGAPURA', 'M2_GOPALPURA', 'M2_MNIT', 'M2_GLA',
      'M2_NEHRU_PLACE', 'M2_RBC', 'M2_NSCIR', 'M2_AJG',
      'M2_KHASA_KOTHI', 'M2_COLLECTORATE', 'M2_VIDHYADHAR', 'M2_TODI_MOD'
    ]
  },
  {
    id: 'R_3',
    name: 'Bus Route 3: Mansarovar ↔ Transport Nagar',
    type: 'BUS',
    color: '#1D9E75', // JCTSL Teal
    stops: [
      'M_MANSAROVAR', 'M2_B2_BYPASS', 'M2_DURGAPURA', 'M2_GOPALPURA',
      'M2_MNIT', 'M2_GLA', 'M2_NEHRU_PLACE', 'M2_RBC',
      'M2_NSCIR', 'M2_AJG', 'M_RAILWAY', 'M_SINDHI_CAMP',
      'M_BADI_CHAUPAR', 'B_TRANS_NAGAR'
    ]
  },
  {
    id: 'R_7',
    name: 'Bus Route 7: Transport Nagar ↔ Ajmeri Gate',
    type: 'BUS',
    color: '#1D9E75',
    stops: ['B_TRANS_NAGAR', 'M2_NSCIR', 'M2_AJG']
  },
  {
    id: 'R_11',
    name: 'Bus Route 11: Badi Chaupar ↔ Transport Nagar',
    type: 'BUS',
    color: '#1D9E75',
    stops: ['M_BADI_CHAUPAR', 'M2_AJG', 'B_TRANS_NAGAR']
  },
  {
    id: 'R_14',
    name: 'Bus Route 14: Railway ↔ Vidhyadhar Nagar',
    type: 'BUS',
    color: '#1D9E75',
    stops: ['M_RAILWAY', 'M2_KHASA_KOTHI', 'M2_COLLECTORATE', 'M2_VIDHYADHAR']
  },
  {
    id: 'R_AC1',
    name: 'AC Route 1: Kukas ↔ Sanganer',
    type: 'BUS',
    color: '#0D684D', // Darker Teal
    stops: [
      'B_KUKAS', 'M2_VIDHYADHAR', 'M_SINDHI_CAMP', 'M2_AJG',
      'M2_NSCIR', 'M2_RBC', 'M2_GLA', 'M2_MNIT',
      'M2_GOPALPURA', 'M2_DURGAPURA', 'M2_B2_BYPASS', 'M2_SANGANER',
      'M2_SANGANER_PS', 'M2_HALDIGHATI', 'M2_SITAPURA'
    ]
  },
  {
    id: 'R_AC2',
    name: 'AC Route 2: Gobindpura ↔ MGH',
    type: 'BUS',
    color: '#0D684D',
    stops: [
      'B_GOBINDPURA', 'M_MANSAROVAR', 'M_RAILWAY', 'M_SINDHI_CAMP',
      'M2_AJG', 'M2_RBC', 'M2_GLA', 'M2_MNIT',
      'M2_DURGAPURA', 'M2_B2_BYPASS', 'M2_HALDIGHATI', 'M2_SITAPURA',
      'B_MGH'
    ]
  }
];

// Historical statistics for AI models
export const JAIPUR_HISTORICAL_RIDERSHIP = [
  { time: '06:00', jmrcRiders: 1800, jctslRiders: 2500, congestion: 12 },
  { time: '08:00', jmrcRiders: 9200, jctslRiders: 14500, congestion: 54 },
  { time: '09:00', jmrcRiders: 14500, jctslRiders: 22000, congestion: 88 },
  { time: '10:00', jmrcRiders: 12000, jctslRiders: 19000, congestion: 78 },
  { time: '12:00', jmrcRiders: 5500, jctslRiders: 9500, congestion: 35 },
  { time: '15:00', jmrcRiders: 6200, jctslRiders: 10800, congestion: 40 },
  { time: '17:00', jmrcRiders: 13500, jctslRiders: 21500, congestion: 82 },
  { time: '18:00', jmrcRiders: 16000, jctslRiders: 26000, congestion: 95 },
  { time: '20:00', jmrcRiders: 9500, jctslRiders: 15500, congestion: 68 },
  { time: '22:00', jmrcRiders: 2500, jctslRiders: 3800, congestion: 20 },
];

export const JAIPUR_INCIDENTS = [
  { id: 'inc_1', title: 'Water Logging at Walled City (Chandpole)', type: 'ALERT', severity: 'HIGH', stopId: 'M_CHANDPOLE', desc: 'Slight delay in JCTSL Route 15 & 16 due to pre-monsoon showers.' },
  { id: 'inc_2', title: 'Congestion on Tonk Road near MNIT', type: 'TRAFFIC', severity: 'MEDIUM', stopId: 'M2_MNIT', desc: 'Slow moving traffic due to construction of flyover extension. Delay 12 mins.' },
  { id: 'inc_3', title: 'Metro Gate 2 Escalator Outage at Sindhi Camp', type: 'MAINTENANCE', severity: 'LOW', stopId: 'M_SINDHI_CAMP', desc: 'Scheduled replacement of belt mechanism. Directing passengers to Gate 1.' }
];

export const CORRIDOR_PERFORMANCE_METRICS = [
  { name: 'Tonk Road Corridor', ridership: 48500, delay: '3.4m', efficiency: 91, speed: '24 km/h' },
  { name: 'Pink Line Metro', ridership: 85200, delay: '0.1m', efficiency: 99, speed: '42 km/h' },
  { name: 'Sikar Road Corridor', ridership: 28000, delay: '8.2m', efficiency: 74, speed: '16 km/h' },
  { name: 'Ajmer Road Corridor', ridership: 31000, delay: '5.6m', efficiency: 82, speed: '19 km/h' },
  { name: 'BRTS North-South', ridership: 22000, delay: '1.2m', efficiency: 95, speed: '28 km/h' }
];

// Helper to calculate distance between coordinates (Haversine formula)
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}
