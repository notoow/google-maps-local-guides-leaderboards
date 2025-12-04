/**
 * 숫자 포맷팅 유틸리티
 */

/**
 * 큰 숫자를 읽기 쉽게 포맷팅
 * 예: 1234567 → "1.23M", 12345 → "12.3K"
 */
export function formatCompactNumber(num) {
  if (num === null || num === undefined) return '0';

  const n = Number(num);

  if (n >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }

  return n.toString();
}

/**
 * 천 단위 콤마 포맷팅
 * 예: 1234567 → "1,234,567"
 */
export function formatWithCommas(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-US');
}

/**
 * 퍼센트 포맷팅
 * 예: 0.1234 → "12.34%"
 */
export function formatPercent(num, decimals = 1) {
  if (num === null || num === undefined) return '0%';
  return (Number(num) * 100).toFixed(decimals) + '%';
}

/**
 * 변화량 포맷팅 (양수면 +, 음수면 -)
 * 예: 1234 → "+1,234", -567 → "-567"
 */
export function formatChange(num) {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  const formatted = formatWithCommas(Math.abs(n));

  if (n > 0) return '+' + formatted;
  if (n < 0) return '-' + formatted;
  return formatted;
}

/**
 * 레벨 배지 클래스 반환
 */
export function getLevelBadgeClass(level) {
  const l = Number(level);
  if (l >= 10) return 'level-badge--10';
  if (l >= 9) return 'level-badge--9';
  if (l >= 8) return 'level-badge--8';
  if (l >= 7) return 'level-badge--7';
  if (l >= 6) return 'level-badge--6';
  return 'level-badge--5';
}

/**
 * 순위 배지 클래스 반환
 */
export function getRankBadgeClass(rank) {
  const r = Number(rank);
  if (r === 1) return 'rank-badge--1';
  if (r === 2) return 'rank-badge--2';
  if (r === 3) return 'rank-badge--3';
  return 'rank-badge--default';
}
