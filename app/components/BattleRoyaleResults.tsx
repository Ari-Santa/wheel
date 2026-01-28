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
    <div className="bg-surface rounded-xl p-4 xl:p-6 2xl:p-8 w-full">
      {/* Header */}
      <div className="mb-4 xl:mb-6">
        <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-bold text-accent">
          Battle Royale Results
        </h2>
        <p className="text-text-muted text-sm xl:text-base 2xl:text-lg mt-1">
          {totalPlayers} players • {totalRounds} rounds
        </p>
      </div>

      {/* Top 3 Podium */}
      <div className="mb-6 xl:mb-8">
        <h3 className="text-lg xl:text-xl 2xl:text-2xl font-semibold mb-3 text-white">
          Top 3
        </h3>
        <div className="space-y-2 xl:space-y-3">
          {topThree.map((ranking) => (
            <div
              key={ranking.playerId}
              className={`
                flex items-center gap-3 xl:gap-4 p-3 xl:p-4 rounded-lg transition-all
                ${ranking.rank === 1
                  ? "bg-accent/20 border-2 border-accent"
                  : "bg-surface-light"}
              `}
            >
              {/* Rank Badge */}
              <div className={`
                flex-shrink-0 w-10 h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14
                rounded-full flex items-center justify-center font-bold
                text-lg xl:text-xl 2xl:text-2xl
                ${ranking.rank === 1 ? "bg-yellow-500 text-black" :
                  ranking.rank === 2 ? "bg-gray-400 text-black" :
                  "bg-amber-700 text-white"}
              `}>
                {ranking.rank === 1 ? "🏆" : ranking.rank}
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base xl:text-lg 2xl:text-xl">
                    {ranking.playerName}
                  </span>
                  {ranking.revivedCount > 0 && (
                    <span className="text-xs xl:text-sm bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                      Revived {ranking.revivedCount}x
                    </span>
                  )}
                </div>

                {/* Elimination Details (2nd/3rd place) */}
                {ranking.rank > 1 && ranking.eliminationCause && (
                  <div className="text-xs xl:text-sm 2xl:text-base text-text-muted mt-1">
                    <span>Eliminated: {ranking.eliminationCause}</span>
                    {ranking.eliminatedBy && (
                      <span className="text-danger ml-1">by {ranking.eliminatedBy}</span>
                    )}
                    <span className="ml-2">• Round {ranking.finalRound}</span>
                  </div>
                )}

                {/* Winner Details */}
                {ranking.rank === 1 && (
                  <div className="text-xs xl:text-sm 2xl:text-base text-accent mt-1">
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
          <summary className="text-base xl:text-lg 2xl:text-xl font-semibold mb-3 cursor-pointer hover:text-accent transition-colors">
            Rest of Field ({restOfField.length} players)
          </summary>
          <div className="space-y-1 xl:space-y-2 max-h-64 xl:max-h-96 overflow-y-auto">
            {restOfField.map((ranking) => (
              <div
                key={ranking.playerId}
                className="flex items-center justify-between bg-surface-light/50 p-2 xl:p-3 rounded-lg text-xs xl:text-sm 2xl:text-base"
              >
                <div className="flex items-center gap-2 xl:gap-3 min-w-0">
                  <span className="text-text-muted font-mono w-6 xl:w-8 shrink-0">
                    #{ranking.rank}
                  </span>
                  <span className="font-medium truncate">{ranking.playerName}</span>
                </div>

                <div className="text-text-muted text-xs xl:text-sm shrink-0 ml-2">
                  {ranking.eliminationCause}
                  {ranking.eliminatedBy && ` by ${ranking.eliminatedBy}`}
                  {" • R" + ranking.finalRound}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Fun Stats */}
      <div className="mt-6 xl:mt-8 pt-4 xl:pt-6 border-t border-gray-600">
        <h3 className="text-base xl:text-lg 2xl:text-xl font-semibold mb-3">
          Battle Statistics
        </h3>
        <div className="grid grid-cols-2 gap-3 xl:gap-4 text-xs xl:text-sm 2xl:text-base">
          <div className="bg-surface-light p-2 xl:p-3 rounded">
            <div className="text-text-muted">Most Revived</div>
            <div className="font-bold text-sm xl:text-base 2xl:text-lg text-green-400 mt-1">
              {getMostRevived(rankings)}
            </div>
          </div>

          <div className="bg-surface-light p-2 xl:p-3 rounded">
            <div className="text-text-muted">Most Deadly</div>
            <div className="font-bold text-sm xl:text-base 2xl:text-lg text-danger mt-1">
              {getMostDeadly(rankings)}
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
