"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./PlayerList.module.css";

export interface Player {
  id: string;
  name: string;
  status: "active" | "eliminated" | "winner";
  score: number;
  eliminationData?: {
    cause: "Defeat" | "Double Elimination" | "Sudden Death";
    eliminatedBy?: string;  // Player name who caused elimination (Double Elim only)
    round: number;
    timestamp: number;  // For precise ordering (Date.now())
  };
  revivedCount?: number;  // Times revived by Extra Life
}

interface PlayerListProps {
  players: Player[];
  currentPlayerIndex: number;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  gameActive: boolean;
  mode: "normal" | "battle-royale";
}

const SAVED_PLAYERS_KEY = "wheeloffortune_saved_players";

const presetPlayers: string[] = process.env.NEXT_PUBLIC_PRESET_PLAYERS
  ? process.env.NEXT_PUBLIC_PRESET_PLAYERS.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

export default function PlayerList({
  players,
  currentPlayerIndex,
  onAddPlayer,
  onRemovePlayer,
  gameActive,
  mode,
}: PlayerListProps) {
  const [newName, setNewName] = useState("");
  const [savedPlayers, setSavedPlayers] = useState<string[]>(() => {
    // Initialize from localStorage
    try {
      const stored = localStorage.getItem(SAVED_PLAYERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // Silently handle parse errors
    }
    return [];
  });

  const saveToStorage = (name: string) => {
    setSavedPlayers((prev) => {
      const updated = prev.includes(name) ? prev : [...prev, name];
      try {
        localStorage.setItem(SAVED_PLAYERS_KEY, JSON.stringify(updated));
      } catch {
        // Silently handle quota exceeded or other errors
      }
      return updated;
    });
  };

  const removeFromSaved = (name: string) => {
    setSavedPlayers((prev) => {
      const updated = prev.filter((p) => p !== name);
      try {
        localStorage.setItem(SAVED_PLAYERS_KEY, JSON.stringify(updated));
      } catch {
        // Silently handle errors
      }
      return updated;
    });
  };

  const clearAllSaved = () => {
    setSavedPlayers([]);
    try {
      localStorage.removeItem(SAVED_PLAYERS_KEY);
    } catch {
      // Silently handle errors
    }
  };

  const addSavedPlayerToGame = (name: string) => {
    onAddPlayer(name);
    saveToStorage(name);
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddPlayer(trimmed);
    saveToStorage(trimmed);
    setNewName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const compact = players.length >= 16;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const playerItemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Auto-scroll to current player during gameplay
  useEffect(() => {
    if (gameActive && currentPlayerIndex >= 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const currentPlayerElement = playerItemRefs.current[currentPlayerIndex];

      if (currentPlayerElement && container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = currentPlayerElement.getBoundingClientRect();

        // Check if element is out of view
        const isAboveView = elementRect.top < containerRect.top;
        const isBelowView = elementRect.bottom > containerRect.bottom;

        if (isAboveView || isBelowView) {
          // Scroll element into view within container only
          const elementTop = currentPlayerElement.offsetTop;
          const containerHeight = container.clientHeight;
          const elementHeight = currentPlayerElement.offsetHeight;

          let targetScroll;
          if (isAboveView) {
            // Scroll to top of element
            targetScroll = elementTop;
          } else {
            // Scroll to bottom of element
            targetScroll = elementTop - containerHeight + elementHeight;
          }

          container.scrollTo({
            top: targetScroll,
            behavior: "smooth"
          });
        }
      }
    }
  }, [currentPlayerIndex, gameActive]);

  const getPlayerItemClass = (player: Player, index: number) => {
    if (player.status === "eliminated") {
      return compact ? styles.playerItemEliminatedCompact : styles.playerItemEliminated;
    }
    if (player.status === "winner") {
      return compact ? styles.playerItemWinnerCompact : styles.playerItemWinner;
    }
    if (index === currentPlayerIndex && gameActive) {
      return compact ? styles.playerItemCurrentCompact : styles.playerItemCurrent;
    }
    return compact ? styles.playerItemCompact : styles.playerItem;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Players</h2>

      {!gameActive && (
        <div className={styles.inputRow}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter player name"
            maxLength={24}
            className={styles.input}
          />
          <button
            onClick={handleAdd}
            className={styles.addButton}
          >
            Add
          </button>
        </div>
      )}

      {mode === "battle-royale" && !gameActive && (
        <p className={styles.battleRoyaleHint}>
          {players.length < 2
            ? `Add at least ${2 - players.length} more player${players.length === 0 ? "s" : ""}`
            : `${players.length} players ready`}
        </p>
      )}

      {/* FC Members Preset Section */}
      {!gameActive && presetPlayers.length > 0 && (
        <div className={styles.presetSection}>
          <div className={styles.sectionHeader}>
            <label className={styles.sectionLabel}>
              FC Members ({presetPlayers.length})
            </label>
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
          </div>
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
                className={players.some((p) => p.name === name) ? styles.presetTagDisabled : styles.presetTag}
                title={players.some((p) => p.name === name) ? "Already in game" : "Add to game"}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Saved Players Section */}
      {!gameActive && savedPlayers.length > 0 && (
        <div className={styles.presetSection}>
          <div className={styles.sectionHeader}>
            <label className={styles.sectionLabel}>
              Saved Players ({savedPlayers.length})
            </label>
            <button
              onClick={clearAllSaved}
              className={styles.clearAllButton}
              title="Clear all saved players"
            >
              Clear All
            </button>
          </div>
          <div className={styles.tagContainer}>
            {savedPlayers.map((name) => (
              <div
                key={name}
                className={styles.savedTag}
              >
                <button
                  onClick={() => addSavedPlayerToGame(name)}
                  className={styles.savedTagName}
                  title="Add to game"
                >
                  {name}
                </button>
                <button
                  onClick={() => removeFromSaved(name)}
                  className={styles.savedTagRemove}
                  title="Remove from saved"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={compact ? styles.scrollContainerCompact : styles.scrollContainer}
      >
        {players.length === 0 ? (
          <p className={styles.emptyMessage}>No players yet</p>
        ) : (
          <ul className={compact ? styles.playerListCompact : styles.playerList}>
            {players.map((player, index) => (
              <li
                key={player.id}
                ref={(el) => {
                  playerItemRefs.current[index] = el;
                }}
                className={getPlayerItemClass(player, index)}
              >
                <div className={styles.playerInfo}>
                  {player.status === "winner" && (
                    <span className={styles.winnerIcon}>&#9733;</span>
                  )}
                  {player.status === "eliminated" && (
                    <span className={styles.eliminatedIcon}>&#10005;</span>
                  )}
                  {player.status === "active" && index === currentPlayerIndex && gameActive && (
                    <span className={styles.currentIcon}>&#9654;</span>
                  )}
                  <span className={styles.playerName}>{player.name}</span>
                  {mode === "normal" && player.score !== 0 && (
                    <span className={player.score > 0 ? styles.scorePositive : styles.scoreNegative}>
                      ({player.score > 0 ? "+" : ""}{player.score})
                    </span>
                  )}
                </div>

                {!gameActive && (
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className={styles.removeButton}
                    title="Remove player"
                  >
                    &#10005;
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
