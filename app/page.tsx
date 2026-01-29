"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Wheel, { WheelSegment, WheelRef } from "./components/Wheel";
import PlayerList, { Player } from "./components/PlayerList";
import SetupSplash from "./components/SetupSplash";
import ResultsSplash from "./components/ResultsSplash";

type GameMode = "normal" | "battle-royale";
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

const NORMAL_SEGMENTS: WheelSegment[] = [
  { label: "Lucky! +100", color: "#e67e22" },
  { label: "Unlucky -50", color: "#8e44ad" },
  { label: "Spin Again", color: "#2980b9" },
  { label: "Double Pts", color: "#27ae60" },
  { label: "Lose Turn", color: "#c0392b" },
  { label: "Bonus Round", color: "#f39c12" },
  { label: "+50 Points", color: "#1abc9c" },
  { label: "-25 Points", color: "#e74c3c" },
];

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

  // Normal mode - show point changes
  if (detail.includes("points")) {
    if (detail.includes("Gained") || detail.includes("Won")) {
      return <span className="text-success">{detail}</span>;
    } else if (detail.includes("Lost")) {
      return <span className="text-danger">{detail}</span>;
    }
  }

  // Spin Again
  if (detail.includes("Spin Again")) {
    return <span className="text-accent">{detail}</span>;
  }

  // Default: return as-is with muted color
  return <span className="text-text-muted">{detail}</span>;
}

function useResponsiveWheelSize() {
  const [wheelSize, setWheelSize] = useState(500);

  useEffect(() => {
    function updateSize() {
      if (window.matchMedia('(min-width: 1536px)').matches) {
        setWheelSize(750);  // 2xl: 1440p screens
      } else if (window.matchMedia('(min-width: 1280px)').matches) {
        setWheelSize(600);  // xl: large desktops
      } else if (window.matchMedia('(min-width: 1024px)').matches) {
        setWheelSize(500);  // lg: standard desktops
      } else if (window.matchMedia('(min-width: 640px)').matches) {
        setWheelSize(380);  // sm: tablets
      } else {
        setWheelSize(280);  // mobile
      }
    }

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return wheelSize;
}

export default function Home() {
  const [mode, setMode] = useState<GameMode>(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("wheeloffortune_game_mode");
        if (saved === "normal" || saved === "battle-royale") {
          return saved;
        }
      } catch (error) {
        console.error("Failed to load game mode preference:", error);
      }
    }
    return "normal"; // Default to normal mode
  });
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(1);
  const [autoSpinEnabled, setAutoSpinEnabled] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("wheeloffortune_auto_spin");
        if (saved !== null) {
          return saved === "true";
        }
      } catch (error) {
        console.error("Failed to load auto-spin preference:", error);
      }
    }
    return true; // Default to enabled
  });
  const [finalRankings, setFinalRankings] = useState<BattleRoyaleRanking[]>([]);
  const [targetPoints, setTargetPoints] = useState(500);
  const autoSpinTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wheelRef = useRef<WheelRef>(null);
  const wheelSize = useResponsiveWheelSize();

  const segments = mode === "normal" ? NORMAL_SEGMENTS : BATTLE_SEGMENTS;
  const activePlayers = players.filter((p) => p.status === "active");

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
      if (mode === "battle-royale" && players.length >= 64) return;
      setPlayers((prev) => [...prev, createPlayer(name)]);
    },
    [mode, players.length],
  );

  const removePlayer = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const startGame = useCallback(() => {
    if (mode === "normal" && players.length === 0) return;
    if (mode === "battle-royale" && players.length < 2) return;
    setPhase("playing");
    setCurrentPlayerIndex(0);
    setResults([]);
    setLastResult(null);
    setRound(1);
    setPlayers((prev) => prev.map((p) => ({ ...p, status: "active" as const, score: 0 })));
  }, [mode, players.length]);

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

  const handleNormalResult = useCallback(
    (segment: WheelSegment) => {
      const currentPlayer = activePlayers[currentPlayerIndex % activePlayers.length];
      if (!currentPlayer) return;

      let detail = "";
      let scoreChange = 0;

      switch (segment.label) {
        case "Lucky! +100":
          scoreChange = 100;
          detail = `${currentPlayer.name} got lucky! +100 points!`;
          break;
        case "Unlucky -50":
          scoreChange = -50;
          detail = `${currentPlayer.name} was unlucky. -50 points.`;
          break;
        case "Spin Again":
          detail = `${currentPlayer.name} gets to spin again!`;
          break;
        case "Double Pts":
          scoreChange = currentPlayer.score;
          detail = `${currentPlayer.name} doubled their points! +${currentPlayer.score} points!`;
          break;
        case "Lose Turn":
          detail = `${currentPlayer.name} lost their turn.`;
          break;
        case "Bonus Round":
          scoreChange = 75;
          detail = `${currentPlayer.name} hit the bonus! +75 points!`;
          break;
        case "+50 Points":
          scoreChange = 50;
          detail = `${currentPlayer.name} earned +50 points!`;
          break;
        case "-25 Points":
          scoreChange = -25;
          detail = `${currentPlayer.name} lost 25 points.`;
          break;
      }

      // Calculate new score
      const newScore = currentPlayer.score + scoreChange;

      // Update player scores
      const updatedPlayers = players.map((p) =>
        p.id === currentPlayer.id ? { ...p, score: newScore } : p
      );
      setPlayers(updatedPlayers);

      const result: GameResult = {
        playerName: currentPlayer.name,
        segment: segment.label,
        detail,
      };
      setLastResult(result);
      setResults((prev) => [result, ...prev].slice(0, 20));

      // Check if player reached target
      let gameEnded = false;
      if (newScore >= targetPoints) {
        gameEnded = true;

        // Mark player as winner
        const playersWithWinner = updatedPlayers.map((p) =>
          p.id === currentPlayer.id ? { ...p, status: "winner" as const } : p
        );
        setPlayers(playersWithWinner);

        // Show victory message
        setLastResult({
          playerName: currentPlayer.name,
          segment: "WINNER!",
          detail: `${currentPlayer.name} reached ${targetPoints} points and wins the game!`,
        });

        // Transition to finished phase
        setPhase("finished");
      } else {
        // Move to next player unless "Spin Again"
        if (segment.label !== "Spin Again") {
          const playerIdx = players.findIndex((p) => p.id === currentPlayer.id);
          const nextIdx = getNextActivePlayerIndex(playerIdx, updatedPlayers);
          setCurrentPlayerIndex(nextIdx);
        }
      }

      setSpinning(false);

      // Trigger autospin after result is displayed (only if game not ended)
      if (autoSpinEnabled && phase === "playing" && !gameEnded) {
        if (autoSpinTimerRef.current) {
          clearTimeout(autoSpinTimerRef.current);
        }
        autoSpinTimerRef.current = setTimeout(() => {
          wheelRef.current?.spin();
        }, 2000);
      }
    },
    [activePlayers, currentPlayerIndex, players, getNextActivePlayerIndex, autoSpinEnabled, phase, targetPoints],
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
      if (remaining.length <= 1 && mode === "battle-royale") {
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
    [players, currentPlayerIndex, mode, getNextActivePlayerIndex, autoSpinEnabled, round, calculateRankings],
  );

  const handleResult = useCallback(
    (segment: WheelSegment) => {
      if (mode === "normal") {
        handleNormalResult(segment);
      } else {
        handleBattleResult(segment);
      }
    },
    [mode, handleNormalResult, handleBattleResult],
  );

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
      {/* Setup Splash Screen */}
      {phase === "setup" && (
        <SetupSplash
          mode={mode}
          players={players}
          targetPoints={targetPoints}
          onModeChange={(newMode) => {
            setMode(newMode);
            setPlayers([]);
            // Save mode preference to localStorage
            try {
              localStorage.setItem("wheeloffortune_game_mode", newMode);
            } catch (error) {
              console.error("Failed to save game mode preference:", error);
            }
          }}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          onTargetPointsChange={setTargetPoints}
          onStartGame={startGame}
        />
      )}

      {/* Results Splash Screen */}
      {phase === "finished" && (
        <ResultsSplash
          mode={mode}
          players={players}
          finalRankings={finalRankings}
          totalRounds={round}
          targetPoints={mode === "normal" ? targetPoints : undefined}
          onPlayAgain={() => {
            // Reset scores and status, keep players and mode AND TARGET
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
            // targetPoints stays the same for Play Again
          }}
          onNewGame={() => {
            // Return to setup (reset everything including target)
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
            setPlayers([]);
            // Load mode from localStorage or default to normal
            try {
              const savedMode = localStorage.getItem("wheeloffortune_game_mode");
              if (savedMode === "normal" || savedMode === "battle-royale") {
                setMode(savedMode);
              } else {
                setMode("normal");
              }
            } catch (error) {
              console.error("Failed to load game mode preference:", error);
              setMode("normal");
            }
            setTargetPoints(500);  // Reset to default
          }}
        />
      )}

      {/* Battle Result Overlay - Fixed at top */}
      {lastResult && !spinning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-surface/95 backdrop-blur-sm border-2 border-accent rounded-xl px-6 py-4 shadow-2xl max-w-md xl:max-w-lg 2xl:max-w-xl mx-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm xl:text-base 2xl:text-lg font-bold text-accent mb-1 uppercase tracking-wide">
                  {lastResult.segment}
                </div>
                <p className="text-base xl:text-lg 2xl:text-xl font-medium text-white">
                  {lastResult.detail}
                </p>
              </div>
              <button
                onClick={() => setLastResult(null)}
                className="text-text-muted hover:text-white transition-colors shrink-0 text-xl leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen bg-background py-4 px-4">
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-2 xl:gap-4 2xl:gap-6">
        {/* Left Panel: Players */}
        <div className="lg:w-72 xl:w-80 2xl:w-96 shrink-0">
          {/* Only show PlayerList during gameplay, not setup */}
          {phase !== "setup" && (
            <>
              <PlayerList
                players={players}
                currentPlayerIndex={currentPlayerIndex}
                onAddPlayer={addPlayer}
                onRemovePlayer={removePlayer}
                gameActive={true}
                mode={mode}
              />

              {/* Game Controls */}
              <div className="mt-4 space-y-2">
                {(phase === "playing" || phase === "finished") && (
                  <button
                    onClick={resetGame}
                    className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider bg-surface-light hover:bg-gray-500 text-white transition-all"
                  >
                    Reset Game
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Center: Wheel */}
        <div className="flex-1 flex flex-col items-center">
          {/* Current Player Banner */}
          {phase === "playing" && currentPlayerName && (
            <div className="mb-2 bg-surface rounded-xl px-5 py-2 text-center fade-in">
              <span className="text-text-muted text-xs xl:text-sm 2xl:text-base">Current Player</span>
              <p className="text-lg xl:text-xl 2xl:text-2xl font-bold text-accent">{currentPlayerName}</p>
              {mode === "battle-royale" ? (
                <span className="text-text-muted text-xs xl:text-sm 2xl:text-base">
                  Round {round} &middot; {activePlayers.length} remaining
                </span>
              ) : (
                <span className="text-text-muted text-xs xl:text-sm 2xl:text-base">
                  Target: {targetPoints} points
                </span>
              )}
            </div>
          )}

          <Wheel
            ref={wheelRef}
            segments={segments}
            onResult={handleResult}
            spinning={spinning}
            onSpinStart={handleSpinStart}
            disabled={!canSpin}
            size={wheelSize}
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
          />

        </div>

        {/* Right Panel: Results Log */}
        <div className="lg:w-64 xl:w-72 2xl:w-80 shrink-0">
          <div className="bg-surface rounded-xl p-4">
            <h2 className="text-lg xl:text-xl 2xl:text-2xl font-bold mb-3 text-accent">Results</h2>
            {results.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">
                No spins yet
              </p>
            ) : (
              <div className="space-y-2 max-h-96 xl:max-h-[540px] 2xl:max-h-[650px] overflow-y-auto">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="bg-surface-light/50 rounded-lg px-2.5 py-2 text-xs xl:text-sm"
                  >
                    {/* Player name and segment on first line */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-accent truncate text-sm">
                        {r.playerName}
                      </span>
                      <span className="text-text-muted text-[10px]">
                        {r.segment}
                      </span>
                    </div>

                    {/* Detail with visual formatting */}
                    <div className="text-[10px] leading-tight">
                      {formatResultDetail(r.detail)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Normal Mode Scoreboard */}
          {mode === "normal" && players.length > 0 && phase !== "setup" && (
            <div className="bg-surface rounded-xl p-4 mt-4">
              <h2 className="text-lg xl:text-xl 2xl:text-2xl font-bold mb-3 text-accent">Scoreboard</h2>
              <div className="space-y-1">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-sm xl:text-base 2xl:text-lg px-2 py-1 rounded bg-surface-light/30"
                    >
                      <span className="truncate">{p.name}</span>
                      <span
                        className={`font-mono font-bold ml-2 ${
                          p.score > 0
                            ? "text-success"
                            : p.score < 0
                              ? "text-danger"
                              : "text-text-muted"
                        }`}
                      >
                        {p.score}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
    </>
  );
}
