import { JAIPUR_STOPS, getDistanceKm } from './data';
import type { TransitStop } from './data';

export interface RouteSegment {
  mode: 'METRO' | 'BUS' | 'AUTO' | 'WALK';
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
  type: 'RECOMMENDED' | 'PT_ONLY' | 'FAST_PRIVATE';
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
  event: 'NONE' | 'FESTIVAL' | 'EXAM' | 'MELA'
): OptimizedRoute[] {
  const startStop = JAIPUR_STOPS.find(s => s.id === startStopId) || JAIPUR_STOPS[0];
  const endStop = JAIPUR_STOPS.find(s => s.id === endStopId) || JAIPUR_STOPS[1];

  const aiOutput = runAIAdaptiveEngine(peakFactor, weather, event);
  const congestionBase = aiOutput.congestionFactor;

  // Let's generate a list of routes simulating the multi-criteria frontier.
  // In a real system, this is computed over the full intermodal network graph using RAPTOR or Multi-Criteria Dijkstra.
  // Here we dynamically construct valid Pareto routes based on coordinate checks and routes.

  const directDistance = getDistanceKm(startStop.lat, startStop.lng, endStop.lat, endStop.lng);

  // Helper to generate route options
  const generateRouteOption = (
    type: 'RECOMMENDED' | 'PT_ONLY' | 'FAST_PRIVATE'
  ): OptimizedRoute => {
    const segments: RouteSegment[] = [];

    // Let's compute segments
    if (type === 'PT_ONLY') {
      // Public Transport heavy (Metro + Bus)
      // Segment 1: Walk to nearest transit (or direct if already transit)
      const transitDistance = directDistance;
      const busTime = Math.round(transitDistance * 2.5 + 4);
      const fareBus = Math.max(10, Math.min(25, Math.round(transitDistance * 2.2)));

      segments.push({
        mode: 'BUS',
        routeName: 'JCTSL Route 3',
        fromStopName: startStop.nameEn,
        toStopName: endStop.nameEn,
        distanceKm: transitDistance,
        timeMins: busTime,
        fare: fareBus,
        carbonKg: Number((transitDistance * 0.04).toFixed(2)),
        congestion: Math.min(100, Math.round(congestionBase * 1.1)),
      });

      const totalTime = segments.reduce((sum, s) => sum + s.timeMins, 0);
      const totalFare = segments.reduce((sum, s) => sum + s.fare, 0);
      const totalCarbon = segments.reduce((sum, s) => sum + s.carbonKg, 0);

      // MaaS Score weights: Fare(25%), Time(30%), Transfers(15%), Walking(10%), Carbon(10%), Congestion(10%)
      const score = Math.round(
        (100 - (totalFare * 1.5)) * 0.25 +
        (100 - (totalTime * 1.2)) * 0.30 +
        (100) * 0.15 + // 0 transfers
        (100) * 0.10 + // 0 walking
        (100) * 0.10 + // Low carbon
        (100 - congestionBase) * 0.10
      );

      return {
        id: `route_pt_${startStopId}_${endStopId}`,
        type,
        score: Math.max(40, Math.min(98, score)),
        segments,
        totalTime,
        totalFare,
        originalFare: totalFare,
        totalWalkingKm: 0,
        totalTransfers: 0,
        totalCarbon: Number(totalCarbon.toFixed(2)),
        avgCongestion: Math.round(congestionBase * 1.1),
        savingPercent: 0,
      };

    } else if (type === 'FAST_PRIVATE') {
      // Auto / Taxi Heavy (Rapido/Ola/Uber)
      const rideTime = Math.round(directDistance * 2.0);
      const fareRide = Math.round(directDistance * 10 + 25); // meter rate ₹25 base + ₹10/km

      segments.push({
        mode: 'AUTO',
        routeName: 'Auto / Ride-Hailing',
        fromStopName: startStop.nameEn,
        toStopName: endStop.nameEn,
        distanceKm: directDistance,
        timeMins: rideTime,
        fare: fareRide,
        carbonKg: Number((directDistance * 0.15).toFixed(2)), // Higher footprint
        congestion: congestionBase,
      });

      const score = Math.round(
        (100 - (fareRide * 0.5)) * 0.25 +
        (100 - (rideTime * 0.8)) * 0.30 +
        (100) * 0.15 +
        (100) * 0.10 +
        (30) * 0.10 + // High carbon penalty
        (100 - congestionBase) * 0.10
      );

      return {
        id: `route_priv_${startStopId}_${endStopId}`,
        type,
        score: Math.max(30, Math.min(95, score)),
        segments,
        totalTime: rideTime,
        totalFare: fareRide,
        originalFare: fareRide,
        totalWalkingKm: 0,
        totalTransfers: 0,
        totalCarbon: Number((directDistance * 0.15).toFixed(2)),
        avgCongestion: congestionBase,
        savingPercent: 0,
      };

    } else {
      // RECOMMENDED: Intermodal Hybrid Route (e.g. Auto first-mile + Metro + Walking last-mile)
      // Demonstrates Layer 5 Dynamic Integrated Fare and multi-modal routing logic
      const firstMileDist = Math.max(1.0, directDistance * 0.2);
      const metroDist = Math.max(2.0, directDistance * 0.65);
      const lastMileDist = Math.max(0.5, directDistance * 0.15);

      const segment1Time = Math.round(firstMileDist * 2.2);
      const segment2Time = Math.round(metroDist * 1.5);
      const segment3Time = Math.round(lastMileDist * 12); // walking: 12 min per km

      const fareAuto = Math.round(firstMileDist * 10 + 15);
      const fareMetro = Math.max(10, Math.min(40, Math.round(metroDist * 2.5)));
      
      const rawFare = fareAuto + fareMetro;
      
      // Dynamic Fare Engine integration: Apply 20% discount on combined ticket!
      const discount = 0.20; 
      const finalFare = Math.round(rawFare * (1 - discount));

      segments.push({
        mode: 'AUTO',
        routeName: 'E-Rickshaw Feeder',
        fromStopName: startStop.nameEn,
        toStopName: 'Metro Transit Point',
        distanceKm: firstMileDist,
        timeMins: segment1Time,
        fare: fareAuto,
        carbonKg: Number((firstMileDist * 0.03).toFixed(2)), // Clean EV
        congestion: congestionBase,
      });

      segments.push({
        mode: 'METRO',
        routeName: 'Metro Orange Line',
        fromStopName: 'Metro Transit Point',
        toStopName: 'Metro Alighting Point',
        distanceKm: metroDist,
        timeMins: segment2Time,
        fare: fareMetro,
        carbonKg: Number((metroDist * 0.01).toFixed(2)), // ultra-low carbon
        congestion: 10, // Metro is traffic-free
      });

      segments.push({
        mode: 'WALK',
        routeName: 'Walking Route',
        fromStopName: 'Metro Alighting Point',
        toStopName: endStop.nameEn,
        distanceKm: lastMileDist,
        timeMins: segment3Time,
        fare: 0,
        carbonKg: 0,
        congestion: 0,
      });

      const totalTime = segment1Time + segment2Time + segment3Time + 4; // 4 mins transfer buffer
      const totalCarbon = segments.reduce((sum, s) => sum + s.carbonKg, 0);

      const score = Math.round(
        (100 - (finalFare * 1.2)) * 0.25 +
        (100 - (totalTime * 0.9)) * 0.30 +
        (100 - 15) * 0.15 + // 1 transfer penalty
        (100 - lastMileDist * 20) * 0.10 + // walking penalty
        (95) * 0.10 + // Good carbon index
        (100 - congestionBase * 0.3) * 0.10 // avoid gridlock since on metro
      );

      return {
        id: `route_recom_${startStopId}_${endStopId}`,
        type,
        score: Math.max(50, Math.min(99, score)),
        segments,
        totalTime,
        totalFare: finalFare,
        originalFare: rawFare,
        totalWalkingKm: Number(lastMileDist.toFixed(1)),
        totalTransfers: 1,
        totalCarbon: Number(totalCarbon.toFixed(2)),
        avgCongestion: Math.round(congestionBase * 0.4),
        savingPercent: Math.round(discount * 100),
      };
    }
  };

  const routes = [
    generateRouteOption('RECOMMENDED'),
    generateRouteOption('PT_ONLY'),
    generateRouteOption('FAST_PRIVATE')
  ];

  // Sort routes by Pareto dominance / highest score first
  return routes.sort((a, b) => b.score - a.score);
}
