"use client";

import { useState, useCallback, useRef, useEffect, startTransition } from "react";
import Wheel, { WheelSegment, WheelRef } from "./components/Wheel";
import PlayerList, { Player } from "./components/PlayerList";
import GameSplash from "./components/GameSplash";
import styles from "./page.module.css";

type GamePhase = "setup" | "playing" | "finished";

interface GameResult {
  playerName: string;
  segment: string;
  detail: string;
}

export interface BattleRoyaleRanking {
  playerId: string;
  playerName: string;
  rank: number;  // 1 = winner, 2 = 2nd place, 3 = 3rd place
  eliminationCause?: string;
  eliminatedBy?: string;
  finalRound: number;
  survivedRounds: number;
  revivedCount: number;
}

const BATTLE_SEGMENTS: WheelSegment[] = [
  { label: "Victory", color: "#27ae60" },
  { label: "Defeat", color: "#c0392b" },
  { label: "Immunity", color: "#2980b9" },
  { label: "Double Elim", color: "#8e44ad" },
  { label: "Sudden Death", color: "#e74c3c" },
  { label: "Extra Life", color: "#f39c12" },
  { label: "Victory", color: "#1abc9c" },
  { label: "Defeat", color: "#e67e22" },
];

let playerIdCounter = 0;

function createPlayer(name: string): Player {
  return {
    id: `player-${++playerIdCounter}`,
    name,
    status: "active",
    score: 0,
  };
}

/**
 * Formats the result detail string with appropriate styling and icons
 */
function formatResultDetail(detail: string): React.ReactNode {
  // Battle Royale specific formatting
  if (detail.includes("eliminated") || detail.includes("survive") || detail.includes("revived")) {

    // Double Elimination - highlight both players
    if (detail.includes("Double elimination!")) {
      const match = detail.match(/Double elimination! (.+) and (.+) are both eliminated!/);
      if (match) {
        return (
          <span className="text-danger">
            ⚔️ {match[1]} & {match[2]} eliminated
          </span>
        );
      }
    }

    // Extra Life - show who revived who
    if (detail.includes("revived")) {
      const match = detail.match(/Extra Life! (.+) revived (.+)!/);
      if (match) {
        return (
          <span className="text-green-400">
            💚 Revived <span className="font-semibold">{match[2]}</span>
          </span>
        );
      }
    }

    // Defeat
    if (detail.includes("defeated and eliminated")) {
      return <span className="text-danger">☠️ Eliminated</span>;
    }

    // Sudden Death
    if (detail.includes("Sudden Death!")) {
      if (detail.includes("survived!")) {
        return <span className="text-green-400">🍀 Survived Sudden Death!</span>;
      } else {
        return <span className="text-red-500">☠️ Died in Sudden Death</span>;
      }
    }

    // Immunity
    if (detail.includes("immunity")) {
      return <span className="text-blue-400">🛡️ Gained Immunity</span>;
    }
  }

  // Default: return as-is with muted color
  return <span className="text-text-muted">{detail}</span>;
}

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(1);
  const [autoSpinEnabled, setAutoSpinEnabled] = useState(true);
  const [finalRankings, setFinalRankings] = useState<BattleRoyaleRanking[]>([]);
  const [riggedEnabled, setRiggedEnabled] = useState(false);
  const autoSpinTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wheelRef = useRef<WheelRef>(null);

  const segments = BATTLE_SEGMENTS;
  const activePlayers = players.filter((p) => p.status === "active");

  // Load preferences from localStorage after mount (client-side only)
  useEffect(() => {
    try {
      const savedAutoSpin = localStorage.getItem("wheeloffortune_auto_spin");
      if (savedAutoSpin !== null) {
        startTransition(() => {
          setAutoSpinEnabled(savedAutoSpin === "true");
        });
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    }
  }, []);

  // Cleanup autospin timer on unmount
  useEffect(() => {
    return () => {
      if (autoSpinTimerRef.current) {
        clearTimeout(autoSpinTimerRef.current);
      }
    };
  }, []);

  // Auto-dismiss result overlay after 5 seconds
  useEffect(() => {
    if (lastResult && !spinning) {
      const timer = setTimeout(() => {
        setLastResult(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastResult, spinning]);

  const addPlayer = useCallback(
    (name: string) => {
      if (players.length >= 64) return;
      setPlayers((prev) => [...prev, createPlayer(name)]);
    },
    [players.length],
  );

  const removePlayer = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const startGame = useCallback(() => {
    if (players.length < 2) return;
    setPhase("playing");
    setCurrentPlayerIndex(0);
    setResults([]);
    setLastResult(null);
    setRound(1);
    setPlayers((prev) => prev.map((p) => ({ ...p, status: "active" as const, score: 0 })));
  }, [players.length]);

  const resetGame = useCallback(() => {
    // Cancel any in-progress spin
    if (wheelRef.current) {
      wheelRef.current.cancelSpin();
    }
    // Clear auto-spin timer
    if (autoSpinTimerRef.current) {
      clearTimeout(autoSpinTimerRef.current);
      autoSpinTimerRef.current = null;
    }
    // Keep auto-spin preference as-is (don't reset)
    setPhase("setup");
    setSpinning(false);
    setResults([]);
    setLastResult(null);
    setCurrentPlayerIndex(0);
    setRound(1);
    setFinalRankings([]);
    setPlayers((prev) => prev.map((p) => ({ ...p, status: "active" as const, score: 0 })));
  }, []);

  const getNextActivePlayerIndex = useCallback(
    (fromIndex: number, playerList: Player[]): number => {
      const total = playerList.length;
      let idx = (fromIndex + 1) % total;
      let attempts = 0;
      while (playerList[idx].status !== "active" && attempts < total) {
        idx = (idx + 1) % total;
        attempts++;
      }
      return idx;
    },
    [],
  );

  const calculateRankings = useCallback((playerList: Player[], totalRounds: number): BattleRoyaleRanking[] => {
    const winner = playerList.find(p => p.status === "winner");
    const eliminated = playerList.filter(p => p.status === "eliminated");

    // Sort by timestamp DESC (most recent elimination = highest rank)
    const sortedEliminated = [...eliminated].sort((a, b) => {
      if (!a.eliminationData || !b.eliminationData) return 0;
      return b.eliminationData.timestamp - a.eliminationData.timestamp;
    });

    const rankings: BattleRoyaleRanking[] = [];

    // Winner = rank 1
    if (winner) {
      rankings.push({
        playerId: winner.id,
        playerName: winner.name,
        rank: 1,
        finalRound: totalRounds,
        survivedRounds: totalRounds,
        revivedCount: winner.revivedCount || 0,
      });
    }

    // Eliminated players = ranks 2, 3, 4, ...
    sortedEliminated.forEach((player, index) => {
      rankings.push({
        playerId: player.id,
        playerName: player.name,
        rank: index + 2,
        eliminationCause: player.eliminationData?.cause,
        eliminatedBy: player.eliminationData?.eliminatedBy,
        finalRound: player.eliminationData?.round || 0,
        survivedRounds: player.eliminationData?.round || 0,
        revivedCount: player.revivedCount || 0,
      });
    });

    return rankings;
  }, []);

  const handleBattleResult = useCallback(
    (segment: WheelSegment) => {
      const currentPlayer = players[currentPlayerIndex];
      if (!currentPlayer || currentPlayer.status !== "active") return;

      let detail = "";
      const updatedPlayers = [...players];

      switch (segment.label) {
        case "Victory":
          detail = `${currentPlayer.name} is victorious! Advances to next round.`;
          break;
        case "Defeat": {
          updatedPlayers[currentPlayerIndex] = {
            ...currentPlayer,
            status: "eliminated",
            eliminationData: {
              cause: "Defeat",
              round: round,
              timestamp: Date.now(),
            },
          };
          detail = `${currentPlayer.name} has been defeated and eliminated!`;
          break;
        }
        case "Immunity":
          detail = `${currentPlayer.name} gained immunity! Safe this round.`;
          break;
        case "Double Elim": {
          // Eliminate current player (spinner)
          const spinnerTimestamp = Date.now();
          updatedPlayers[currentPlayerIndex] = {
            ...currentPlayer,
            status: "eliminated",
            eliminationData: {
              cause: "Double Elimination",
              round: round,
              timestamp: spinnerTimestamp,
            },
          };
          const otherActive = updatedPlayers.filter(
            (p, i) => p.status === "active" && i !== currentPlayerIndex,
          );
          if (otherActive.length > 0) {
            const victim = otherActive[Math.floor(Math.random() * otherActive.length)];
            const victimIdx = updatedPlayers.findIndex((p) => p.id === victim.id);
            updatedPlayers[victimIdx] = {
              ...victim,
              status: "eliminated",
              eliminationData: {
                cause: "Double Elimination",
                eliminatedBy: currentPlayer.name,
                round: round,
                timestamp: spinnerTimestamp + 1,  // +1ms ensures victim ranks below spinner
              },
            };
            detail = `Double elimination! ${currentPlayer.name} and ${victim.name} are both eliminated!`;
          } else {
            detail = `${currentPlayer.name} has been eliminated!`;
          }
          break;
        }
        case "Sudden Death":
          // 50/50 chance of elimination
          if (Math.random() < 0.5) {
            updatedPlayers[currentPlayerIndex] = {
              ...currentPlayer,
              status: "eliminated",
              eliminationData: {
                cause: "Sudden Death",
                round: round,
                timestamp: Date.now(),
              },
            };
            detail = `Sudden Death! ${currentPlayer.name} didn't survive!`;
          } else {
            detail = `Sudden Death! ${currentPlayer.name} survived!`;
          }
          break;
        case "Extra Life": {
          // Revive a random eliminated player
          const eliminated = updatedPlayers.filter((p) => p.status === "eliminated");
          if (eliminated.length > 0) {
            const revived = eliminated[Math.floor(Math.random() * eliminated.length)];
            const revivedIdx = updatedPlayers.findIndex((p) => p.id === revived.id);
            updatedPlayers[revivedIdx] = {
              ...revived,
              status: "active",
              revivedCount: (revived.revivedCount || 0) + 1,
            };
            detail = `Extra Life! ${currentPlayer.name} revived ${revived.name}!`;
          } else {
            detail = `${currentPlayer.name} found an Extra Life, but no one to revive!`;
          }
          break;
        }
      }

      setPlayers(updatedPlayers);

      const result: GameResult = {
        playerName: currentPlayer.name,
        segment: segment.label,
        detail,
      };
      setLastResult(result);
      setResults((prev) => [result, ...prev].slice(0, 30));

      // Check for winner
      const remaining = updatedPlayers.filter((p) => p.status === "active");
      let gameEnded = false;
      if (remaining.length <= 1) {
        gameEnded = true;
        if (remaining.length === 1) {
          const winnerIdx = updatedPlayers.findIndex((p) => p.id === remaining[0].id);
          updatedPlayers[winnerIdx] = { ...remaining[0], status: "winner" };
          setPlayers(updatedPlayers);
          setLastResult({
            playerName: remaining[0].name,
            segment: "WINNER",
            detail: `${remaining[0].name} is the last one standing! Champion!`,
          });
        } else {
          // No survivors
          setLastResult({
            playerName: "No Survivors",
            segment: "GAME OVER",
            detail: "All players have been eliminated! No champion!",
          });
        }
        // Calculate final rankings
        const rankings = calculateRankings(updatedPlayers, round);
        setFinalRankings(rankings);
        setPhase("finished");
      } else {
        // Move to next active player
        const nextIdx = getNextActivePlayerIndex(currentPlayerIndex, updatedPlayers);
        setCurrentPlayerIndex(nextIdx);

        // Check if we completed a round
        if (nextIdx <= currentPlayerIndex) {
          setRound((r) => r + 1);
        }
      }

      setSpinning(false);

      // Trigger autospin if game is still playing
      if (autoSpinEnabled && !gameEnded) {
        if (autoSpinTimerRef.current) {
          clearTimeout(autoSpinTimerRef.current);
        }
        autoSpinTimerRef.current = setTimeout(() => {
          wheelRef.current?.spin();
        }, 2000);
      }
    },
    [players, currentPlayerIndex, getNextActivePlayerIndex, autoSpinEnabled, round, calculateRankings],
  );

  const handleResult = handleBattleResult;

  const handleSpinStart = useCallback(() => {
    setSpinning(true);
    setLastResult(null);
  }, []);

  const canSpin =
    phase === "playing" &&
    !spinning &&
    activePlayers.length > 0 &&
    players[currentPlayerIndex]?.status === "active";

  const currentPlayerName =
    phase === "playing" && players[currentPlayerIndex]
      ? players[currentPlayerIndex].name
      : null;

  return (
    <>
      {/* Game Splash - Setup or Results */}
      {(phase === "setup" || phase === "finished") && (
        <GameSplash
          phase={phase}
          players={players}
          totalRounds={round}
          finalRankings={finalRankings}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          onStartGame={startGame}
          onPlayAgain={() => {
            setPhase("playing");
            setCurrentPlayerIndex(0);
            setResults([]);
            setLastResult(null);
            setRound(1);
            setFinalRankings([]);
            setPlayers((prev) => prev.map((p) => ({
              ...p,
              status: "active" as const,
              score: 0,
              eliminationData: undefined,
              revivedCount: 0,
            })));
          }}
          onNewGame={() => {
            if (wheelRef.current) {
              wheelRef.current.cancelSpin();
            }
            if (autoSpinTimerRef.current) {
              clearTimeout(autoSpinTimerRef.current);
              autoSpinTimerRef.current = null;
            }
            setPhase("setup");
            setSpinning(false);
            setResults([]);
            setLastResult(null);
            setCurrentPlayerIndex(0);
            setRound(1);
            setFinalRankings([]);
            setPlayers([]);
          }}
        />
      )}


      {/* Battle Result Overlay - Fixed at top */}
      {lastResult && !spinning && (
        <div className={styles.resultOverlay}>
          <div className={styles.resultCard}>
            <div className={styles.resultCardInner}>
              <div className={styles.resultContent}>
                <div className={styles.resultSegment}>
                  {lastResult.segment}
                </div>
                <p className={styles.resultDetail}>
                  {lastResult.detail}
                </p>
              </div>
              <button
                onClick={() => setLastResult(null)}
                className={styles.dismissButton}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={styles.main}>
      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Panel: Players */}
        <div className={styles.leftPanel}>
          {/* Only show PlayerList during gameplay, not setup */}
          {phase !== "setup" && (
            <>
              <PlayerList
                players={players}
                currentPlayerIndex={currentPlayerIndex}
                onAddPlayer={addPlayer}
                onRemovePlayer={removePlayer}
                gameActive={true}
                mode="battle-royale"
              />

              {/* Game Controls */}
              <div className={styles.gameControls}>
                {(phase === "playing" || phase === "finished") && (
                  <button
                    onClick={resetGame}
                    className={styles.resetButton}
                  >
                    Reset Game
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Center: Wheel */}
        <div className={styles.centerPanel}>
          {/* Current Player Banner */}
          {phase === "playing" && currentPlayerName && (
            <div className={styles.currentPlayerBanner}>
              <span className={styles.currentPlayerLabel}>Current Player</span>
              <p className={styles.currentPlayerName}>{currentPlayerName}</p>
              <span className={styles.currentPlayerStatus}>
                Round {round} &middot; {activePlayers.length} remaining
              </span>
            </div>
          )}

          <Wheel
            ref={wheelRef}
            segments={segments}
            onResult={handleResult}
            spinning={spinning}
            onSpinStart={handleSpinStart}
            disabled={!canSpin}
            autoSpinEnabled={autoSpinEnabled}
            onAutoSpinChange={(enabled) => {
              setAutoSpinEnabled(enabled);
              // Save to localStorage
              try {
                localStorage.setItem("wheeloffortune_auto_spin", enabled.toString());
              } catch (error) {
                console.error("Failed to save auto-spin preference:", error);
              }
              // Clear timer if disabling
              if (!enabled && autoSpinTimerRef.current) {
                clearTimeout(autoSpinTimerRef.current);
                autoSpinTimerRef.current = null;
              }
            }}
            showAutoSpin={phase === "playing"}
            riggedEnabled={riggedEnabled}
            onRiggedChange={players.some(p => p.name.toLowerCase() === "ari santa") ? setRiggedEnabled : undefined}
            currentPlayerName={currentPlayerName}
            riggedPlayerName="Ari Santa"
          />

        </div>

        {/* Right Panel: Results Log */}
        <div className={styles.rightPanel}>
          <div className={styles.resultsPanel}>
            <h2 className={styles.panelTitle}>Results</h2>
            {results.length === 0 ? (
              <p className={styles.emptyMessage}>
                No spins yet
              </p>
            ) : (
              <div className={styles.resultsList}>
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={styles.resultItem}
                  >
                    {/* Player name and segment on first line */}
                    <div className={styles.resultItemHeader}>
                      <span className={styles.resultPlayerName}>
                        {r.playerName}
                      </span>
                      <span className={styles.resultSegmentName}>
                        {r.segment}
                      </span>
                    </div>

                    {/* Detail with visual formatting */}
                    <div className={styles.resultItemDetail}>
                      {formatResultDetail(r.detail)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
    </>
  );
}
