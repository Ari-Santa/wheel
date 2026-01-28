"use client";

import type { BattleRoyaleRanking } from "../page";

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

  return (
    <div className="bg-surface rounded-xl p-3 xl:p-4 2xl:p-6 w-full">
      {/* Header */}
      <div className="mb-4 xl:mb-6">
        <h2 className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-accent">
          Battle Royale Results
        </h2>
        <p className="text-text-muted text-sm xl:text-base 2xl:text-lg mt-1">
          {totalPlayers} players • {totalRounds} rounds
        </p>
      </div>

      {/* Top 3 Podium */}
      <div className="mb-4 xl:mb-6">
        <h3 className="text-base xl:text-lg 2xl:text-xl font-semibold mb-3 text-white">
          Top 3
        </h3>
        <div className="space-y-1.5 xl:space-y-2">
          {topThree.map((ranking) => (
            <div
              key={ranking.playerId}
              className={`
                flex items-center gap-3 xl:gap-4 p-2.5 xl:p-3 rounded-lg transition-all
                ${ranking.rank === 1
                  ? "bg-accent/20 border-2 border-accent"
                  : "bg-surface-light"}
              `}
            >
              {/* Rank Badge */}
              <div className={`
                flex-shrink-0 w-8 h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12
                rounded-full flex items-center justify-center font-bold
                text-base xl:text-lg 2xl:text-xl
                ${ranking.rank === 1 ? "bg-yellow-500 text-black" :
                  ranking.rank === 2 ? "bg-gray-400 text-black" :
                  "bg-amber-700 text-white"}
              `}>
                {ranking.rank === 1 ? "🏆" : ranking.rank}
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm xl:text-base 2xl:text-lg">
                    {ranking.playerName}
                  </span>
                  {ranking.revivedCount > 0 && (
                    <span className="text-[10px] xl:text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                      Revived {ranking.revivedCount}x
                    </span>
                  )}
                </div>

                {/* Elimination Details (2nd/3rd place) */}
                {ranking.rank > 1 && ranking.eliminationCause && (
                  <div className="mt-1.5 space-y-0.5">
                    <div className="text-[11px] xl:text-xs 2xl:text-sm text-text-muted">
                      Eliminated in <span className="text-white font-medium">Round {ranking.finalRound}</span>
                    </div>
                    <div className="text-[11px] xl:text-xs 2xl:text-sm text-text-muted">
                      Method: <span className="text-white font-medium">{ranking.eliminationCause}</span>
                    </div>
                    {ranking.eliminatedBy && (
                      <div className="text-[11px] xl:text-xs 2xl:text-sm">
                        <span className="text-danger">⚔️ Eliminated by:</span>{" "}
                        <span className="text-danger font-bold">{ranking.eliminatedBy}</span>
                      </div>
                    )}
                    {!ranking.eliminatedBy && (
                      <div className="text-[11px] xl:text-xs 2xl:text-sm text-text-muted italic">
                        Self-elimination
                      </div>
                    )}
                  </div>
                )}

                {/* Winner Details */}
                {ranking.rank === 1 && (
                  <div className="text-[11px] xl:text-xs 2xl:text-sm text-accent mt-1">
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
          <summary className="text-sm xl:text-base 2xl:text-lg font-semibold mb-3 cursor-pointer hover:text-accent transition-colors">
            Rest of Field ({restOfField.length} players)
          </summary>
          <div className="space-y-1 xl:space-y-1.5 max-h-64 xl:max-h-96 overflow-y-auto">
            {restOfField.map((ranking) => (
              <div
                key={ranking.playerId}
                className="bg-surface-light/50 p-2 xl:p-2.5 rounded-lg"
              >
                {/* Player name and rank */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 xl:gap-2.5 min-w-0">
                    <span className="text-text-muted font-mono text-[10px] xl:text-xs w-6 shrink-0">
                      #{ranking.rank}
                    </span>
                    <span className="font-medium text-xs xl:text-sm truncate">
                      {ranking.playerName}
                    </span>
                    {ranking.revivedCount > 0 && (
                      <span className="text-[9px] xl:text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                        +{ranking.revivedCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Elimination details on second line */}
                <div className="flex items-center gap-2 mt-1 text-[10px] xl:text-xs text-text-muted">
                  <span>{ranking.eliminationCause}</span>
                  {ranking.eliminatedBy && (
                    <>
                      <span className="text-text-muted">•</span>
                      <span className="text-danger">by {ranking.eliminatedBy}</span>
                    </>
                  )}
                  <span className="text-text-muted">•</span>
                  <span>Round {ranking.finalRound}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Fun Stats */}
      <div className="mt-4 xl:mt-6 pt-3 xl:pt-4 border-t border-gray-600">
        <h3 className="text-sm xl:text-base 2xl:text-lg font-semibold mb-3">
          Battle Statistics
        </h3>
        <div className="grid grid-cols-2 gap-2 xl:gap-3 text-xs xl:text-sm 2xl:text-base">
          <div className="bg-surface-light p-2 xl:p-2.5 rounded">
            <div className="text-text-muted text-[10px] xl:text-xs">Most Revived</div>
            <div className="font-bold text-xs xl:text-sm 2xl:text-base text-green-400 mt-0.5">
              {getMostRevived(rankings)}
            </div>
          </div>

          <div className="bg-surface-light p-2 xl:p-2.5 rounded">
            <div className="text-text-muted text-[10px] xl:text-xs">Most Deadly</div>
            <div className="font-bold text-xs xl:text-sm 2xl:text-base text-danger mt-0.5">
              {getMostDeadly(rankings)}
            </div>
          </div>

          <div className="bg-surface-light p-2 xl:p-2.5 rounded">
            <div className="text-text-muted text-[10px] xl:text-xs">Longest Survivor</div>
            <div className="font-bold text-xs xl:text-sm 2xl:text-base text-blue-400 mt-0.5">
              {getLongestSurvivor(rankings)}
            </div>
          </div>

          <div className="bg-surface-light p-2 xl:p-2.5 rounded">
            <div className="text-text-muted text-[10px] xl:text-xs">First Eliminated</div>
            <div className="font-bold text-xs xl:text-sm 2xl:text-base text-orange-400 mt-0.5">
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
