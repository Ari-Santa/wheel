"use client";

import { useState, useEffect } from "react";
import { Player } from "./PlayerList";

interface SetupSplashProps {
  mode: "normal" | "battle-royale";
  players: Player[];
  targetPoints: number;
  onModeChange: (mode: "normal" | "battle-royale") => void;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onTargetPointsChange: (points: number) => void;
  onStartGame: () => void;
}

export default function SetupSplash({
  mode,
  players,
  targetPoints,
  onModeChange,
  onAddPlayer,
  onRemovePlayer,
  onTargetPointsChange,
  onStartGame,
}: SetupSplashProps) {
  const [playerName, setPlayerName] = useState("");
  const [savedPlayers, setSavedPlayers] = useState<string[]>([]);
  const [presetPlayers, setPresetPlayers] = useState<string[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [targetInput, setTargetInput] = useState(targetPoints.toString());

  const canStart =
    (mode === "normal" && players.length > 0 && targetPoints >= 100 && targetPoints <= 10000) ||
    (mode === "battle-royale" && players.length >= 2);

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
          // Fallback to env var if API fails
          const envPlayers = process.env.NEXT_PUBLIC_PRESET_PLAYERS
            ? process.env.NEXT_PUBLIC_PRESET_PLAYERS.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          setPresetPlayers(envPlayers);
        }
      } catch (error) {
        console.error("Failed to fetch FC members:", error);
        // Fallback to env var
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

      // Add to saved players if not already there
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

  // Remove from saved players
  const removeFromSaved = (name: string) => {
    const updated = savedPlayers.filter((n) => n !== name);
    setSavedPlayers(updated);
    localStorage.setItem("wheeloffortune_saved_players", JSON.stringify(updated));
  };

  // Clear all saved
  const clearAllSaved = () => {
    setSavedPlayers([]);
    localStorage.removeItem("wheeloffortune_saved_players");
  };

  // Add saved player to game
  const addSavedPlayerToGame = (name: string) => {
    if (!players.some((p) => p.name === name)) {
      onAddPlayer(name);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        {/* Title Section */}
        <header className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold mb-2">
            <span className="text-accent">Wheel</span> of Ethereal
          </h1>
          <p className="text-text-muted text-sm md:text-base">
            Choose your mode and add players to begin
          </p>
        </header>

        {/* Mode Selection */}
        <div className="bg-surface rounded-xl p-6 mb-6 animate-fade-in">
          <h2 className="text-xl font-bold mb-4 text-accent">Game Mode</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onModeChange("normal")}
              className={`px-6 py-4 rounded-lg font-semibold transition-all ${
                mode === "normal"
                  ? "bg-accent text-white shadow-lg"
                  : "bg-surface-light text-text-muted hover:bg-surface-light/70"
              }`}
            >
              <div className="text-lg">Normal Mode</div>
              <div className="text-xs mt-1 opacity-80">Points-based game</div>
            </button>
            <button
              onClick={() => onModeChange("battle-royale")}
              className={`px-6 py-4 rounded-lg font-semibold transition-all ${
                mode === "battle-royale"
                  ? "bg-accent text-white shadow-lg"
                  : "bg-surface-light text-text-muted hover:bg-surface-light/70"
              }`}
            >
              <div className="text-lg">Battle Royale</div>
              <div className="text-xs mt-1 opacity-80">Last one standing</div>
            </button>
          </div>
        </div>

        {/* Normal Mode Configuration */}
        {mode === "normal" && (
          <div className="bg-surface rounded-xl p-6 mb-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4 text-accent">Game Settings</h2>

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2 block">
                  Target Points to Win
                </span>
                <input
                  type="number"
                  value={targetInput}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  min={100}
                  max={10000}
                  step={50}
                  className="w-full px-4 py-3 bg-surface-light rounded-lg text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <span className="text-xs text-text-muted mt-1 block">
                  First player to reach this score wins (100-10,000)
                </span>
              </label>

              {/* Quick Presets */}
              <div className="flex gap-2">
                <span className="text-sm text-text-muted self-center">Quick:</span>
                {[300, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setTargetInput(preset.toString());
                      onTargetPointsChange(preset);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      targetPoints === preset
                        ? "bg-accent text-white"
                        : "bg-surface-light text-text-muted hover:bg-surface-light/70"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Player Setup */}
        <div className="bg-surface rounded-xl p-6 mb-6 animate-fade-in">
          <h2 className="text-xl font-bold mb-4 text-accent">Players</h2>

          {/* Add Player Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 24))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddPlayer();
              }}
              placeholder="Enter player name"
              className="flex-1 px-4 py-2 bg-surface-light rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              maxLength={24}
            />
            <button
              onClick={handleAddPlayer}
              disabled={!playerName.trim()}
              className="px-6 py-2 bg-accent hover:bg-accent-hover disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
            >
              Add
            </button>
          </div>

          {/* FC Members Preset Section */}
          {(loadingPresets || presetPlayers.length > 0) && (
            <div className="mb-4 pb-4 border-b border-gray-600">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-text-muted uppercase tracking-wide">
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
                    className="text-sm text-accent hover:text-accent-hover transition-colors font-semibold"
                  >
                    Add All
                  </button>
                )}
              </div>

              {loadingPresets ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {presetPlayers.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        if (!players.some((p) => p.name === name)) {
                          onAddPlayer(name);
                        }
                      }}
                      disabled={players.some((p) => p.name === name)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        players.some((p) => p.name === name)
                          ? "bg-surface-light/30 text-text-muted cursor-default"
                          : "bg-purple-500/20 border border-purple-500 text-purple-300 hover:bg-purple-500/30 cursor-pointer"
                      }`}
                      title={players.some((p) => p.name === name) ? "Already added" : "Click to add"}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Saved Players Section */}
          {savedPlayers.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-600">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                  Recently Used ({savedPlayers.length})
                </label>
                <button
                  onClick={clearAllSaved}
                  className="text-sm text-text-muted hover:text-danger transition-colors"
                  title="Clear all saved players"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {savedPlayers.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-1.5 bg-accent/20 border border-accent rounded-full px-3 py-1.5 text-xs font-medium"
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
                      className="text-text-muted hover:text-danger transition-colors text-sm leading-none"
                      title="Remove from saved"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Battle Royale Helper Text */}
          {mode === "battle-royale" && players.length < 2 && (
            <p className="text-sm text-text-muted mb-4">
              Add at least 2 players to start Battle Royale (max 64)
            </p>
          )}

          {/* Player List Header */}
          {players.length > 0 && (
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                Current Players ({players.length})
              </label>
              <button
                onClick={() => {
                  players.forEach((player) => onRemovePlayer(player.id));
                }}
                className="text-sm text-text-muted hover:text-danger transition-colors"
                title="Remove all players from the game"
              >
                Remove All
              </button>
            </div>
          )}

          {/* Player List */}
          {players.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-surface-light/50 rounded-lg px-4 py-2"
                >
                  <span className="font-medium">{player.name}</span>
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="text-text-muted hover:text-danger transition-colors text-xl leading-none"
                    aria-label={`Remove ${player.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-center py-4">
              No players added yet
            </p>
          )}
        </div>

        {/* Start Game Button */}
        <button
          onClick={onStartGame}
          disabled={!canStart}
          className={`w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all ${
            canStart
              ? "bg-accent hover:bg-accent-hover text-white shadow-lg hover:shadow-xl"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          }`}
        >
          {mode === "battle-royale" ? "Start Battle Royale" : "Start Game"}
        </button>

        {!canStart && (
          <p className="text-center text-text-muted text-sm mt-2">
            {mode === "battle-royale"
              ? "Add at least 2 players to begin"
              : players.length === 0
              ? "Add at least 1 player to begin"
              : "Set a valid target (100-10,000 points)"}
          </p>
        )}
      </div>
    </div>
  );
}
