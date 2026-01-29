"use client";

import { useState } from "react";

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

  return (
    <div className="bg-surface rounded-xl p-4 xl:p-5 2xl:p-6 w-full">
      <h2 className="text-lg xl:text-xl 2xl:text-2xl font-bold mb-3 text-accent">Players</h2>

      {!gameActive && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter player name"
            maxLength={24}
            className="flex-1 bg-surface-light border border-gray-600 rounded-lg px-3 py-2 xl:py-2.5 2xl:py-3 text-sm xl:text-base 2xl:text-lg text-white placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleAdd}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 xl:py-2.5 2xl:py-3 rounded-lg text-sm xl:text-base 2xl:text-lg font-semibold transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {mode === "battle-royale" && !gameActive && (
        <p className="text-text-muted text-xs mb-3">
          {players.length < 2
            ? `Add at least ${2 - players.length} more player${players.length === 0 ? "s" : ""}`
            : `${players.length} players ready`}
        </p>
      )}

      {/* FC Members Preset Section */}
      {!gameActive && presetPlayers.length > 0 && (
        <div className="mb-4 pb-4 border-b border-gray-600">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
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
              className="text-xs text-accent hover:text-accent-hover transition-colors font-semibold"
            >
              Add All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {presetPlayers.map((name) => (
              <button
                key={name}
                onClick={() => {
                  if (!players.some((p) => p.name === name)) {
                    onAddPlayer(name);
                  }
                }}
                disabled={players.some((p) => p.name === name)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  players.some((p) => p.name === name)
                    ? "bg-surface-light/30 text-text-muted cursor-default"
                    : "bg-purple-500/20 border border-purple-500 hover:text-purple-300 cursor-pointer"
                }`}
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
        <div className="mb-4 pb-4 border-b border-gray-600">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Saved Players ({savedPlayers.length})
            </label>
            <button
              onClick={clearAllSaved}
              className="text-xs text-text-muted hover:text-danger transition-colors"
              title="Clear all saved players"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedPlayers.map((name) => (
              <div
                key={name}
                className="flex items-center gap-1 bg-accent/20 border border-accent rounded-full px-3 py-1 text-xs"
              >
                <button
                  onClick={() => addSavedPlayerToGame(name)}
                  className="hover:text-accent transition-colors cursor-pointer"
                  title="Add to game"
                >
                  {name}
                </button>
                <button
                  onClick={() => removeFromSaved(name)}
                  className="text-text-muted hover:text-danger ml-1 transition-colors"
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
        className={`overflow-y-auto ${compact ? "max-h-80 xl:max-h-[500px] 2xl:max-h-[600px]" : "max-h-96 xl:max-h-[540px] 2xl:max-h-[650px]"}`}
        style={{ scrollbarGutter: "stable" }}
      >
        {players.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-4">No players yet</p>
        ) : (
          <ul className={`space-y-${compact ? "1" : "2"}`}>
            {players.map((player, index) => (
              <li
                key={player.id}
                className={`
                  flex items-center justify-between rounded-lg transition-all duration-200
                  ${compact ? "px-2 py-1 text-sm xl:text-base 2xl:text-lg" : "px-3 py-2 text-sm xl:text-base 2xl:text-lg"}
                  ${
                    player.status === "eliminated"
                      ? "player-eliminated bg-surface-light/30"
                      : player.status === "winner"
                        ? "bg-accent/20 border border-accent"
                        : index === currentPlayerIndex && gameActive
                          ? "bg-accent/20 border border-accent"
                          : "bg-surface-light/50"
                  }
                `}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {player.status === "winner" && (
                    <span className="text-yellow-400 shrink-0">&#9733;</span>
                  )}
                  {player.status === "eliminated" && (
                    <span className="text-danger shrink-0 text-xs">&#10005;</span>
                  )}
                  {player.status === "active" && index === currentPlayerIndex && gameActive && (
                    <span className="text-accent shrink-0">&#9654;</span>
                  )}
                  <span className="truncate text-sm">{player.name}</span>
                  {mode === "normal" && player.score !== 0 && (
                    <span className={`text-xs ml-1 ${player.score > 0 ? "text-success" : "text-danger"}`}>
                      ({player.score > 0 ? "+" : ""}{player.score})
                    </span>
                  )}
                </div>

                {!gameActive && (
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="text-text-muted hover:text-danger ml-2 shrink-0 transition-colors"
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
