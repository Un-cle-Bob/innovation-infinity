import { KpiDetail, KpiIndicator, Measure, SubMeasure } from '../types';

/**
 * 8절: KPI 4계층 가중평균 자동 상향 계산 엔진
 */
export function recalculateKpiTree(kpis: KpiIndicator[]): KpiIndicator[] {
  return kpis.map((indicator) => {
    // 1. 하위 세부지표(Details) 계산
    const updatedDetails: KpiDetail[] = indicator.details.map((detail) => {
      // 2. 하위 측정지표(Measures) 계산
      const updatedMeasures: Measure[] = detail.measures.map((measure) => {
        // 3. 하위 세부측정지표(SubMeasures) 기반 계산
        const validSubs = measure.sub_measures.filter(
          (sm) => sm.actual !== null && sm.actual !== undefined && !isNaN(Number(sm.actual))
        );

        let measureActual = measure.actual;
        if (validSubs.length > 0) {
          // 측정지표 실적값 = 하위 세부측정지표들의 평균 (또는 단일인 경우 그 값)
          const sum = validSubs.reduce((acc, sm) => acc + Number(sm.actual), 0);
          measureActual = Math.round((sum / validSubs.length) * 100) / 100;
        }

        return {
          ...measure,
          actual: measureActual,
        };
      });

      // 4. 세부지표 실적값 = 하위 측정지표들의 가중합
      const numMeasures = updatedMeasures.length;
      let weights = detail.weights;
      if (!weights || weights.length !== numMeasures || weights.reduce((a, b) => a + b, 0) === 0) {
        // 균등 가중치
        weights = numMeasures > 0 ? Array(numMeasures).fill(1 / numMeasures) : [];
      } else {
        // 정규화 (합이 1이 되도록)
        const totalW = weights.reduce((a, b) => a + b, 0);
        weights = weights.map((w) => w / totalW);
      }

      let detailActual = 0;
      updatedMeasures.forEach((m, idx) => {
        const w = weights?.[idx] ?? 1 / (numMeasures || 1);
        detailActual += (Number(m.actual) || 0) * w;
      });
      detailActual = Math.round(detailActual * 100) / 100;

      return {
        ...detail,
        measures: updatedMeasures,
        weights,
        actual: detailActual,
      };
    });

    // 5. 자율성과지표 실적값 = 하위 세부지표들의 가중합
    const numDetails = updatedDetails.length;
    let indWeights = indicator.weights;
    if (!indWeights || indWeights.length !== numDetails || indWeights.reduce((a, b) => a + b, 0) === 0) {
      indWeights = numDetails > 0 ? Array(numDetails).fill(1 / numDetails) : [];
    } else {
      const totalW = indWeights.reduce((a, b) => a + b, 0);
      indWeights = indWeights.map((w) => w / totalW);
    }

    let indicatorActual = 0;
    updatedDetails.forEach((d, idx) => {
      const w = indWeights?.[idx] ?? 1 / (numDetails || 1);
      indicatorActual += (Number(d.actual) || 0) * w;
    });
    indicatorActual = Math.round(indicatorActual * 100) / 100;

    // 달성도 = 실적값 / 목표값
    const target = Number(indicator.target) || 1;
    const achievement = target > 0 ? Math.round((indicatorActual / target) * 10000) / 10000 : 0;

    return {
      ...indicator,
      details: updatedDetails,
      weights: indWeights,
      actual: indicatorActual,
      achievement,
    };
  });
}

/**
 * 권장값 대비 달성 상태 및 비율 계산
 */
export function getRecommendedStatus(actual?: number | null, recommended?: number | null) {
  if (recommended === null || recommended === undefined || recommended <= 0) {
    return { hasRecommendation: false, rate: 0, status: 'none' as const, label: '' };
  }
  const act = Number(actual || 0);
  const rate = Math.round((act / recommended) * 100);
  let status: 'green' | 'orange' | 'red' = 'green';

  if (rate >= 100) {
    status = 'green';
  } else if (rate >= 80) {
    status = 'orange';
  } else {
    status = 'red';
  }

  return {
    hasRecommendation: true,
    rate,
    status,
    label: `실적 ${act} / 권장 ${recommended} (${rate}%)`,
  };
}
