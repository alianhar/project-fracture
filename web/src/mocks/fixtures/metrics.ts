import type {
  ClaheAblationResult,
  ConfidenceInterval,
  ConfusionMatrix,
  MetricsResponse,
  ModelId,
  ModelMetrics,
  PrPoint,
  ReliabilityPoint,
  RiskCoveragePoint,
  RocPoint,
} from '@/lib/api/types';

/** PRNG deterministik (mulberry32) — fixture konsisten tiap reload, bukan acak tiap kali. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ci(point: number, halfWidth: number): ConfidenceInterval {
  return {
    point: Number(point.toFixed(4)),
    lower: Number(Math.max(0, point - halfWidth).toFixed(4)),
    upper: Number(Math.min(1, point + halfWidth).toFixed(4)),
  };
}

/** ROC berbentuk tpr = 1-(1-fpr)^p — AUC tepat = p/(p+1), jadi p diturunkan
 * langsung dari target AUROC. Jitter kecil ditambahkan supaya tidak terlihat
 * terlalu matematis-sempurna di chart. */
function generateRocCurve(auroc: number, rng: () => number, points = 14): RocPoint[] {
  const p = auroc / (1 - auroc);
  const out: RocPoint[] = [];
  for (let i = 0; i <= points; i++) {
    const fpr = i / points;
    const jitter = (rng() - 0.5) * 0.015;
    const tpr = Math.min(1, Math.max(0, 1 - Math.pow(1 - fpr, p) + jitter));
    out.push({ fpr: Number(fpr.toFixed(3)), tpr: Number(tpr.toFixed(3)), threshold: Number((1 - fpr).toFixed(3)) });
  }
  return out;
}

function generatePrCurve(basePrecision: number, rng: () => number, points = 14): PrPoint[] {
  const out: PrPoint[] = [];
  for (let i = 0; i <= points; i++) {
    const recall = i / points;
    const jitter = (rng() - 0.5) * 0.02;
    // presisi menurun landai lalu jatuh di recall tinggi — bentuk khas classifier bagus
    const precision = Math.min(1, Math.max(0.3, basePrecision - 0.35 * Math.pow(recall, 3) + jitter));
    out.push({
      recall: Number(recall.toFixed(3)),
      precision: Number(precision.toFixed(3)),
      threshold: Number((1 - recall).toFixed(3)),
    });
  }
  return out;
}

/** 10-bin reliability diagram. overconfidenceBias > 0 => model lebih pede
 * dari akurasi sebenarnya (pola umum sebelum kalibrasi/temperature scaling). */
function generateReliabilityDiagram(
  overconfidenceBias: number,
  rng: () => number,
  testSetSize: number,
): ReliabilityPoint[] {
  const bins: ReliabilityPoint[] = [];
  // sebagian besar prediksi classifier biner terklaster di confidence tinggi
  const weights = [2, 2, 3, 3, 5, 6, 9, 14, 24, 32];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 10; i++) {
    const conf = i / 10 + 0.05;
    const noise = (rng() - 0.5) * 0.06;
    const acc = Math.min(1, Math.max(0, conf - overconfidenceBias * (conf - 0.5) + noise));
    const count = Math.round((weights[i] / totalWeight) * testSetSize);
    bins.push({
      bin_confidence: Number(conf.toFixed(3)),
      bin_accuracy: Number(acc.toFixed(3)),
      bin_count: count,
    });
  }
  return bins;
}

function generateRiskCoverage(baseRisk: number, rng: () => number, points = 20): RiskCoveragePoint[] {
  const out: RiskCoveragePoint[] = [];
  for (let i = 0; i <= points; i++) {
    const coverage = 0.5 + (0.5 * i) / points;
    const jitter = (rng() - 0.5) * 0.01;
    // makin rendah coverage (makin banyak abstain), makin rendah risiko sisa
    const risk = Math.max(0.005, baseRisk * Math.pow(coverage, 2.2) + jitter);
    out.push({
      coverage: Number(coverage.toFixed(3)),
      risk: Number(risk.toFixed(4)),
      abstain_band: Number((1 - coverage).toFixed(3)),
    });
  }
  return out;
}

function deriveConfusionMatrix(recall: number, precision: number, testSetSize: number): ConfusionMatrix {
  const positives = Math.round(testSetSize / 2);
  const negatives = testSetSize - positives;
  const tp = Math.round(recall * positives);
  const fn = positives - tp;
  const fp = Math.round(tp * (1 / precision - 1));
  const tn = negatives - fp;
  return { tp, fp, tn: Math.max(0, tn), fn };
}

interface ModelProfile {
  id: ModelId;
  auroc: number;
  auprc: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  ece: number;
  overconfidence: number;
  seed: number;
}

const PROFILES: ModelProfile[] = [
  { id: 'tiny', auroc: 0.902, auprc: 0.885, accuracy: 0.881, precision: 0.869, recall: 0.874, f1: 0.871, ece: 0.081, overconfidence: 0.35, seed: 11 },
  { id: 'small', auroc: 0.958, auprc: 0.949, accuracy: 0.938, precision: 0.931, recall: 0.944, f1: 0.937, ece: 0.034, overconfidence: 0.12, seed: 22 },
  { id: 'base', auroc: 0.966, auprc: 0.958, accuracy: 0.947, precision: 0.942, recall: 0.951, f1: 0.946, ece: 0.028, overconfidence: 0.08, seed: 33 },
  { id: 'large', auroc: 0.971, auprc: 0.963, accuracy: 0.951, precision: 0.946, recall: 0.955, f1: 0.95, ece: 0.024, overconfidence: 0.06, seed: 44 },
];

const TEST_SET_SIZE = 500;

function buildModelMetrics(profile: ModelProfile): ModelMetrics {
  const rng = mulberry32(profile.seed);
  return {
    model_id: profile.id,
    accuracy: ci(profile.accuracy, 0.021 + rng() * 0.01),
    precision: ci(profile.precision, 0.024 + rng() * 0.01),
    recall: ci(profile.recall, 0.024 + rng() * 0.01),
    f1: ci(profile.f1, 0.022 + rng() * 0.01),
    auroc: ci(profile.auroc, 0.015 + rng() * 0.008),
    auprc: ci(profile.auprc, 0.017 + rng() * 0.008),
    ece: profile.ece,
    reliability_diagram: generateReliabilityDiagram(profile.overconfidence, rng, TEST_SET_SIZE),
    roc_curve: generateRocCurve(profile.auroc, rng),
    pr_curve: generatePrCurve(profile.precision + 0.03, rng),
    confusion_matrix: deriveConfusionMatrix(profile.recall, profile.precision, TEST_SET_SIZE),
    risk_coverage_curve: generateRiskCoverage(1 - profile.accuracy, rng),
    ood_auroc: Number((0.94 + rng() * 0.04).toFixed(3)),
    selected_threshold: Number((0.42 + rng() * 0.16).toFixed(3)),
    test_set_size: TEST_SET_SIZE,
  };
}

const claheAblation: ClaheAblationResult = {
  model_id: 'small',
  with_clahe: {
    accuracy: ci(0.941, 0.019),
    f1: ci(0.94, 0.02),
    auroc: ci(0.961, 0.014),
  },
  without_clahe: {
    accuracy: ci(0.938, 0.02),
    f1: ci(0.937, 0.021),
    auroc: ci(0.958, 0.015),
  },
};

export const metricsFixture: MetricsResponse = {
  generated_at: new Date().toISOString(),
  config_hash: 'mock-a1b2c3d (data simulasi — belum ada training asli)',
  models: PROFILES.map(buildModelMetrics),
  clahe_ablation: claheAblation,
};
