"use client";

import { useState, useEffect } from "react";
import BattleRoyaleResults from "./BattleRoyaleResults";
import { Player } from "./PlayerList";
import type { BattleRoyaleRanking } from "../page";
import styles from "./GameSplash.module.css";

type GamePhase = "setup" | "finished";

interface GameSplashProps {
  phase: GamePhase;
  players: Player[];
  totalRounds: number;
  finalRankings: BattleRoyaleRanking[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onStartGame: () => void;
  onPlayAgain: () => void;
  onNewGame: () => void;
}

export default function GameSplash({
  phase,
  players,
  totalRounds,
  finalRankings,
  onAddPlayer,
  onRemovePlayer,
  onStartGame,
  onPlayAgain,
  onNewGame,
}: GameSplashProps) {
  const [playerName, setPlayerName] = useState("");
  const [savedPlayers, setSavedPlayers] = useState<string[]>([]);
  const [presetPlayers, setPresetPlayers] = useState<string[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);

  const canStart = players.length >= 2;


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

  // Dynamic title based on phase
  const renderTitle = () => {
    if (phase === "setup") {
      return (
        <>
          <span className={styles.accent}>Wheel</span> of Ethereal
        </>
      );
    }
    return (
      <>
        <span className={styles.accent}>Battle</span> Complete
      </>
    );
  };

  // Dynamic subtitle based on phase
  const renderSubtitle = () => {
    if (phase === "setup") {
      return "Choose your mode and add players to begin";
    }
    return `${players.length} players competed over ${totalRounds} rounds`;
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

              {players.length < 2 && (
                <p className={styles.helperText}>Add at least 2 players to start (max 64)</p>
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
              Start Battle Royale
            </button>

            {!canStart && (
              <p className={styles.startHint}>
                Add at least 2 players to begin
              </p>
            )}
          </>
        )}

        {/* Results Content */}
        {phase === "finished" && (
          <>
            <div className={styles.resultsWrapper}>
              <BattleRoyaleResults
                rankings={finalRankings}
                totalPlayers={players.length}
                totalRounds={totalRounds}
                compact={false}
              />
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
