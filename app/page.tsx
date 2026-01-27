"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Wheel, { WheelSegment, WheelRef } from "./components/Wheel";
import PlayerList, { Player } from "./components/PlayerList";

type GameMode = "normal" | "battle-royale";
type GamePhase = "setup" | "playing" | "finished";

interface GameResult {
  playerName: string;
  segment: string;
  detail: string;
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

export default function Home() {
  const [mode, setMode] = useState<GameMode>("normal");
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(1);
  const [autoSpinEnabled, setAutoSpinEnabled] = useState(false);
  const autoSpinTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wheelRef = useRef<WheelRef>(null);

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
    if (autoSpinTimerRef.current) {
      clearTimeout(autoSpinTimerRef.current);
      autoSpinTimerRef.current = null;
    }
    setAutoSpinEnabled(false);
    setPhase("setup");
    setSpinning(false);
    setResults([]);
    setLastResult(null);
    setCurrentPlayerIndex(0);
    setRound(1);
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

      setPlayers((prev) =>
        prev.map((p) =>
          p.id === currentPlayer.id ? { ...p, score: p.score + scoreChange } : p,
        ),
      );

      const result: GameResult = {
        playerName: currentPlayer.name,
        segment: segment.label,
        detail,
      };
      setLastResult(result);
      setResults((prev) => [result, ...prev].slice(0, 20));

      // Move to next player unless "Spin Again"
      if (segment.label !== "Spin Again") {
        const playerIdx = players.findIndex((p) => p.id === currentPlayer.id);
        const nextIdx = getNextActivePlayerIndex(playerIdx, players);
        setCurrentPlayerIndex(nextIdx);
      }

      setSpinning(false);

      // Trigger autospin after result is displayed
      if (autoSpinEnabled && phase === "playing") {
        if (autoSpinTimerRef.current) {
          clearTimeout(autoSpinTimerRef.current);
        }
        autoSpinTimerRef.current = setTimeout(() => {
          wheelRef.current?.spin();
        }, 2000);
      }
    },
    [activePlayers, currentPlayerIndex, players, getNextActivePlayerIndex, autoSpinEnabled, phase],
  );

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
          };
          detail = `${currentPlayer.name} has been defeated and eliminated!`;
          break;
        }
        case "Immunity":
          detail = `${currentPlayer.name} gained immunity! Safe this round.`;
          break;
        case "Double Elim": {
          // Eliminate current player and a random other active player
          updatedPlayers[currentPlayerIndex] = {
            ...currentPlayer,
            status: "eliminated",
          };
          const otherActive = updatedPlayers.filter(
            (p, i) => p.status === "active" && i !== currentPlayerIndex,
          );
          if (otherActive.length > 0) {
            const victim = otherActive[Math.floor(Math.random() * otherActive.length)];
            const victimIdx = updatedPlayers.findIndex((p) => p.id === victim.id);
            updatedPlayers[victimIdx] = { ...victim, status: "eliminated" };
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
            updatedPlayers[revivedIdx] = { ...revived, status: "active" };
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
        }
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
    [players, currentPlayerIndex, mode, getNextActivePlayerIndex, autoSpinEnabled],
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
    <main className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold">
          <span className="text-accent">Wheel</span> of Ethereal
        </h1>

        {/* Mode Selector */}
        {phase === "setup" && (
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => {
                setMode("normal");
                setPlayers([]);
              }}
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
                mode === "normal"
                  ? "bg-accent text-white"
                  : "bg-surface text-text-muted hover:bg-surface-light"
              }`}
            >
              Normal Mode
            </button>
            <button
              onClick={() => {
                setMode("battle-royale");
                setPlayers([]);
              }}
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
                mode === "battle-royale"
                  ? "bg-accent text-white"
                  : "bg-surface text-text-muted hover:bg-surface-light"
              }`}
            >
              Battle Royale
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
        {/* Left Panel: Players */}
        <div className="lg:w-72 shrink-0">
          <PlayerList
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            onAddPlayer={addPlayer}
            onRemovePlayer={removePlayer}
            gameActive={phase !== "setup"}
            mode={mode}
          />

          {/* Game Controls */}
          <div className="mt-4 space-y-2">
            {phase === "setup" && (
              <button
                onClick={startGame}
                disabled={
                  (mode === "normal" && players.length === 0) ||
                  (mode === "battle-royale" && players.length < 2)
                }
                className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                  (mode === "normal" && players.length === 0) ||
                  (mode === "battle-royale" && players.length < 2)
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-accent hover:bg-accent-hover text-white"
                }`}
              >
                {mode === "battle-royale" ? "Start Battle Royale" : "Start Game"}
              </button>
            )}
            {(phase === "playing" || phase === "finished") && (
              <button
                onClick={resetGame}
                className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider bg-surface-light hover:bg-gray-500 text-white transition-all"
              >
                Reset Game
              </button>
            )}
          </div>
        </div>

        {/* Center: Wheel */}
        <div className="flex-1 flex flex-col items-center">
          {/* Current Player Banner */}
          {phase === "playing" && currentPlayerName && (
            <div className="mb-4 bg-surface rounded-xl px-6 py-3 text-center fade-in">
              <span className="text-text-muted text-sm">Current Player</span>
              <p className="text-xl font-bold text-accent">{currentPlayerName}</p>
              {mode === "battle-royale" && (
                <span className="text-text-muted text-xs">
                  Round {round} &middot; {activePlayers.length} remaining
                </span>
              )}
            </div>
          )}

          {phase === "finished" && (
            <div className="mb-4 bg-accent/20 border border-accent rounded-xl px-8 py-4 text-center fade-in">
              <p className="text-2xl font-bold text-accent">Game Over!</p>
              {players.find((p) => p.status === "winner") && (
                <p className="text-lg mt-1">
                  &#9733;{" "}
                  <span className="text-yellow-400 font-bold">
                    {players.find((p) => p.status === "winner")?.name}
                  </span>{" "}
                  wins! &#9733;
                </p>
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
            size={480}
          />

          {/* Autospin Toggle */}
          {phase === "playing" && (
            <div className="mt-4 flex items-center justify-center gap-3 bg-surface rounded-lg px-4 py-3">
              <input
                type="checkbox"
                id="autospin-toggle"
                checked={autoSpinEnabled}
                onChange={(e) => {
                  setAutoSpinEnabled(e.target.checked);
                  if (!e.target.checked && autoSpinTimerRef.current) {
                    clearTimeout(autoSpinTimerRef.current);
                    autoSpinTimerRef.current = null;
                  }
                }}
                className="cursor-pointer accent-accent"
              />
              <label htmlFor="autospin-toggle" className="text-sm font-medium cursor-pointer">
                Autospin (2s delay)
              </label>
            </div>
          )}

          {/* Last Result */}
          {lastResult && !spinning && (
            <div className="mt-6 bg-surface rounded-xl px-6 py-4 text-center max-w-md fade-in">
              <div className="text-sm text-text-muted mb-1">{lastResult.segment}</div>
              <p className="text-base font-medium">{lastResult.detail}</p>
            </div>
          )}
        </div>

        {/* Right Panel: Results Log */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-surface rounded-xl p-4">
            <h2 className="text-lg font-bold mb-3 text-accent">Results</h2>
            {results.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">
                No spins yet
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="bg-surface-light/50 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-accent">
                      {r.playerName}
                    </span>
                    <span className="text-text-muted"> &mdash; {r.segment}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Normal Mode Scoreboard */}
          {mode === "normal" && players.length > 0 && phase !== "setup" && (
            <div className="bg-surface rounded-xl p-4 mt-4">
              <h2 className="text-lg font-bold mb-3 text-accent">Scoreboard</h2>
              <div className="space-y-1">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-sm px-2 py-1 rounded bg-surface-light/30"
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
  );
}
