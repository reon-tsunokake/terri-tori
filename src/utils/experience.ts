/**
 * 経験値計算のユーティリティ
 *
 * 経験値: 投稿したら+10pt、いいねしたら+2pt
 */

// 経験値のポイント
export const EXPERIENCE_POINTS = {
  POST: 100, // 投稿時に加算されるポイント
  LIKE: 20, // いいね時に加算されるポイント
} as const;

// 最大レベル
export const MAX_LEVEL = 100;

/**
 * 指定レベルに必要な累積経験値を計算する
 * 計算式: Math.floor(50 * (level - 1) ^ 1.5)
 * @param level レベル（1以上）
 * @returns 累積経験値
 */
export function getExperienceForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level - 1, 1.5));
}

export interface ExperienceResult {
  totalExperience: number; // 総経験値
  level: number; // 現在のレベル
  currentLevelExperience: number; // 現在のレベルでの経験値
  nextLevelExperience: number; // 次のレベルまでに必要な経験値
  progress: number; // 次のレベルまでの進捗率（0-100）
}

/**
 * 経験値からレベルを計算する
 * @param experience 総経験値
 * @returns レベル（1から始まる）
 */
export function calculateLevel(experience: number): number {
  if (experience <= 0) return 1;

  // 計算式: exp = 50 * (level - 1) ^ 1.5
  // 逆算: level = (exp / 50) ^ (1/1.5) + 1
  const calculatedLevel = Math.floor(Math.pow(experience / 50, 1 / 1.5) + 1);

  // 計算誤差を考慮して確認
  if (getExperienceForLevel(calculatedLevel + 1) <= experience) {
    return Math.min(calculatedLevel + 1, MAX_LEVEL);
  }

  return Math.min(Math.max(1, calculatedLevel), MAX_LEVEL);
}

/**
 * 経験値の詳細情報を取得する
 * @param experience 総経験値
 * @returns 経験値の詳細情報
 */
export function getExperienceDetails(experience: number): ExperienceResult {
  const level = calculateLevel(experience);

  const currentLevelThreshold = getExperienceForLevel(level);
  const nextLevelThreshold = getExperienceForLevel(level + 1);

  const currentLevelExperience = experience - currentLevelThreshold;
  const experienceForNextLevel = nextLevelThreshold - currentLevelThreshold;
  const nextLevelExperience = nextLevelThreshold - experience;

  // 最大レベルの場合は100%
  const progress =
    level >= MAX_LEVEL
      ? 100
      : Math.min(100, Math.floor((currentLevelExperience / experienceForNextLevel) * 100));

  return {
    totalExperience: experience,
    level,
    currentLevelExperience,
    nextLevelExperience: Math.max(0, nextLevelExperience),
    progress,
  };
}
