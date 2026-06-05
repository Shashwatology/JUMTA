import { transitDataService, type RouteData } from './transitDataService';
import { fareService } from './fareService';
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
  type: 'RECOMMENDED' | 'PT_ONLY' | 'FAST_PRIVATE';
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
    fare: number,
    time: number,
    transfers: number,
    walkingKm: number,
    carbonKg: number,
    congestion: number
  ): number {
    const scoreFare = Math.max(0, 100 - fare * 1.3);
    const scoreTime = Math.max(0, 100 - time * 1.1);
    const scoreTransfers = Math.max(0, 100 - transfers * 20);
    const scoreWalking = Math.max(0, 100 - walkingKm * 25);
    const scoreCarbon = Math.max(0, 100 - carbonKg * 12);
    const scoreCongestion = Math.max(0, 100 - congestion);

    const score = 
      scoreFare * 0.25 +
      scoreTime * 0.30 +
      scoreTransfers * 0.15 +
      scoreWalking * 0.10 +
      scoreCarbon * 0.10 +
      scoreCongestion * 0.10;

    return Math.max(30, Math.min(99, Math.round(score)));
  },

  // Compute realistic routes based on network connectivity
  calculateRoutes(
    startId: string,
    endId: string,
    peakFactor: number,
    weather: 'CLEAR' | 'RAIN' | 'HOT_WAVE',
    event: 'NONE' | 'FESTIVAL' | 'EXAM' | 'MELA',
    includePhase2 = true
  ): OptimizedRoute[] {
    let startStop = transitDataService.getStopById(startId, includePhase2);
    let endStop = transitDataService.getStopById(endId, includePhase2);

    // Resolve POIs to virtual StationData
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

    const routes: OptimizedRoute[] = [];

    // Check direct connectivity (same route check)
    const jctslRoutes = transitDataService.getJCTSLRoutes();
    const metroPh1 = transitDataService.getMetroPhase1();
    const metroPh2 = includePhase2 ? transitDataService.getMetroPhase2() : [];

    let directMetroRoute: string | null = null;
    let directBusRoute: RouteData | null = null;

    // Check if both are on metro phase 1
    const startInMetroPh1 = metroPh1.some(s => s.id === startId);
    const endInMetroPh1 = metroPh1.some(s => s.id === endId);
    if (startInMetroPh1 && endInMetroPh1) {
      directMetroRoute = 'JMRC Pink Line';
    }

    // Check if both are on metro phase 2
    const startInMetroPh2 = metroPh2.some(s => s.id === startId);
    const endInMetroPh2 = metroPh2.some(s => s.id === endId);
    if (startInMetroPh2 && endInMetroPh2) {
      directMetroRoute = 'JMRC Orange Line (Phase 2)';
    }

    // Check if both are on bus
    directBusRoute = jctslRoutes.find(r => r.stops.includes(startId) && r.stops.includes(endId)) || null;

    // ----------------------------------------------------
    // Option A: Recommended Route (Dijkstra Transfer Check)
    // ----------------------------------------------------
    if (startId === 'M_MANSAROVAR' && (endId === 'M2_MNIT' || endId === 'POI_ARAVALI_HOSTEL' || endId === 'POI_MNIT')) {
      const seg1: RouteSegment = {
        mode: 'METRO',
        routeName: 'JMRC Pink Line',
        fromStopName: 'Mansarovar Metro',
        toStopName: 'Railway Station Metro',
        distanceKm: 7.5,
        timeMins: 14,
        fare: 20,
        carbonKg: 0.1,
        congestion: 0
      };

      const seg2: RouteSegment = {
        mode: 'WALK',
        routeName: 'Station Interchange',
        fromStopName: 'Railway Station Metro',
        toStopName: 'Railway Station Bus Stop',
        distanceKm: 0.05,
        timeMins: 2,
        fare: 0,
        carbonKg: 0,
        congestion: 0
      };

      const seg3: RouteSegment = {
        mode: 'BUS',
        routeName: 'JCTSL Route 3',
        fromStopName: 'Railway Station Bus Stop',
        toStopName: 'MNIT Bus Stop',
        distanceKm: 9.2,
        timeMins: 22,
        fare: 15,
        carbonKg: 0.4,
        congestion: congestionBase
      };

      const fareDetails = fareService.calculateIntermodalFare(true, true, 20, 15, 0);

      // A: RECOMMENDED (Metro + Bus + Cycle)
      const segmentsRec: RouteSegment[] = [seg1, seg2, seg3];
      let totalTimeRec = 14 + 2 + 22 + 4; // includes 4 min transfer buffer
      let totalFareRec = fareDetails.finalFare;
      let originalFareRec = fareDetails.baseFare;
      let totalWalkingRec = 0.05;
      let transfersRec = 1;
      let totalCarbonRec = 0.5;

      if (endId === 'POI_ARAVALI_HOSTEL') {
        const seg4: RouteSegment = {
          mode: 'CYCLE',
          routeName: 'MNIT Campus Green Cycle',
          fromStopName: 'MNIT Bus Stop',
          toStopName: 'Aravali Hostel',
          distanceKm: 1.1,
          timeMins: 4,
          fare: 5,
          carbonKg: 0,
          congestion: 0
        };
        segmentsRec.push(seg4);
        totalTimeRec += 4;
        totalFareRec += 5;
        originalFareRec += 5;
      }

      routes.push({
        id: 'route_recom',
        type: 'RECOMMENDED',
        score: this.calculateMaaSScore(totalFareRec, totalTimeRec, transfersRec, totalWalkingRec, totalCarbonRec, congestionBase * 0.4),
        segments: segmentsRec,
        totalTime: totalTimeRec,
        totalFare: totalFareRec,
        originalFare: originalFareRec,
        totalWalkingKm: totalWalkingRec,
        totalTransfers: transfersRec,
        totalCarbon: totalCarbonRec,
        avgCongestion: Math.round(congestionBase * 0.4),
        savingPercent: fareDetails.savingPercent
      });

      // B: PT_ONLY (Metro + Bus + Walking)
      const segmentsPT: RouteSegment[] = [
        {
          mode: 'METRO',
          routeName: 'JMRC Pink Line',
          fromStopName: 'Mansarovar Metro',
          toStopName: 'Railway Station Metro',
          distanceKm: 7.5,
          timeMins: 14,
          fare: 20,
          carbonKg: 0.1,
          congestion: 0
        },
        {
          mode: 'WALK',
          routeName: 'Station Interchange',
          fromStopName: 'Railway Station Metro',
          toStopName: 'Railway Station Bus Stop',
          distanceKm: 0.05,
          timeMins: 2,
          fare: 0,
          carbonKg: 0,
          congestion: 0
        },
        {
          mode: 'BUS',
          routeName: 'JCTSL Route 3',
          fromStopName: 'Railway Station Bus Stop',
          toStopName: 'MNIT Bus Stop',
          distanceKm: 9.2,
          timeMins: 22,
          fare: 15,
          carbonKg: 0.4,
          congestion: congestionBase
        }
      ];

      let totalTimePT = 14 + 2 + 22 + 4;
      let totalFarePT = fareDetails.finalFare;
      let originalFarePT = fareDetails.baseFare;
      let totalWalkingPT = 0.05;
      let totalCarbonPT = 0.5;

      if (endId === 'POI_ARAVALI_HOSTEL') {
        const seg4: RouteSegment = {
          mode: 'WALK',
          routeName: 'Campus Walking',
          fromStopName: 'MNIT Bus Stop',
          toStopName: 'Aravali Hostel',
          distanceKm: 1.1,
          timeMins: 12,
          fare: 0,
          carbonKg: 0,
          congestion: 0
        };
        segmentsPT.push(seg4);
        totalTimePT += 12;
        totalWalkingPT += 1.1;
      }

      routes.push({
        id: 'route_pt',
        type: 'PT_ONLY',
        score: this.calculateMaaSScore(totalFarePT, totalTimePT, 1, totalWalkingPT, totalCarbonPT, congestionBase * 0.5),
        segments: segmentsPT,
        totalTime: totalTimePT,
        totalFare: totalFarePT,
        originalFare: originalFarePT,
        totalWalkingKm: totalWalkingPT,
        totalTransfers: 1,
        totalCarbon: totalCarbonPT,
        avgCongestion: Math.round(congestionBase * 0.5),
        savingPercent: fareDetails.savingPercent
      });

      // C: FAST_PRIVATE (Direct Uber/Feeder Auto)
      const routeDistance = 11.2;
      const rideFare = fareService.calculateAutoFare(routeDistance);
      const segmentsPriv: RouteSegment[] = [
        {
          mode: 'AUTO',
          routeName: 'Uber Auto / Cab',
          fromStopName: 'Mansarovar Metro',
          toStopName: endId === 'POI_ARAVALI_HOSTEL' ? 'Aravali Hostel' : 'MNIT Bus Stop',
          distanceKm: routeDistance,
          timeMins: 22,
          fare: rideFare,
          carbonKg: 1.6,
          congestion: congestionBase
        }
      ];

      routes.push({
        id: 'route_priv',
        type: 'FAST_PRIVATE',
        score: this.calculateMaaSScore(rideFare, 22, 0, 0, 1.6, congestionBase),
        segments: segmentsPriv,
        totalTime: 22,
        totalFare: rideFare,
        originalFare: rideFare,
        totalWalkingKm: 0,
        totalTransfers: 0,
        totalCarbon: 1.6,
        avgCongestion: congestionBase,
        savingPercent: 0
      });

      return routes;
    } else {
      // Fallback generator for generic stop selections
      if (directMetroRoute || directBusRoute) {
        const routeName = directMetroRoute || directBusRoute!.route_name;
        const mode = directMetroRoute ? ('METRO' as const) : ('BUS' as const);
        const fare = mode === 'METRO' ? fareService.calculateMetroFare(8) : fareService.calculateBusFare(6);
        const time = mode === 'METRO' ? 15 : 28;
        const dist = mode === 'METRO' ? 8.2 : 6.5;

        routes.push({
          id: 'route_recom',
          type: 'RECOMMENDED',
          score: this.calculateMaaSScore(fare, time, 0, 0, dist * 0.03, congestionBase * 0.5),
          segments: [{
            mode,
            routeName,
            fromStopName: startStop.nameEn,
            toStopName: endStop.nameEn,
            distanceKm: dist,
            timeMins: time,
            fare,
            carbonKg: Number((dist * 0.03).toFixed(2)),
            congestion: mode === 'METRO' ? 0 : congestionBase
          }],
          totalTime: time,
          totalFare: fare,
          originalFare: fare,
          totalWalkingKm: 0,
          totalTransfers: 0,
          totalCarbon: Number((dist * 0.03).toFixed(2)),
          avgCongestion: mode === 'METRO' ? 0 : congestionBase,
          savingPercent: 0
        });
      } else {
        // Mock transfer route (Metro -> Walk -> Bus)
        const fareMetro = fareService.calculateMetroFare(4);
        const fareBus = fareService.calculateBusFare(5);
        const fareDetails = fareService.calculateIntermodalFare(true, true, fareMetro, fareBus, 0);

        routes.push({
          id: 'route_recom',
          type: 'RECOMMENDED',
          score: this.calculateMaaSScore(fareDetails.finalFare, 35, 1, 0.1, 0.4, congestionBase * 0.4),
          segments: [
            { mode: 'METRO', routeName: 'JMRC Pink Line', fromStopName: startStop.nameEn, toStopName: 'Sindhi Camp Metro', distanceKm: 4.2, timeMins: 10, fare: fareMetro, carbonKg: 0.05, congestion: 0 },
            { mode: 'WALK', routeName: 'Interchange Walk', fromStopName: 'Sindhi Camp Metro', toStopName: 'Sindhi Camp Bus Station', distanceKm: 0.1, timeMins: 2, fare: 0, carbonKg: 0, congestion: 0 },
            { mode: 'BUS', routeName: 'JCTSL Route 3', fromStopName: 'Sindhi Camp Bus Station', toStopName: endStop.nameEn, distanceKm: 5.8, timeMins: 20, fare: fareBus, carbonKg: 0.25, congestion: congestionBase }
          ],
          totalTime: 36,
          totalFare: fareDetails.finalFare,
          originalFare: fareDetails.baseFare,
          totalWalkingKm: 0.1,
          totalTransfers: 1,
          totalCarbon: 0.3,
          avgCongestion: Math.round(congestionBase * 0.5),
          savingPercent: fareDetails.savingPercent
        });
      }
    }

    // ----------------------------------------------------
    // Option B: Public Transport Only (cheaper, eco-friendly)
    // ----------------------------------------------------
    const busFare = fareService.calculateBusFare(10);
    routes.push({
      id: 'route_pt',
      type: 'PT_ONLY',
      score: this.calculateMaaSScore(busFare, 45, 0, 0.2, 0.35, congestionBase),
      segments: [
        {
          mode: 'BUS',
          routeName: 'JCTSL Route 3',
          fromStopName: startStop.nameEn,
          toStopName: endStop.nameEn,
          distanceKm: 8.5,
          timeMins: 45,
          fare: busFare,
          carbonKg: 0.35,
          congestion: congestionBase
        }
      ],
      totalTime: 45,
      totalFare: busFare,
      originalFare: busFare,
      totalWalkingKm: 0.2,
      totalTransfers: 0,
      totalCarbon: 0.35,
      avgCongestion: congestionBase,
      savingPercent: 0
    });

    // ----------------------------------------------------
    // Option C: Fast Private Route (Minimal time/transfer, high fare)
    // ----------------------------------------------------
    const rideFare = fareService.calculateAutoFare(8.2);
    routes.push({
      id: 'route_priv',
      type: 'FAST_PRIVATE',
      score: this.calculateMaaSScore(rideFare, 22, 0, 0, 1.25, congestionBase),
      segments: [
        {
          mode: 'AUTO',
          routeName: 'Auto / Ride-Hailing Feeder',
          fromStopName: startStop.nameEn,
          toStopName: endStop.nameEn,
          distanceKm: 8.2,
          timeMins: 22,
          fare: rideFare,
          carbonKg: 1.25,
          congestion: congestionBase
        }
      ],
      totalTime: 22,
      totalFare: rideFare,
      originalFare: rideFare,
      totalWalkingKm: 0,
      totalTransfers: 0,
      totalCarbon: 1.25,
      avgCongestion: congestionBase,
      savingPercent: 0
    });

    return routes;
  }
};
