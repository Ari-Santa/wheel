"use client";

import BattleRoyaleResults from "./BattleRoyaleResults";
import { Player } from "./PlayerList";
import type { BattleRoyaleRanking } from "../page";

interface ResultsSplashProps {
  mode: "normal" | "battle-royale";
  players: Player[];
  finalRankings: BattleRoyaleRanking[];
  totalRounds: number;
  targetPoints?: number;
  onPlayAgain: () => void;
  onNewGame: () => void;
}

export default function ResultsSplash({
  mode,
  players,
  finalRankings,
  totalRounds,
  targetPoints,
  onPlayAgain,
  onNewGame,
}: ResultsSplashProps) {
  // Sort players by score for normal mode
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto px-4 py-4 lg:py-6">
        {/* Title Section */}
        <header className="text-center mb-4 lg:mb-6 animate-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2">
            {mode === "battle-royale" ? (
              <>
                <span className="text-accent">Battle</span> Complete
              </>
            ) : (
              <>
                <span className="text-accent">Game</span> Over
              </>
            )}
          </h1>
          <p className="text-text-muted text-sm md:text-base">
            {mode === "battle-royale"
              ? `${players.length} players competed over ${totalRounds} rounds`
              : `Target: ${targetPoints} points • ${players.length} players`}
          </p>
        </header>

        {/* Results Content */}
        <div className="mb-4 lg:mb-6 animate-fade-in">
          {mode === "battle-royale" ? (
            /* Battle Royale Results - Reuse existing component */
            <BattleRoyaleResults
              rankings={finalRankings}
              totalPlayers={players.length}
              totalRounds={totalRounds}
              compact={false}
            />
          ) : (
            /* Normal Mode Leaderboard */
            <div className="bg-surface rounded-xl p-6">
              <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold mb-3 lg:mb-4 text-accent text-center">
                Final Leaderboard
              </h2>

              {/* Winner Spotlight */}
              {winner && (
                <div className="mb-4 lg:mb-6 bg-accent/20 border-2 border-accent rounded-xl p-4 lg:p-6 text-center">
                  <div className="text-4xl lg:text-5xl mb-2">🏆</div>
                  <div className="text-2xl lg:text-3xl font-bold text-accent mb-1">
                    {winner.name}
                  </div>
                  <div className="text-xl text-yellow-400 font-bold">
                    {winner.score} points
                  </div>
                  <div className="text-sm text-text-muted mt-2">
                    {mode === "normal" && targetPoints ? `Reached ${targetPoints} point target!` : "Champion"}
                  </div>
                </div>
              )}

              {/* Full Rankings */}
              <div className="space-y-2">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                      index === 0
                        ? "bg-accent/10 border border-accent"
                        : index === 1
                        ? "bg-gray-400/10"
                        : index === 2
                        ? "bg-amber-700/10"
                        : "bg-surface-light"
                    }`}
                  >
                    {/* Rank Badge */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        index === 0
                          ? "bg-yellow-500 text-black"
                          : index === 1
                          ? "bg-gray-400 text-black"
                          : index === 2
                          ? "bg-amber-700 text-white"
                          : "bg-surface-light text-text-muted"
                      }`}
                    >
                      {index === 0 ? "🏆" : index + 1}
                    </div>

                    {/* Player Name */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lg truncate">
                        {player.name}
                      </div>
                    </div>

                    {/* Score */}
                    <div
                      className={`font-mono font-bold text-xl ${
                        player.score > 0
                          ? "text-success"
                          : player.score < 0
                          ? "text-danger"
                          : "text-text-muted"
                      }`}
                    >
                      {player.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          <button
            onClick={onPlayAgain}
            className="py-4 rounded-xl font-bold text-lg uppercase tracking-wider bg-accent hover:bg-accent-hover text-white shadow-lg hover:shadow-xl transition-all"
          >
            Play Again
          </button>
          <button
            onClick={onNewGame}
            className="py-4 rounded-xl font-bold text-lg uppercase tracking-wider bg-surface-light hover:bg-gray-500 text-white shadow-lg hover:shadow-xl transition-all"
          >
            New Game
          </button>
        </div>

        <p className="text-center text-text-muted text-sm mt-4">
          Play Again keeps same players and mode • New Game returns to setup
        </p>
      </div>
    </div>
  );
}
