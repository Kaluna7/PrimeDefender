import { fetchDailyCommentary } from './aiBridge.js';

/**
 * @param {{ label: string, dateKey: string, volume: number, categories?: Record<string, number> }[]} dailyPoints
 * @param {string} locale
 * @returns {Promise<{ date: string, comment: string }[]>}
 */
export async function generateDailyThreatCommentary(dailyPoints, locale) {
  return fetchDailyCommentary({ dailyPoints, locale });
}

/**
 * @param {{ label: string, volume: number }[]} dailyPoints
 * @param {(key: string, vars?: object) => string} t
 */
export function buildFallbackDailyComments(dailyPoints, t) {
  return dailyPoints.map((d, i) => {
    const prev = i > 0 ? dailyPoints[i - 1].volume : d.volume;
    let comment;
    if (d.volume === 0) {
      comment = t('monitoring.intelCommentQuiet');
    } else if (d.volume > prev) {
      comment = t('monitoring.intelCommentRising', { n: d.volume });
    } else if (d.volume < prev) {
      comment = t('monitoring.intelCommentFalling', { n: d.volume });
    } else {
      comment = t('monitoring.intelCommentStable', { n: d.volume });
    }
    return { date: d.label, comment };
  });
}
