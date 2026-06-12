import { transitDataService } from './transitDataService';
import { predictionService } from './predictionService';

export interface RouteSegment {
  mode: 'METRO' | 'BUS' | 'AUTO' | 'WALK' | 'CYCLE';
  routeName?: string;
  fromStopName: string;
  toStopName: string;
  distanceKm: number;
  timeMins: number;
  fare: number;
  carbonKg: number;
  congestion: number;
}

export interface OptimizedRoute {
  id: string;
  type: 'RECOMMENDED' | 'CHEAPEST' | 'FASTEST' | 'LEAST_WALKING' | 'GREENEST' | 'PT_ONLY' | 'FAST_PRIVATE';
  score: number; // 0 - 100
  segments: RouteSegment[];
  totalTime: number;
  totalFare: number;
  originalFare: number;
  totalWalkingKm: number;
  totalTransfers: number;
  totalCarbon: number;
  avgCongestion: number;
  savingPercent: number;
}

export const routingService = {
  // Helper to calculate score based on user requirements:
  // Fare (25%), Time (30%), Transfers (15%), Walking (10%), Carbon (10%), Congestion (10%)
  calculateMaaSScore(
    timeMins: number,
    fareRs: number,
    walkingKm: number,
    transfers: number,
    congestion: number
  ): number {
    const scoreTime = Math.max(0, 100 - timeMins * 1.2);
    const scoreFare = Math.max(0, 100 - fareRs * 1.5);
    const scoreWalking = Math.max(0, 100 - walkingKm * 20);
    const scoreTransfers = Math.max(0, 100 - transfers * 25);
    const scoreReliability = Math.max(0, 100 - congestion);

    const score =
      scoreTime * 0.40 +
      scoreFare * 0.25 +
      scoreWalking * 0.15 +
      scoreTransfers * 0.10 +
      scoreReliability * 0.10;

    return Math.max(30, Math.min(99, Math.round(score)));
  },

  // Compute realistic routes based on network connectivity
  calculateRoutes(
    startId: string,
    endId: string,
    peakFactor: number,
    weather: 'CLEAR' | 'RAIN' | 'HOT_WAVE',
    event: 'NONE' | 'FESTIVAL' | 'EXAM' | 'MELA',
    includePhase2 = true,
    collegeMode = false,
    touristMode = false,
    womenMode = false,
    elderMode = false
  ): OptimizedRoute[] {
    let startStop = transitDataService.getStopById(startId, includePhase2);
    let endStop = transitDataService.getStopById(endId, includePhase2);

    const pois = transitDataService.getPOIs();
    const startPOI = pois.find(p => p.id === startId);
    const endPOI = pois.find(p => p.id === endId);

    if (startPOI) {
      startStop = {
        id: startPOI.id,
        nameEn: startPOI.nameEn,
        nameHi: startPOI.nameHi,
        lat: startPOI.lat,
        lng: startPOI.lng,
        type: 'AUTO'
      };
    }
    if (endPOI) {
      endStop = {
        id: endPOI.id,
        nameEn: endPOI.nameEn,
        nameHi: endPOI.nameHi,
        lat: endPOI.lat,
        lng: endPOI.lng,
        type: 'AUTO'
      };
    }

    if (!startStop || !endStop || startId === endId) return [];

    const predictions = predictionService.getTransitNetworkPredictions(peakFactor, weather, event);
    const congestionBase = predictions.avgCongestion;

    const lat1 = startStop.lat;
    const lon1 = startStop.lng;
    const lat2 = endStop.lat;
    const lon2 = endStop.lng;

    // Helper: Haversine distance in km
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const directDistance = Number((R * c).toFixed(2));

    let metroConcession = 1.0;
    if (collegeMode) {
      metroConcession = 0.5;
    } else if (womenMode || elderMode) {
      metroConcession = 0.75;
    }

    const busConcession = (womenMode || elderMode) ? 0.75 : 1.0;

    // Helper to generate route options
    const generateRoute = (
      type: 'RECOMMENDED' | 'CHEAPEST' | 'FASTEST' | 'LEAST_WALKING' | 'GREENEST'
    ): OptimizedRoute => {
      const segments: RouteSegment[] = [];

      if (type === 'FASTEST') {
        // Direct Uber / Ola Cab or private Auto
        const rideTime = Math.round(directDistance * 1.8);
        const rawFare = Math.round(directDistance * 12 + 30);
        segments.push({
          mode: 'AUTO',
          routeName: 'Direct Cab / Auto',
          fromStopName: startStop!.nameEn,
          toStopName: endStop!.nameEn,
          distanceKm: directDistance,
          timeMins: rideTime,
          fare: rawFare,
          carbonKg: Number((directDistance * 0.14).toFixed(2)),
          congestion: congestionBase
        });

        const score = routingService.calculateMaaSScore(
          rideTime,
          rawFare,
          0,
          0,
          congestionBase
        );

        return {
          id: `route_fastest_${startId}_${endId}`,
          type,
          score,
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
        // Direct JCTSL Bus route with small walks on both ends
        const busTime = Math.round(directDistance * 2.8 + 6);
        const rawFare = Math.round(Math.max(10, Math.min(20, Math.round(directDistance * 1.8))) * busConcession);
        const walkingKm = 0.4;
        const walkTime = 5;

        segments.push({
          mode: 'WALK',
          routeName: 'Walk to Bus Stop',
          fromStopName: startStop!.nameEn,
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
          toStopName: endStop!.nameEn,
          distanceKm: 0.2,
          timeMins: 3,
          fare: 0,
          carbonKg: 0,
          congestion: 0
        });

        const totalTime = busTime + walkTime;
        const totalFare = rawFare;

        const score = routingService.calculateMaaSScore(
          totalTime,
          totalFare,
          walkingKm,
          1,
          congestionBase * 1.1
        );

        return {
          id: `route_cheapest_${startId}_${endId}`,
          type,
          score,
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
        // E-Rickshaw feeder + direct Metro
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
          fromStopName: startStop!.nameEn,
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
          toStopName: endStop!.nameEn,
          distanceKm: metroDist,
          timeMins: metroTime,
          fare: metroFare,
          carbonKg: 0.01,
          congestion: 0
        });

        const score = routingService.calculateMaaSScore(
          totalTime,
          combinedFare,
          0,
          1,
          congestionBase * 0.5
        );

        return {
          id: `route_least_walk_${startId}_${endId}`,
          type,
          score,
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
        // Direct Metro + Cycle sharing / Walking
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
          fromStopName: startStop!.nameEn,
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
          toStopName: endStop!.nameEn,
          distanceKm: cycleDist,
          timeMins: cycleTime,
          fare: cycleFare,
          carbonKg: 0,
          congestion: 0
        });

        const score = routingService.calculateMaaSScore(
          totalTime,
          combinedFare,
          0,
          1,
          0
        );

        return {
          id: `route_greenest_${startId}_${endId}`,
          type,
          score,
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
          fromStopName: startStop!.nameEn,
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
          toStopName: endStop!.nameEn,
          distanceKm: lastMile,
          timeMins: walkTime,
          fare: 0,
          carbonKg: 0,
          congestion: 0
        });

        if (touristMode) {
          segments[1].routeName = 'Jaipur Heritage Express';
        }

        const score = routingService.calculateMaaSScore(
          totalTime,
          finalFare,
          lastMile,
          2,
          congestionBase * 0.3
        );

        return {
          id: `route_recom_${startId}_${endId}`,
          type,
          score,
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

    const routesList = [
      generateRoute('RECOMMENDED'),
      generateRoute('CHEAPEST'),
      generateRoute('FASTEST'),
      generateRoute('LEAST_WALKING'),
      generateRoute('GREENEST')
    ];

    return routesList.sort((a, b) => b.score - a.score);
  }
};
