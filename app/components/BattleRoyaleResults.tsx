"use client";

import type { BattleRoyaleRanking } from "../page";
import styles from "./BattleRoyaleResults.module.css";

interface BattleRoyaleResultsProps {
  rankings: BattleRoyaleRanking[];
  totalPlayers: number;
  totalRounds: number;
  compact?: boolean;
}

export default function BattleRoyaleResults({
  rankings,
  totalPlayers,
  totalRounds,
  compact = false,
}: BattleRoyaleResultsProps) {
  const topThree = rankings.slice(0, 3);
  const restOfField = rankings.slice(3);

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return styles.rankBadgeGold;
    if (rank === 2) return styles.rankBadgeSilver;
    return styles.rankBadgeBronze;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          Battle Royale Results
        </h2>
        <p className={styles.subtitle}>
          {totalPlayers} players • {totalRounds} rounds
        </p>
      </div>

      {/* Top 3 Podium */}
      <div className={styles.topThreeSection}>
        <h3 className={styles.sectionTitle}>
          Top 3
        </h3>
        <div className={styles.topThreeList}>
          {topThree.map((ranking) => (
            <div
              key={ranking.playerId}
              className={ranking.rank === 1 ? styles.playerRowWinner : styles.playerRow}
            >
              {/* Rank Badge */}
              <div className={getRankBadgeClass(ranking.rank)}>
                {ranking.rank === 1 ? "🏆" : ranking.rank}
              </div>

              {/* Player Info */}
              <div className={styles.playerInfo}>
                <div className={styles.playerNameRow}>
                  <span className={styles.playerName}>
                    {ranking.playerName}
                  </span>
                  {ranking.revivedCount > 0 && (
                    <span className={styles.revivedBadge}>
                      Revived {ranking.revivedCount}x
                    </span>
                  )}
                </div>

                {/* Elimination Details (2nd/3rd place) */}
                {ranking.rank > 1 && ranking.eliminationCause && (
                  <div className={styles.eliminationDetails}>
                    <div className={styles.detailText}>
                      Eliminated in <span className={styles.detailHighlight}>Round {ranking.finalRound}</span>
                    </div>
                    <div className={styles.detailText}>
                      Method: <span className={styles.detailHighlight}>{ranking.eliminationCause}</span>
                    </div>
                    {ranking.eliminatedBy && (
                      <div className={styles.eliminatedBy}>
                        <span className={styles.dangerText}>⚔️ Eliminated by:</span>{" "}
                        <span className={styles.dangerTextBold}>{ranking.eliminatedBy}</span>
                      </div>
                    )}
                    {!ranking.eliminatedBy && (
                      <div className={styles.selfElimination}>
                        Self-elimination
                      </div>
                    )}
                  </div>
                )}

                {/* Winner Details */}
                {ranking.rank === 1 && (
                  <div className={styles.championText}>
                    Champion • Survived all {ranking.survivedRounds} rounds
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rest of Field - Collapsible */}
      {restOfField.length > 0 && (
        <details className={compact ? "" : "open"}>
          <summary className={styles.restOfFieldSummary}>
            Rest of Field ({restOfField.length} players)
          </summary>
          <div className={styles.restOfFieldList}>
            {restOfField.map((ranking) => (
              <div
                key={ranking.playerId}
                className={styles.restOfFieldItem}
              >
                {/* Player name and rank */}
                <div className={styles.restPlayerRow}>
                  <div className={styles.restPlayerInfo}>
                    <span className={styles.restRankNumber}>
                      #{ranking.rank}
                    </span>
                    <span className={styles.restPlayerName}>
                      {ranking.playerName}
                    </span>
                    {ranking.revivedCount > 0 && (
                      <span className={styles.restRevivedBadge}>
                        +{ranking.revivedCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Elimination details on second line */}
                <div className={styles.restEliminationRow}>
                  <span>{ranking.eliminationCause}</span>
                  {ranking.eliminatedBy && (
                    <>
                      <span>•</span>
                      <span className={styles.dangerText}>by {ranking.eliminatedBy}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Round {ranking.finalRound}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Fun Stats */}
      <div className={styles.statsSection}>
        <h3 className={styles.statsTitle}>
          Battle Statistics
        </h3>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Most Revived</div>
            <div className={styles.statValueGreen}>
              {getMostRevived(rankings)}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>Most Deadly</div>
            <div className={styles.statValueRed}>
              {getMostDeadly(rankings)}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>Longest Survivor</div>
            <div className={styles.statValueBlue}>
              {getLongestSurvivor(rankings)}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>First Eliminated</div>
            <div className={styles.statValueOrange}>
              {getFirstEliminated(rankings)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: Find player with most revivals
function getMostRevived(rankings: BattleRoyaleRanking[]): string {
  const max = rankings.reduce((max, r) =>
    (r.revivedCount > (max?.revivedCount || 0)) ? r : max
  , rankings[0]);

  return max?.revivedCount > 0
    ? `${max.playerName} (${max.revivedCount}x)`
    : "None";
}

// Helper: Find player who eliminated the most others (Double Elim only)
function getMostDeadly(rankings: BattleRoyaleRanking[]): string {
  const killCounts: Record<string, number> = {};

  rankings.forEach(r => {
    if (r.eliminatedBy) {
      killCounts[r.eliminatedBy] = (killCounts[r.eliminatedBy] || 0) + 1;
    }
  });

  const entries = Object.entries(killCounts);
  if (entries.length === 0) return "None";

  const [player, kills] = entries.reduce((max, entry) =>
    entry[1] > max[1] ? entry : max
  );

  return `${player} (${kills})`;
}

// Helper: Find player who survived longest before elimination
function getLongestSurvivor(rankings: BattleRoyaleRanking[]): string {
  const eliminated = rankings.filter(r => r.rank > 1);
  if (eliminated.length === 0) return "N/A";

  const max = eliminated.reduce((max, r) =>
    r.survivedRounds > (max?.survivedRounds || 0) ? r : max
  );

  return `${max.playerName} (${max.survivedRounds} rounds)`;
}

// Helper: Find first player eliminated
function getFirstEliminated(rankings: BattleRoyaleRanking[]): string {
  if (rankings.length === 0) return "N/A";
  const lastRank = rankings[rankings.length - 1];
  return `${lastRank.playerName} (R${lastRank.finalRound})`;
}
