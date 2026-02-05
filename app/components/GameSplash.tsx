"use client";

import { useState, useEffect } from "react";
import BattleRoyaleResults from "./BattleRoyaleResults";
import { Player } from "./PlayerList";
import type { BattleRoyaleRanking } from "../page";
import styles from "./GameSplash.module.css";

type GamePhase = "setup" | "finished";

interface GameSplashProps {
  phase: GamePhase;
  mode: "normal" | "battle-royale";
  players: Player[];
  targetPoints: number;
  totalRounds: number;
  finalRankings: BattleRoyaleRanking[];
  onModeChange: (mode: "normal" | "battle-royale") => void;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onTargetPointsChange: (points: number) => void;
  onStartGame: () => void;
  onPlayAgain: () => void;
  onNewGame: () => void;
}

export default function GameSplash({
  phase,
  mode,
  players,
  targetPoints,
  totalRounds,
  finalRankings,
  onModeChange,
  onAddPlayer,
  onRemovePlayer,
  onTargetPointsChange,
  onStartGame,
  onPlayAgain,
  onNewGame,
}: GameSplashProps) {
  const [playerName, setPlayerName] = useState("");
  const [savedPlayers, setSavedPlayers] = useState<string[]>([]);
  const [presetPlayers, setPresetPlayers] = useState<string[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [targetInput, setTargetInput] = useState(targetPoints.toString());

  const canStart =
    (mode === "normal" && players.length > 0 && targetPoints >= 100 && targetPoints <= 10000) ||
    (mode === "battle-royale" && players.length >= 2);

  // Sort players by score for normal mode results
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  // Sync target input with prop when it changes
  useEffect(() => {
    setTargetInput(targetPoints.toString());
  }, [targetPoints]);

  // Fetch FC members from API on mount
  useEffect(() => {
    const fetchFCMembers = async () => {
      try {
        setLoadingPresets(true);
        const response = await fetch("/api/fc-members");
        const data = await response.json();

        if (data.names && Array.isArray(data.names)) {
          setPresetPlayers(data.names);
        } else {
          const envPlayers = process.env.NEXT_PUBLIC_PRESET_PLAYERS
            ? process.env.NEXT_PUBLIC_PRESET_PLAYERS.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          setPresetPlayers(envPlayers);
        }
      } catch (error) {
        console.error("Failed to fetch FC members:", error);
        const envPlayers = process.env.NEXT_PUBLIC_PRESET_PLAYERS
          ? process.env.NEXT_PUBLIC_PRESET_PLAYERS.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        setPresetPlayers(envPlayers);
      } finally {
        setLoadingPresets(false);
      }
    };

    fetchFCMembers();
  }, []);

  // Load saved players on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wheeloffortune_saved_players");
      if (saved) {
        setSavedPlayers(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load saved players:", error);
    }
  }, []);

  const handleAddPlayer = () => {
    if (playerName.trim()) {
      onAddPlayer(playerName.trim());
      const trimmedName = playerName.trim();
      if (!savedPlayers.includes(trimmedName)) {
        const updated = [...savedPlayers, trimmedName];
        setSavedPlayers(updated);
        localStorage.setItem("wheeloffortune_saved_players", JSON.stringify(updated));
      }
      setPlayerName("");
    }
  };

  const handleTargetChange = (value: string) => {
    setTargetInput(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 100 && numValue <= 10000) {
      onTargetPointsChange(numValue);
    }
  };

  const removeFromSaved = (name: string) => {
    const updated = savedPlayers.filter((n) => n !== name);
    setSavedPlayers(updated);
    localStorage.setItem("wheeloffortune_saved_players", JSON.stringify(updated));
  };

  const clearAllSaved = () => {
    setSavedPlayers([]);
    localStorage.removeItem("wheeloffortune_saved_players");
  };

  const addSavedPlayerToGame = (name: string) => {
    if (!players.some((p) => p.name === name)) {
      onAddPlayer(name);
    }
  };

  const getPlayerRowClass = (index: number) => {
    if (index === 0) return styles.playerRowFirst;
    if (index === 1) return styles.playerRowSecond;
    if (index === 2) return styles.playerRowThird;
    return styles.playerRowDefault;
  };

  const getRankBadgeClass = (index: number) => {
    if (index === 0) return styles.rankBadgeFirst;
    if (index === 1) return styles.rankBadgeSecond;
    if (index === 2) return styles.rankBadgeThird;
    return styles.rankBadgeDefault;
  };

  const getScoreClass = (score: number) => {
    if (score > 0) return styles.scorePositive;
    if (score < 0) return styles.scoreNegative;
    return styles.scoreNeutral;
  };

  // Dynamic title based on phase
  const renderTitle = () => {
    if (phase === "setup") {
      return (
        <>
          <span className={styles.accent}>Wheel</span> of Ethereal
        </>
      );
    }
    return mode === "battle-royale" ? (
      <>
        <span className={styles.accent}>Battle</span> Complete
      </>
    ) : (
      <>
        <span className={styles.accent}>Game</span> Over
      </>
    );
  };

  // Dynamic subtitle based on phase
  const renderSubtitle = () => {
    if (phase === "setup") {
      return "Choose your mode and add players to begin";
    }
    return mode === "battle-royale"
      ? `${players.length} players competed over ${totalRounds} rounds`
      : `Target: ${targetPoints} points | ${players.length} players`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        {/* Title Section */}
        <header className={styles.header}>
          <h1 className={styles.title}>{renderTitle()}</h1>
          <p className={styles.subtitle}>{renderSubtitle()}</p>
        </header>

        {/* Setup Content */}
        {phase === "setup" && (
          <>
            {/* Mode Selection */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Game Mode</h2>
              <div className={styles.modeGrid}>
                <button
                  onClick={() => onModeChange("normal")}
                  className={mode === "normal" ? styles.modeButtonActive : styles.modeButton}
                >
                  <div className={styles.modeTitle}>Normal Mode</div>
                  <div className={styles.modeSubtitle}>Points-based game</div>
                </button>
                <button
                  onClick={() => onModeChange("battle-royale")}
                  className={mode === "battle-royale" ? styles.modeButtonActive : styles.modeButton}
                >
                  <div className={styles.modeTitle}>Battle Royale</div>
                  <div className={styles.modeSubtitle}>Last one standing</div>
                </button>
              </div>
            </div>

            {/* Normal Mode Configuration */}
            {mode === "normal" && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Game Settings</h2>
                <div className={styles.settingsBlock}>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Target Points to Win</span>
                    <input
                      type="number"
                      value={targetInput}
                      onChange={(e) => handleTargetChange(e.target.value)}
                      min={100}
                      max={10000}
                      step={50}
                      className={styles.targetInput}
                    />
                    <span className={styles.labelHint}>
                      First player to reach this score wins (100-10,000)
                    </span>
                  </label>
                  <div className={styles.quickPresetsRow}>
                    <span className={styles.quickLabel}>Quick:</span>
                    {[300, 500, 1000, 2000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          setTargetInput(preset.toString());
                          onTargetPointsChange(preset);
                        }}
                        className={targetPoints === preset ? styles.presetButtonActive : styles.presetButton}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Player Setup */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Players</h2>

              <div className={styles.inputRow}>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 24))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddPlayer();
                  }}
                  placeholder="Enter player name"
                  className={styles.playerInput}
                  maxLength={24}
                />
                <button
                  onClick={handleAddPlayer}
                  disabled={!playerName.trim()}
                  className={styles.addButton}
                >
                  Add
                </button>
              </div>

              {/* FC Members */}
              {(loadingPresets || presetPlayers.length > 0) && (
                <div className={styles.fcSection}>
                  <div className={styles.sectionHeader}>
                    <label className={styles.sectionLabel}>
                      {loadingPresets ? "Loading FC Members..." : `FC Members (${presetPlayers.length})`}
                    </label>
                    {!loadingPresets && presetPlayers.length > 0 && (
                      <button
                        onClick={() => {
                          const playerNames = players.map((p) => p.name);
                          for (const name of presetPlayers) {
                            if (!playerNames.includes(name)) {
                              onAddPlayer(name);
                              playerNames.push(name);
                            }
                          }
                        }}
                        className={styles.addAllButton}
                      >
                        Add All
                      </button>
                    )}
                  </div>
                  {loadingPresets ? (
                    <div className={styles.loadingSpinner}>
                      <div className={styles.spinner}></div>
                    </div>
                  ) : (
                    <div className={styles.tagContainer}>
                      {presetPlayers.map((name) => (
                        <button
                          key={name}
                          onClick={() => {
                            if (!players.some((p) => p.name === name)) {
                              onAddPlayer(name);
                            }
                          }}
                          disabled={players.some((p) => p.name === name)}
                          className={players.some((p) => p.name === name) ? styles.fcTagDisabled : styles.fcTag}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Saved Players */}
              {savedPlayers.length > 0 && (
                <div className={styles.fcSection}>
                  <div className={styles.sectionHeader}>
                    <label className={styles.sectionLabel}>Recently Used ({savedPlayers.length})</label>
                    <button onClick={clearAllSaved} className={styles.clearButton}>
                      Clear All
                    </button>
                  </div>
                  <div className={styles.tagContainer}>
                    {savedPlayers.map((name) => (
                      <div key={name} className={styles.savedTag}>
                        <button onClick={() => addSavedPlayerToGame(name)} className={styles.savedTagName}>
                          {name}
                        </button>
                        <button onClick={() => removeFromSaved(name)} className={styles.savedTagRemove}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mode === "battle-royale" && players.length < 2 && (
                <p className={styles.helperText}>Add at least 2 players to start Battle Royale (max 64)</p>
              )}

              {players.length > 0 && (
                <div className={styles.playerListHeader}>
                  <label className={styles.playerListLabel}>Players ({players.length})</label>
                  <button
                    onClick={() => players.forEach((player) => onRemovePlayer(player.id))}
                    className={styles.clearPlayersButton}
                  >
                    Clear
                  </button>
                </div>
              )}

              {players.length > 0 ? (
                <div className={styles.playerGrid}>
                  {players.map((player) => (
                    <div key={player.id} className={styles.playerChip}>
                      <span className={styles.playerName}>{player.name}</span>
                      <button
                        onClick={() => onRemovePlayer(player.id)}
                        className={styles.removePlayerButton}
                        aria-label={`Remove ${player.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyMessage}>No players added yet</p>
              )}
            </div>

            {/* Start Button */}
            <button onClick={onStartGame} disabled={!canStart} className={styles.startButton}>
              {mode === "battle-royale" ? "Start Battle Royale" : "Start Game"}
            </button>

            {!canStart && (
              <p className={styles.startHint}>
                {mode === "battle-royale"
                  ? "Add at least 2 players to begin"
                  : players.length === 0
                  ? "Add at least 1 player to begin"
                  : "Set a valid target (100-10,000 points)"}
              </p>
            )}
          </>
        )}

        {/* Results Content */}
        {phase === "finished" && (
          <>
            <div className={styles.resultsWrapper}>
              {mode === "battle-royale" ? (
                <BattleRoyaleResults
                  rankings={finalRankings}
                  totalPlayers={players.length}
                  totalRounds={totalRounds}
                  compact={false}
                />
              ) : (
                <div className={styles.leaderboardContainer}>
                  <h2 className={styles.leaderboardTitle}>Final Leaderboard</h2>

                  {winner && (
                    <div className={styles.winnerSpotlight}>
                      <div className={styles.winnerTrophy}>🏆</div>
                      <div className={styles.winnerName}>{winner.name}</div>
                      <div className={styles.winnerScore}>{winner.score} points</div>
                      <div className={styles.winnerSubtitle}>
                        {targetPoints ? `Reached ${targetPoints} point target!` : "Champion"}
                      </div>
                    </div>
                  )}

                  <div className={styles.rankingsList}>
                    {sortedPlayers.map((player, index) => (
                      <div key={player.id} className={getPlayerRowClass(index)}>
                        <div className={getRankBadgeClass(index)}>{index === 0 ? "🏆" : index + 1}</div>
                        <div className={styles.playerNameWrapper}>
                          <div className={styles.playerName}>{player.name}</div>
                        </div>
                        <div className={getScoreClass(player.score)}>{player.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={styles.buttonsContainer}>
              <button onClick={onPlayAgain} className={styles.buttonPrimary}>
                Play Again
              </button>
              <button onClick={onNewGame} className={styles.buttonSecondary}>
                New Game
              </button>
            </div>

            <p className={styles.footer}>Play Again keeps same players and mode | New Game returns to setup</p>
          </>
        )}
      </div>
    </div>
  );
}
