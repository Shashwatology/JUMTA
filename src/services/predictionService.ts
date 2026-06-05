export interface PredictionResult {
  predictedRidership: number;
  avgCongestion: number;
  networkLoadIndex: number;
  hotspots: string[];
}

export const predictionService = {
  // XGBoost Simulator for ridership & traffic congestion
  runXGBoostRidershipModel(
    peakFactor: number,
    weather: 'CLEAR' | 'RAIN' | 'HOT_WAVE',
    event: 'NONE' | 'FESTIVAL' | 'EXAM' | 'MELA'
  ): { ridership: number; congestion: number } {
    let baseRidership = 82000;
    let weatherModifier = 1.0;
    let eventModifier = 1.0;

    switch (weather) {
      case 'RAIN':
        weatherModifier = 0.82; // Rain drops bus speeds and general ridership
        break;
      case 'HOT_WAVE':
        weatherModifier = 0.90; // Heat wave reduces mid-day travel
        break;
      default:
        weatherModifier = 1.0;
    }

    switch (event) {
      case 'FESTIVAL':
        eventModifier = 1.40; // Major spike in walled city travel
        break;
      case 'EXAM':
        eventModifier = 1.25; // Student mass transit load
        break;
      case 'MELA':
        eventModifier = 1.18; // Transport Nagar / Jawahar Circle spikes
        break;
      default:
        eventModifier = 1.0;
    }

    // Multiply base ridership with peak factor & modifiers
    const peakOffset = (peakFactor - 1.0) * 0.35;
    const finalMultiplier = weatherModifier * eventModifier * (1.0 + peakOffset);

    const ridership = Math.round(baseRidership * finalMultiplier);
    const congestion = Math.min(100, Math.round(42 * finalMultiplier * (1.0 + (peakFactor - 1.0) * 0.6)));

    return { ridership, congestion };
  },

  // Graph Neural Network (GNN) Simulator for spatial hotspot identification
  runGNNHotspotModel(
    predictedRidership: number,
    event: 'NONE' | 'FESTIVAL' | 'EXAM' | 'MELA'
  ): string[] {
    const hotspots: string[] = [];

    // Spatial node classification based on ridership limits & events
    if (event === 'FESTIVAL') {
      hotspots.push('M_BADI_CHAUPAR', 'M_CHANDPOLE', 'M2_AJG'); // Old walled city stops
    }
    if (event === 'MELA') {
      hotspots.push('B_TRANS_NAGAR', 'M2_NSCIR', 'M2_RBC'); // Transport Nagar and Rambagh entries
    }
    if (event === 'EXAM') {
      hotspots.push('M2_MNIT', 'M2_GOPALPURA', 'M_SINDHI_CAMP'); // Student corridors
    }

    // High general capacity trigger
    if (predictedRidership > 95000) {
      hotspots.push('M_SINDHI_CAMP', 'M2_B2_BYPASS', 'B_TRANS_NAGAR');
    }

    // Always keep at least Sindhi Camp as a benchmark interchange hotspot if high
    if (hotspots.length === 0 && predictedRidership > 80000) {
      hotspots.push('M_SINDHI_CAMP');
    }

    return hotspots;
  },

  // Consolidated query method
  getTransitNetworkPredictions(
    peakFactor: number,
    weather: 'CLEAR' | 'RAIN' | 'HOT_WAVE',
    event: 'NONE' | 'FESTIVAL' | 'EXAM' | 'MELA'
  ): PredictionResult {
    const { ridership, congestion } = this.runXGBoostRidershipModel(peakFactor, weather, event);
    const hotspots = this.runGNNHotspotModel(ridership, event);
    const networkLoadIndex = Math.min(100, Math.round(ridership / 1250));

    return {
      predictedRidership: ridership,
      avgCongestion: congestion,
      networkLoadIndex,
      hotspots
    };
  }
};
