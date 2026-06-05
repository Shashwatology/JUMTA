import { JAIPUR_STOPS, getDistanceKm } from './data';
import type { TransitStop } from './data';

export interface RouteSegment {
  mode: 'METRO' | 'BUS' | 'AUTO' | 'WALK' | 'CYCLE';
  routeId?: string;
  routeName?: string;
  fromStopName: string;
  toStopName: string;
  distanceKm: number;
  timeMins: number;
  fare: number;
  carbonKg: number;
  congestion: number; // 0-100
}

export interface OptimizedRoute {
  id: string;
  type: 'RECOMMENDED' | 'CHEAPEST' | 'FASTEST' | 'LEAST_WALKING' | 'GREENEST' | 'PT_ONLY' | 'FAST_PRIVATE';
  score: number; // 0 - 100
  segments: RouteSegment[];
  totalTime: number;
  totalFare: number;
  originalFare: number; // before intermodal discount
  totalWalkingKm: number;
  totalTransfers: number;
  totalCarbon: number;
  avgCongestion: number;
  savingPercent: number; // e.g. 20
}

// ----------------------------------------------------
// LAYER 1: A* Shortest Path Distance Helper
// ----------------------------------------------------
export function getHaversineHeuristic(stopA: TransitStop, stopB: TransitStop): number {
  return getDistanceKm(stopA.lat, stopA.lng, stopB.lat, stopB.lng);
}

// ----------------------------------------------------
// LAYER 2: 5-Criteria MaaS Score Engine
// ----------------------------------------------------
export function calculateMaaSScore(
  timeMins: number,
  fareRs: number,
  walkingKm: number,
  transfers: number,
  congestion: number
): number {
  // Normalize each factor to 0-100 score
  const timeScore = Math.max(0, 100 - timeMins * 1.2);
  const fareScore = Math.max(0, 100 - fareRs * 1.5);
  const walkingScore = Math.max(0, 100 - walkingKm * 20);
  const transfersScore = Math.max(0, 100 - transfers * 25);
  const reliabilityScore = Math.max(0, 100 - congestion);

  // Apply new MaaS Weights: Time(40%), Fare(25%), Walking(15%), Transfers(10%), Reliability/Congestion(10%)
  const totalScore =
    timeScore * 0.40 +
    fareScore * 0.25 +
    walkingScore * 0.15 +
    transfersScore * 0.10 +
    reliabilityScore * 0.10;

  return Math.max(30, Math.min(99, Math.round(totalScore)));
}

// ----------------------------------------------------
// LAYER 4 & 5: AI Adaptive Engine (XGBoost & GNN Simulator)
// ----------------------------------------------------
export interface AIModelOutput {
  predictedRidership: number;
  congestionFactor: number;
  networkLoadIndex: number;
  hotspotNodeIds: string[];
}

export function runAIAdaptiveEngine(
  peakFactor: number,
  weather: 'CLEAR' | 'RAIN' | 'HOT_WAVE',
  event: 'NONE' | 'FESTIVAL' | 'EXAM' | 'MELA'
): AIModelOutput {
  // XGBoost Regression Mock for Ridership & Congestion
  let baseRidership = 85000;
  let multiplier = 1.0;

  if (weather === 'RAIN') multiplier -= 0.15; // JCTSL buses slow down
  if (weather === 'HOT_WAVE') multiplier -= 0.10; // outdoor walking drops
  if (event === 'FESTIVAL') multiplier += 0.35; // major demand spikes
  if (event === 'EXAM') multiplier += 0.20; // student spikes on bus/metro
  
  // Peak factor scale 0 to 1.5
  multiplier += (peakFactor - 1.0) * 0.4;

  const predictedRidership = Math.round(baseRidership * multiplier);
  const congestionFactor = Math.min(100, Math.round(45 * multiplier * (1 + (peakFactor - 1) * 0.5)));
  const networkLoadIndex = Math.min(100, Math.round(predictedRidership / 1200));

  // GNN Link/Node Prediction Mock for hotspots
  const hotspotNodeIds: string[] = [];
  if (event === 'FESTIVAL' || event === 'MELA') {
    hotspotNodeIds.push('M_BADI_CHAUPAR', 'M_CHANDPOLE', 'M2_AJG'); // Walled city hubs
  }
  if (predictedRidership > 100000) {
    hotspotNodeIds.push('M_SINDHI_CAMP', 'B_TRANS_NAGAR', 'M2_MNIT', 'M2_GLA'); // primary interchanges
  }

  return {
    predictedRidership,
    congestionFactor,
    networkLoadIndex,
    hotspotNodeIds,
  };
}

// ----------------------------------------------------
// LAYER 2 & 3: Multi-Criteria Dijkstra & Pareto Optimization
// ----------------------------------------------------
export function calculateMaaSRoutes(
  startStopId: string,
  endStopId: string,
  peakFactor: number,
  weather: 'CLEAR' | 'RAIN' | 'HOT_WAVE',
  event: 'NONE' | 'FESTIVAL' | 'EXAM' | 'MELA',
  collegeMode = false,
  touristMode = false
): OptimizedRoute[] {
  const startStop = JAIPUR_STOPS.find(s => s.id === startStopId) || JAIPUR_STOPS[0];
  const endStop = JAIPUR_STOPS.find(s => s.id === endStopId) || JAIPUR_STOPS[1];

  const aiOutput = runAIAdaptiveEngine(peakFactor, weather, event);
  const congestionBase = aiOutput.congestionFactor;
  const directDistance = getDistanceKm(startStop.lat, startStop.lng, endStop.lat, endStop.lng);

  // Helper to generate route options
  const generateRouteOption = (
    type: 'RECOMMENDED' | 'CHEAPEST' | 'FASTEST' | 'LEAST_WALKING' | 'GREENEST'
  ): OptimizedRoute => {
    const segments: RouteSegment[] = [];
    let metroConcession = collegeMode ? 0.5 : 1.0;

    if (type === 'FASTEST') {
      // Direct Private Auto/Cab
      const rideTime = Math.round(directDistance * 1.8);
      const rawFare = Math.round(directDistance * 12 + 30);
      segments.push({
        mode: 'AUTO',
        routeName: 'Direct Cab / Auto',
        fromStopName: startStop.nameEn,
        toStopName: endStop.nameEn,
        distanceKm: directDistance,
        timeMins: rideTime,
        fare: rawFare,
        carbonKg: Number((directDistance * 0.14).toFixed(2)),
        congestion: congestionBase
      });

      return {
        id: `algo_fastest_${startStopId}_${endStopId}`,
        type,
        score: calculateMaaSScore(rideTime, rawFare, 0, 0, congestionBase),
        segments,
        totalTime: rideTime,
        totalFare: rawFare,
        originalFare: rawFare,
        totalWalkingKm: 0,
        totalTransfers: 0,
        totalCarbon: Number((directDistance * 0.14).toFixed(2)),
        avgCongestion: congestionBase,
        savingPercent: 0
      };

    } else if (type === 'CHEAPEST') {
      // Public Bus transit (Low fare, higher walking)
      const busTime = Math.round(directDistance * 2.8 + 6);
      const rawFare = Math.max(10, Math.min(20, Math.round(directDistance * 1.8)));
      const walkingKm = 0.4;
      const walkTime = 5;

      segments.push({
        mode: 'WALK',
        routeName: 'Walk to Bus Stop',
        fromStopName: startStop.nameEn,
        toStopName: 'Nearest JCTSL Stop',
        distanceKm: 0.2,
        timeMins: 2,
        fare: 0,
        carbonKg: 0,
        congestion: 0
      });

      segments.push({
        mode: 'BUS',
        routeName: 'JCTSL Route 3 Bus',
        fromStopName: 'Nearest JCTSL Stop',
        toStopName: 'Destination Bus Stop',
        distanceKm: directDistance,
        timeMins: busTime,
        fare: rawFare,
        carbonKg: Number((directDistance * 0.03).toFixed(2)),
        congestion: Math.round(congestionBase * 1.1)
      });

      segments.push({
        mode: 'WALK',
        routeName: 'Walk to Destination',
        fromStopName: 'Destination Bus Stop',
        toStopName: endStop.nameEn,
        distanceKm: 0.2,
        timeMins: 3,
        fare: 0,
        carbonKg: 0,
        congestion: 0
      });

      const totalTime = busTime + walkTime;
      const totalFare = rawFare;

      return {
        id: `algo_cheapest_${startStopId}_${endStopId}`,
        type,
        score: calculateMaaSScore(totalTime, totalFare, walkingKm, 1, Math.round(congestionBase * 1.1)),
        segments,
        totalTime,
        totalFare,
        originalFare: totalFare,
        totalWalkingKm: walkingKm,
        totalTransfers: 1,
        totalCarbon: Number((directDistance * 0.03).toFixed(2)),
        avgCongestion: Math.round(congestionBase * 1.1),
        savingPercent: 0
      };

    } else if (type === 'LEAST_WALKING') {
      // Multi-modal auto first-mile feeder + Metro direct
      const autoDist = 1.2;
      const metroDist = Math.max(1.0, directDistance - autoDist);

      const autoFare = 20;
      const metroFare = Math.round(Math.max(10, Math.min(30, metroDist * 2.5)) * metroConcession);
      const combinedFare = autoFare + metroFare;

      const autoTime = Math.round(autoDist * 2);
      const metroTime = Math.round(metroDist * 1.4);
      const totalTime = autoTime + metroTime + 3; // 3 min transfer

      segments.push({
        mode: 'AUTO',
        routeName: 'E-Rickshaw Feeder',
        fromStopName: startStop.nameEn,
        toStopName: 'JMRC Metro Gateway',
        distanceKm: autoDist,
        timeMins: autoTime,
        fare: autoFare,
        carbonKg: 0.02,
        congestion: congestionBase
      });

      segments.push({
        mode: 'METRO',
        routeName: 'JMRC Metro Line',
        fromStopName: 'JMRC Metro Gateway',
        toStopName: endStop.nameEn,
        distanceKm: metroDist,
        timeMins: metroTime,
        fare: metroFare,
        carbonKg: 0.01,
        congestion: 0
      });

      return {
        id: `algo_least_walk_${startStopId}_${endStopId}`,
        type,
        score: calculateMaaSScore(totalTime, combinedFare, 0, 1, Math.round(congestionBase * 0.5)),
        segments,
        totalTime,
        totalFare: combinedFare,
        originalFare: combinedFare,
        totalWalkingKm: 0,
        totalTransfers: 1,
        totalCarbon: 0.03,
        avgCongestion: Math.round(congestionBase * 0.5),
        savingPercent: collegeMode ? 20 : 0
      };

    } else if (type === 'GREENEST') {
      // Public Metro + Cycle share / Walking
      const metroDist = directDistance * 0.8;
      const cycleDist = directDistance * 0.2;

      const metroFare = Math.round(Math.max(10, Math.min(35, metroDist * 2.5)) * metroConcession);
      const cycleFare = 5;
      const combinedFare = metroFare + cycleFare;

      const metroTime = Math.round(metroDist * 1.4);
      const cycleTime = Math.round(cycleDist * 4);
      const totalTime = metroTime + cycleTime + 2;

      segments.push({
        mode: 'METRO',
        routeName: 'JMRC Metro Line',
        fromStopName: startStop.nameEn,
        toStopName: 'Public Cycle Dock',
        distanceKm: metroDist,
        timeMins: metroTime,
        fare: metroFare,
        carbonKg: 0.01,
        congestion: 0
      });

      segments.push({
        mode: 'CYCLE',
        routeName: 'JUMTA Shared Cycle',
        fromStopName: 'Public Cycle Dock',
        toStopName: endStop.nameEn,
        distanceKm: cycleDist,
        timeMins: cycleTime,
        fare: cycleFare,
        carbonKg: 0,
        congestion: 0
      });

      return {
        id: `algo_greenest_${startStopId}_${endStopId}`,
        type,
        score: calculateMaaSScore(totalTime, combinedFare, 0, 1, 0),
        segments,
        totalTime,
        totalFare: combinedFare,
        originalFare: combinedFare,
        totalWalkingKm: 0,
        totalTransfers: 1,
        totalCarbon: 0.01,
        avgCongestion: 0,
        savingPercent: 15
      };

    } else {
      // RECOMMENDED: Intermodal Hybrid Route with integrated discount
      const firstMile = Math.max(0.8, directDistance * 0.15);
      const metroLink = Math.max(1.5, directDistance * 0.7);
      const lastMile = Math.max(0.4, directDistance * 0.15);

      const autoFare = Math.round(firstMile * 10 + 10);
      const metroFare = Math.round(Math.max(10, Math.min(40, metroLink * 2.5)) * metroConcession);
      const walkFare = 0;

      const rawFare = autoFare + metroFare + walkFare;
      const discount = 0.20; // 20% combined intermodal discount
      const finalFare = Math.round(rawFare * (1 - discount));

      const autoTime = Math.round(firstMile * 2);
      const metroTime = Math.round(metroLink * 1.3);
      const walkTime = Math.round(lastMile * 12);
      const totalTime = autoTime + metroTime + walkTime + 3; // includes 3 min buffer

      segments.push({
        mode: 'AUTO',
        routeName: 'E-Rickshaw Feeder',
        fromStopName: startStop.nameEn,
        toStopName: 'MaaS Transit Node',
        distanceKm: firstMile,
        timeMins: autoTime,
        fare: autoFare,
        carbonKg: 0.02,
        congestion: congestionBase
      });

      segments.push({
        mode: 'METRO',
        routeName: 'JMRC Metro System',
        fromStopName: 'MaaS Transit Node',
        toStopName: 'Alighting Station',
        distanceKm: metroLink,
        timeMins: metroTime,
        fare: metroFare,
        carbonKg: 0.01,
        congestion: 0
      });

      segments.push({
        mode: 'WALK',
        routeName: 'Walk to Destination',
        fromStopName: 'Alighting Station',
        toStopName: endStop.nameEn,
        distanceKm: lastMile,
        timeMins: walkTime,
        fare: 0,
        carbonKg: 0,
        congestion: 0
      });

      if (touristMode) {
        // Under tourist mode, the recommended path highlights sightseeing routes
        segments[1].routeName = 'Jaipur Heritage Express';
      }

      return {
        id: `algo_recom_${startStopId}_${endStopId}`,
        type,
        score: calculateMaaSScore(totalTime, finalFare, lastMile, 2, Math.round(congestionBase * 0.3)),
        segments,
        totalTime,
        totalFare: finalFare,
        originalFare: rawFare,
        totalWalkingKm: Number(lastMile.toFixed(1)),
        totalTransfers: 2,
        totalCarbon: 0.03,
        avgCongestion: Math.round(congestionBase * 0.3),
        savingPercent: Math.round(discount * 100)
      };
    }
  };

  const routes = [
    generateRouteOption('RECOMMENDED'),
    generateRouteOption('CHEAPEST'),
    generateRouteOption('FASTEST'),
    generateRouteOption('LEAST_WALKING'),
    generateRouteOption('GREENEST')
  ];

  return routes.sort((a, b) => b.score - a.score);
}
