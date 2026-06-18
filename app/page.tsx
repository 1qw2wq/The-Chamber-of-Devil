"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Flame, 
  Sparkles, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Eye, 
  HelpCircle, 
  TrendingUp,
  Skull,
  Crosshair,
  User,
  Heart,
  Plus,
  Play,
  RotateCw,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
type Phase = "intro" | "setup" | "player-turn" | "dealer-turn" | "firing" | "round-over" | "game-over";

interface GameLog {
  id: string;
  text: string;
  type: "info" | "player" | "dealer" | "warning" | "success";
}

// Items database
const ITEM_DETAILS = {
  magnifier: {
    name: "Magnifying Glass",
    icon: "🔍",
    desc: "Inspects the current shell in the chamber, revealing if it is LIVE or BLANK.",
    usage: "Reveals shell type"
  },
  saw: {
    name: "Hand Saw",
    icon: "🪚",
    desc: "Saws off the barrel. The next shot deals DOUBLE damage (2 charges).",
    usage: "2x damage next shot"
  },
  beer: {
    name: "Can of Beer",
    icon: "🍺",
    desc: "Ejects the current shell in the chamber. Re-racks the gun safely.",
    usage: "Discards current shell"
  },
  cigs: {
    name: "Pack of Cigarettes",
    icon: "🚬",
    desc: "Restores 1 life charge to the user (cannot exceed maximum health).",
    usage: "Heals 1 charge"
  },
  cuffs: {
    name: "Steel Handcuffs",
    icon: "🔗",
    desc: "Binds the opponent, skipping their next immediate turn in the round.",
    usage: "Skips opponent's turn"
  }
};

type ItemType = keyof typeof ITEM_DETAILS;

// Browser-native audio synthesizer using Web Audio API
class GameAudio {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Lazy initialize when user interacts
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  play(type: "rack" | "shoot" | "click" | "heal" | "item" | "heartbeat" | "win" | "lose") {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      if (type === "click") {
        // Metallic tick (shotgun blank trigger)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === "rack") {
        // Double metallic clank (shotgun rack)
        const runClank = (delay: number) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          
          osc.type = "triangle";
          osc.frequency.setValueAtTime(80, now + delay);
          osc.frequency.setValueAtTime(300, now + delay + 0.02);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.setValueAtTime(0.2, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08);
          
          osc.start(now + delay);
          osc.stop(now + delay + 0.1);
        };
        runClank(0);
        runClank(0.12);
      } else if (type === "shoot") {
        // Deep explosive rumble
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(250, now);
        filter.frequency.exponentialRampToValueAtTime(30, now + 0.35);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        // Add sub bass drop
        const baseOsc = this.ctx.createOscillator();
        const baseGain = this.ctx.createGain();
        baseOsc.type = "sine";
        baseOsc.frequency.setValueAtTime(90, now);
        baseOsc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
        
        baseGain.gain.setValueAtTime(0.9, now);
        baseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        
        baseOsc.connect(baseGain);
        baseGain.connect(this.ctx.destination);

        noise.start(now);
        baseOsc.start(now);
        noise.stop(now + 0.4);
        baseOsc.stop(now + 0.4);
      } else if (type === "heal") {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.4);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === "item") {
        // Sparkle sound
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.linearRampToValueAtTime(880, now + 0.2);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(554, now);
        osc2.frequency.linearRampToValueAtTime(1108, now + 0.25);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);
      } else if (type === "heartbeat") {
        // High risk heartbeat thump
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(55, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.15);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === "win") {
        // Victory chord
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.05 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.005, now + 0.8);
          
          osc.start(now);
          osc.stop(now + 0.9);
        });
      } else if (type === "lose") {
        // Detuned sinister chord
        const notes = [110, 116, 165, 174];
        notes.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.linearRampToValueAtTime(freq - 15, now + 0.8);
          
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
          
          osc.start(now);
          osc.stop(now + 0.82);
        });
      }
    } catch (e) {
      console.warn("Audio Context blocked or failed to initialize", e);
    }
  }
}

export default function ChamberOfDevil() {
  const audio = useRef<GameAudio | null>(null);

  // Core Game State
  const [phase, setPhase] = useState<Phase>("intro");
  const [playerHealth, setPlayerHealth] = useState<number>(4);
  const [dealerHealth, setDealerHealth] = useState<number>(4);
  const [maxHealth, setMaxHealth] = useState<number>(4);
  const [roundNum, setRoundNum] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Shotgun State
  const [shotgunLoad, setShotgunLoad] = useState<("live" | "blank")[]>([]);
  const [initialLive, setInitialLive] = useState<number>(0);
  const [initialBlank, setInitialBlank] = useState<number>(0);
  const [currentLive, setCurrentLive] = useState<number>(0);
  const [currentBlank, setCurrentBlank] = useState<number>(0);
  const [spentShells, setSpentShells] = useState<("live" | "blank")[]>([]);

  // Modifiers
  const [damageMultiplier, setDamageMultiplier] = useState<number>(1);
  const [isPlayerCuffed, setIsPlayerCuffed] = useState<boolean>(false);
  const [isDealerCuffed, setIsDealerCuffed] = useState<boolean>(false);
  
  // Knowing the shell (Magnifier / Items status)
  const [knownShell, setKnownShell] = useState<"live" | "blank" | null>(null);

  // Inventories
  const [playerItems, setPlayerItems] = useState<ItemType[]>([]);
  const [dealerItems, setDealerItems] = useState<ItemType[]>([]);

  // Logs & UI
  const [logs, setLogs] = useState<GameLog[]>([
    { id: "init", text: "Welcome to The Chamber of Devil. Face the dark dealer.", type: "info" }
  ]);
  const [isUILocked, setIsUILocked] = useState<boolean>(false);
  const [gunAction, setGunAction] = useState<"idle" | "pointing-player" | "pointing-dealer" | "reloading">("idle");
  const [sawedOff, setSawedOff] = useState<boolean>(false);

  // Logs ref to auto-scroll
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Bot Logic Calculations Visible Panel Info
  const [aiAnalysis, setAiAnalysis] = useState<{
    liveProbability: number;
    recommendedShot: "player" | "dealer" | null;
    actionReason: string;
    aggression: string;
    storingReason: string;
  }>({
    liveProbability: 0,
    recommendedShot: null,
    actionReason: "Awaiting load...",
    aggression: "Neutral",
    storingReason: ""
  });

  // Sound loop trigger for heartbeat under low health
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!audio.current) {
      audio.current = new GameAudio();
    }
    audio.current.enabled = !isMuted;
  }, [isMuted]);

  // Keep logs scrolled down
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Heartbeat when health is extremely critical (1 life)
  useEffect(() => {
    if (phase === "player-turn" && playerHealth === 1) {
      const interval = setInterval(() => {
        audio.current?.play("heartbeat");
      }, 900);
      return () => clearInterval(interval);
    }
  }, [phase, playerHealth]);

  const addLog = (text: string, type: "info" | "player" | "dealer" | "warning" | "success" = "info") => {
    setLogs((prev) => [...prev, { id: Math.random().toString(), text, type }]);
  };

  // Sound wrapping
  const playSound = (type: "rack" | "shoot" | "click" | "heal" | "item" | "heartbeat" | "win" | "lose") => {
    audio.current?.play(type);
  };

  // Helper to generate dynamic items
  const generateRandomItems = (count: number): ItemType[] => {
    const items: ItemType[] = ["magnifier", "saw", "beer", "cigs", "cuffs"];
    const result: ItemType[] = [];
    for (let i = 0; i < count; i++) {
      const rand = items[Math.floor(Math.random() * items.length)];
      result.push(rand);
    }
    return result;
  };

  // Start the entire game
  const startGame = () => {
    playSound("rack");
    setPlayerHealth(4);
    setDealerHealth(4);
    setMaxHealth(4);
    setRoundNum(1);
    setSpentShells([]);
    prepareRound(1);
  };

  // Prepare a sequence of shotgun shells for a round
  const prepareRound = (currentRound: number) => {
    setIsUILocked(true);
    setPhase("setup");
    setGunAction("reloading");

    // Dynamic configuration based on the round number
    const maxLives = currentRound === 1 ? 4 : currentRound === 2 ? 5 : 6;
    setMaxHealth(maxLives);
    setPlayerHealth(maxLives);
    setDealerHealth(maxLives);

    // Shell configuration setup: between 3 and 8 total shells
    const totalShells = Math.floor(Math.random() * 5) + 3; // 3 to 7 shells
    let livesCount = Math.floor(totalShells / 2);
    if (livesCount === 0) livesCount = 1;
    const blanksCount = totalShells - livesCount;

    // Create array and shuffle
    const load: ("live" | "blank")[] = [];
    for (let i = 0; i < livesCount; i++) load.push("live");
    for (let i = 0; i < blanksCount; i++) load.push("blank");

    // Shuffle load array using Durstenfeld algorithm
    for (let i = load.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [load[i], load[j]] = [load[j], load[i]];
    }

    setShotgunLoad(load);
    setInitialLive(livesCount);
    setInitialBlank(blanksCount);
    setCurrentLive(livesCount);
    setCurrentBlank(blanksCount);

    // Critical: Ensure spent shell history is 100% reset on reload
    setSpentShells([]);
    setKnownShell(null);
    setDamageMultiplier(1);
    setSawedOff(false);
    setIsPlayerCuffed(false);
    setIsDealerCuffed(false);

    // Items setup (capped at 8 maximum inside the pocket)
    const itemsIssued = currentRound === 1 ? 2 : currentRound === 2 ? 3 : 4;
    
    setPlayerItems((prev) => {
      const updated = [...prev, ...generateRandomItems(itemsIssued)];
      return updated.slice(0, 8); // pocket is size 8
    });
    setDealerItems((prev) => {
      const updated = [...prev, ...generateRandomItems(itemsIssued)];
      return updated.slice(0, 8);
    });

    addLog(`=== SHOTGUN LOADED: ${livesCount} Live Gold, ${blanksCount} silver Blanks ===`, "info");
    addLog(`The Chamber contains ${totalShells} shells total.`, "info");

    setTimeout(() => {
      playSound("rack");
      setGunAction("idle");
      setIsUILocked(false);
      
      // Calculate initial AI stats display
      recalculateAiProbs(livesCount, blanksCount, null);
      
      // Turn goes to player
      setPhase("player-turn");
      addLog("Your turn. Choose to use items, shoot the Devil, or shoot yourself.", "player");
    }, 1800);
  };

  // Live calculation of AI risk variables for HUD and deciding action
  const recalculateAiProbs = (live: number, blank: number, known: "live" | "blank" | null) => {
    const total = live + blank;
    if (total === 0) return;

    let liveProb = live / total;
    if (known === "live") liveProb = 1;
    if (known === "blank") liveProb = 0;

    let recommended: "player" | "dealer" | null = null;
    let actionReason = "";
    let aggression = "Neutral";

    // Deciding action and logic mapping
    if (known === "live") {
      recommended = "player";
      actionReason = "The current shell is 100% verified to be LIVE. Fire at the player with zero hesitation.";
      aggression = "Ruthless";
    } else if (known === "blank") {
      recommended = "dealer"; // Shot at self preserves turn
      actionReason = "The current shell is 100% verified to be BLANK. Fire at self to preserve turn sequence.";
      aggression = "Calculated Cautious";
    } else {
      if (liveProb > 0.5) {
        recommended = "player";
        actionReason = `Live probability is high (${Math.round(liveProb * 100)}%). Statistically favors damaging the opponent.`;
        aggression = "Aggressive";
      } else if (liveProb < 0.5) {
        recommended = "dealer"; // self-shot
        actionReason = `Blank probability is high (${Math.round((1 - liveProb) * 100)}%). Statistically favors shooting self to retain turn.`;
        aggression = "Defensive";
      } else {
        // 50-50 chances
        recommended = "player";
        actionReason = "Exactly 50/50 odds. Defensive Self-shooting carries high hazard, shoot player to force high pressure.";
        aggression = "Neutral";
      }
    }

    setAiAnalysis({
      liveProbability: liveProb,
      recommendedShot: recommended,
      actionReason,
      aggression,
      storingReason: ""
    });
  };

  // Single turn fire transaction
  const executeShot = (target: "player" | "dealer") => {
    if (shotgunLoad.length === 0) return;

    setIsUILocked(true);
    setPhase("firing");
    setGunAction(target === "player" ? "pointing-player" : "pointing-dealer");

    const nextShell = shotgunLoad[0];
    const remainingLoad = shotgunLoad.slice(1);

    setTimeout(() => {
      // Update shell registers first
      const isLive = nextShell === "live";
      
      // Accurate tracking of spent vs current (fixing the core "this should not happen" bug!)
      if (isLive) {
        setCurrentLive((prev) => Math.max(0, prev - 1));
      } else {
        setCurrentBlank((prev) => Math.max(0, prev - 1));
      }

      // Add to spent shell history. Record numbers correspond exactly to sequence
      const nextSpentIdx = spentShells.length + 1;
      setSpentShells((prev) => [...prev, nextShell]);

      // Fire audio
      if (isLive) {
        playSound("shoot");
        const dmg = damageMultiplier;
        addLog(`*BANG* #${nextSpentIdx} was LIVE! Dealt ${dmg} damage to ${target === "player" ? "YOU" : "THE DEVIL"}.`, "warning");
        
        // Retract damage from target health
        let targetNewHealth = 0;
        if (target === "player") {
          setPlayerHealth((prev) => {
            targetNewHealth = Math.max(0, prev - dmg);
            return targetNewHealth;
          });
        } else {
          setDealerHealth((prev) => {
            targetNewHealth = Math.max(0, prev - dmg);
            return targetNewHealth;
          });
        }

        // Apply hit effects
        setGunAction("idle");
        setDamageMultiplier(1);
        setSawedOff(false);
        setKnownShell(null); // shell spent, reset magnifier state

        // Complete firing animation sequence
        setTimeout(() => {
          checkDamageConsequences(target, targetNewHealth, remainingLoad);
        }, 800);

      } else {
        // BLANK shell fired
        playSound("click");
        addLog(`*click* #${nextSpentIdx} was a BLANK.`, "info");
        
        setGunAction("idle");
        setDamageMultiplier(1);
        setSawedOff(false);
        setKnownShell(null); // spent

        // Rule: If self-shot was a blank, the shooting player retains their turn immediately!
        const selfShotBlank = (phase === "player-turn" && target === "player") || 
                              (phase === "dealer-turn" && target === "dealer");

        setTimeout(() => {
          if (remainingLoad.length === 0) {
            // Empty shotgun, round finishes
            addLog("The gun is empty. Reloading...", "info");
            setShotgunLoad([]);
            setTimeout(() => {
              prepareRound(roundNum);
            }, 1000);
          } else {
            setShotgunLoad(remainingLoad);
            recalculateAiProbs(
              isLive ? Math.max(0, currentLive - 1) : currentLive,
              isLive ? currentBlank : Math.max(0, currentBlank - 1),
              null
            );

            // Turn evaluation
            if (selfShotBlank) {
              addLog(`${target === "player" ? "You" : "The Devil"} shot self with blank! Turn retained.`, "success");
              setIsUILocked(false);
              if (phase === "player-turn") {
                setPhase("player-turn");
              } else {
                setPhase("dealer-turn");
                runDealerDecisionLoop(remainingLoad, isDealerCuffed, isPlayerCuffed);
              }
            } else {
              // Standard turn switch
              transitionTurn(remainingLoad, false);
            }
          }
        }, 1000);
      }
    }, 1200);
  };

  // Evaluate state after a shell is successfully blasted in someone's face
  const checkDamageConsequences = (
    target: "player" | "dealer", 
    newHealthValue: number, 
    remainingLoad: ("live" | "blank")[]
  ) => {
    // Check if target is dead
    if (newHealthValue <= 0) {
      if (target === "player") {
        playSound("lose");
        addLog("Your defibrillator sparks and dies. You are dead.", "warning");
        setPhase("game-over");
      } else {
        playSound("win");
        addLog("The Devil collapses in a cloud of sulfur. You survive!", "success");
        if (roundNum < 3) {
          const nextRnd = roundNum + 1;
          setRoundNum(nextRnd);
          addLog(`Round ${roundNum} complete. Initiating Round ${nextRnd}.`, "success");
          setTimeout(() => {
            prepareRound(nextRnd);
          }, 2000);
        } else {
          setPhase("game-over");
        }
      }
      return;
    }

    // Shotgun is empty
    if (remainingLoad.length === 0) {
      addLog("The gun is out of shells. Loading new round...", "info");
      setShotgunLoad([]);
      setTimeout(() => {
        prepareRound(roundNum);
      }, 1500);
      return;
    }

    // Still has bullets & health, move turn along
    setShotgunLoad(remainingLoad);
    recalculateAiProbs(
      currentLive,
      currentBlank,
      null
    );
    transitionTurn(remainingLoad, true); // Swapped due to hit
  };

  // Safe turn switches and cuff evaluation
  const transitionTurn = (currentLoadRef: ("live" | "blank")[], forcedSwap: boolean) => {
    const currentWhoPlayed = phase === "player-turn" || (phase === "firing" && gunAction === "pointing-dealer") ? "player" : "dealer";
    
    // Evaluate target cuffs
    if (currentWhoPlayed === "player") {
      if (isDealerCuffed) {
        addLog("The Devil is handcuffed and skips their turn!", "warning");
        setIsDealerCuffed(false); // consume handcuffs
        setPhase("player-turn");
        setIsUILocked(false);
        addLog("It is your turn again.", "player");
      } else {
        setPhase("dealer-turn");
        runDealerDecisionLoop(currentLoadRef, isDealerCuffed, isPlayerCuffed);
      }
    } else {
      // Dealer played
      if (isPlayerCuffed) {
        addLog("You are handcuffed! Skiped turn.", "warning");
        setIsPlayerCuffed(false); // consume
        setPhase("dealer-turn");
        runDealerDecisionLoop(currentLoadRef, isDealerCuffed, isPlayerCuffed);
      } else {
        setPhase("player-turn");
        setIsUILocked(false);
        addLog("It's your turn.", "player");
      }
    }
  };

  // Using specific items
  const useItem = (owner: "player" | "dealer", item: ItemType, index: number) => {
    playSound("item");
    const nameStr = ITEM_DETAILS[item].name;
    const actorName = owner === "player" ? "You" : "The Devil";
    addLog(`${actorName} used [${nameStr}]`, owner === "player" ? "player" : "dealer");

    // Remove item from pocket
    if (owner === "player") {
      setPlayerItems((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setDealerItems((prev) => prev.filter((_, idx) => idx !== index));
    }

    // Core item effects integration
    switch (item) {
      case "cigs":
        // Restores 1 life
        if (owner === "player") {
          setPlayerHealth((prev) => Math.min(maxHealth, prev + 1));
          addLog("You restore 1 life charge.", "success");
        } else {
          setDealerHealth((prev) => Math.min(maxHealth, prev + 1));
          addLog("The Devil restores 1 life charge.", "success");
        }
        playSound("heal");
        break;

      case "saw":
        // Double next damage
        setDamageMultiplier(2);
        setSawedOff(true);
        addLog("The barrel is sawed off. Next shot deals 2x damage!", "warning");
        break;

      case "magnifier":
        // Peek at current shell
        const currentShell = shotgunLoad[0];
        setKnownShell(currentShell);
        if (owner === "player") {
          addLog(`The spyglass lens reveals the current shell: ${currentShell === "live" ? "🔥 LIVE GOLD" : "☁️ SILVER BLANK"}.`, "success");
        } else {
          // Dealer logs that them peeks
          addLog("The Devil peeks through the magnifying glass with a knowing grin.", "warning");
        }
        break;

      case "beer":
        // Eject shell safely
        const ejectedShell = shotgunLoad[0];
        const remaining = shotgunLoad.slice(1);
        addLog(`*CLINK* Ejected a shell: ${ejectedShell === "live" ? "LIVE GOLD" : "SILVER BLANK"}.`, "info");
        
        // Critical: Update dynamic remaining numbers when ejecting via beer!
        if (ejectedShell === "live") {
          setCurrentLive((prev) => Math.max(0, prev - 1));
        } else {
          setCurrentBlank((prev) => Math.max(0, prev - 1));
        }

        // Add to spent shell history. Record numbers correspond exactly to sequence
        const nextSpentIdx = spentShells.length + 1;
        setSpentShells((prev) => [...prev, ejectedShell]);

        setKnownShell(null); // peek stale
        
        if (remaining.length === 0) {
          addLog("The gun is now empty. Preparation for next reload triggered.", "info");
          setShotgunLoad([]);
          setIsUILocked(true);
          setTimeout(() => {
            prepareRound(roundNum);
          }, 1500);
        } else {
          setShotgunLoad(remaining);
          recalculateAiProbs(
            ejectedShell === "live" ? Math.max(0, currentLive - 1) : currentLive,
            ejectedShell === "live" ? currentBlank : Math.max(0, currentBlank - 1),
            null
          );
        }
        break;

      case "cuffs":
        // Skip next turn
        if (owner === "player") {
          setIsDealerCuffed(true);
          addLog("The Devil is locked in steel cuffs. He will skip his next turn.", "success");
        } else {
          setIsPlayerCuffed(true);
          addLog("You are locked in cuffs. You will skip your next turn.", "warning");
        }
        break;
    }
  };

  // Core Smart Bot Artificial Intelligence Script!
  const runDealerDecisionLoop = async (
    currentGunLoad: ("live" | "blank")[],
    dealerCuffedState: boolean,
    playerCuffedState: boolean
  ) => {
    setIsUILocked(true);
    addLog("The Devil is plotting his scheme...", "dealer");

    // Wait 1.5s for pacing
    setTimeout(() => {
      let isCuffedLocally = dealerCuffedState;
      let isPlayerCuffedLocally = playerCuffedState;
      let myItems = [...dealerItems];
      let dmgMult = damageMultiplier;
      let known: "live" | "blank" | null = knownShell;
      
      // Calculate dynamic numbers locally
      let liveLeft = currentLive;
      let blankLeft = currentBlank;
      let totalLeft = liveLeft + blankLeft;

      if (totalLeft === 0) return;

      // Inner helper to execute sequential item evaluations
      const makeDecisions = () => {
        // 1. If we don't know the current shell type but have a magnifier, use it first!
        if (!known && myItems.includes("magnifier")) {
          const itemIdx = myItems.indexOf("magnifier");
          useItem("dealer", "magnifier", itemIdx);
          // Magnifier reveals the shell instantly to dealer
          known = currentGunLoad[0];
          
          // Re-evaluate items after look
          setTimeout(makeDecisions, 1200);
          return;
        }

        // 2. Health healing logic: if Devil is not at max health and has cigarettes, use it!
        if (dealerHealth < maxHealth && myItems.includes("cigs")) {
          const itemIdx = myItems.indexOf("cigs");
          useItem("dealer", "cigs", itemIdx);
          // Wait and continue thinking
          setTimeout(makeDecisions, 1200);
          return;
        }

        // 3. Known shell scenarios (Tactical Absolute Play)
        if (known) {
          if (known === "live") {
            // Saw usage: It increases output. If not already sawed off, use it!
            if (myItems.includes("saw") && dmgMult === 1) {
              const itemIdx = myItems.indexOf("saw");
              useItem("dealer", "saw", itemIdx);
              dmgMult = 2;
              setTimeout(makeDecisions, 1200);
              return;
            }

            // Handcuff usage: lock the player before hitting them to secure double moves!
            if (myItems.includes("cuffs") && !isPlayerCuffedLocally) {
              const itemIdx = myItems.indexOf("cuffs");
              useItem("dealer", "cuffs", itemIdx);
              isPlayerCuffedLocally = true;
              setTimeout(makeDecisions, 1200);
              return;
            }

            // Shoot Player (100% win rate move here)
            addLog("The Devil looks directly into your eyes and points the cold barrel right at your chest.", "warning");
            setTimeout(() => executeShot("player"), 1500);
            return;
          } else {
            // Known blank!
            // Retaining turns is highly favorable. Can use Beer to chuck it or Shoot self.
            // If they have Beer and live shells are left, they can either eject it or shoot themselves.
            // Shooter shooting itself with a blank retains the turn. Let's shoot self!
            addLog("The Devil raises the shotgun to his own chin with an eerie, knowing laugh.", "warning");
            setTimeout(() => executeShot("dealer"), 1500);
            return;
          }
        }

        // 4. Unknown Shell Probabilities Risk Factors Analysis
        const pLive = liveLeft / totalLeft;

        // If probability of live is highly favorable (> 60%), we prefer damaging player
        if (pLive > 0.55) {
          // If aggression is high, try to apply Saw to end game!
          if (myItems.includes("saw") && dmgMult === 1 && pLive > 0.7) {
            const itemIdx = myItems.indexOf("saw");
            useItem("dealer", "saw", itemIdx);
            dmgMult = 2;
            setTimeout(makeDecisions, 1200);
            return;
          }

          if (myItems.includes("cuffs") && !isPlayerCuffedLocally) {
            const itemIdx = myItems.indexOf("cuffs");
            useItem("dealer", "cuffs", itemIdx);
            isPlayerCuffedLocally = true;
            setTimeout(makeDecisions, 1200);
            return;
          }

          // Shoots player
          addLog(`The Devil calculates high live probability (${Math.round(pLive * 100)}%) and shoots YOU.`, "warning");
          setTimeout(() => executeShot("player"), 1500);
        } else if (pLive < 0.45) {
          // High blank chance! Preserving turn is better via Self shooting
          addLog(`The Devil calculates low live probability (${Math.round(pLive * 100)}%) and shoots self to retain turn.`, "info");
          setTimeout(() => executeShot("dealer"), 1500);
        } else {
          // ~50% load. Risk is high.
          // Try to eject shell with Beer if we have it to try and get better probability
          if (myItems.includes("beer")) {
            const itemIdx = myItems.indexOf("beer");
            useItem("dealer", "beer", itemIdx);
            setTimeout(makeDecisions, 1200);
            return;
          }

          // Otherwise, shoot player to force structural health pressure
          addLog("The Devil smiles, gambling on the 50/50 flip. He shoots YOU.", "warning");
          setTimeout(() => executeShot("player"), 1500);
        }
      };

      // Run decision tree
      makeDecisions();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col font-sans select-none relative overflow-hidden">
      {/* Background vignette & gothic particles overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(10,5,5,0.7)_0%,rgba(3,3,4,1)_100%)] z-0" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent" />
      
      {/* HEADER SECTION */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-md animate-pulse" />
            <Flame className="w-5 h-5 text-amber-500 relative z-10" />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-widest text-zinc-200 uppercase font-sans flex items-center gap-2">
              The Chamber <span className="text-amber-500 font-bold">Of Devil</span>
            </h1>
            <p className="text-[10px] font-mono text-zinc-500 tracking-wider">SOULS DUEL SIMULATOR v1.4</p>
          </div>
        </div>

        {/* Audio / Reset controls */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-amber-500 transition-all active:scale-95 duration-150 tooltip"
            title={isMuted ? "Unmute Ambient" : "Mute Ambient"}
            id="btn-mute"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={startGame}
            className="px-4 h-10 text-xs font-mono font-bold uppercase rounded-lg border border-amber-900/50 bg-amber-950/20 text-amber-500 hover:bg-amber-950/50 transition-all flex items-center gap-2 active:scale-95 duration-150"
            id="btn-reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Relaunch
          </button>
        </div>
      </header>

      {/* CORE WRAPPER */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-4 flex flex-col lg:grid lg:grid-cols-12 gap-6 relative z-10 overflow-hidden">
        
        {/* LEFT COLUMN: THE ARENA / CHOPPER (COL-SPAN 8) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          
          { AnimatePresence && (
            <AnimatePresence mode="wait">
              {phase === "intro" ? (
                /* INTRO STAGE */
                <motion.div 
                  key="intro-screen"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.4 }}
                  className="bg-zinc-950/70 border border-zinc-900 rounded-2xl p-8 flex flex-col items-center justify-center text-center py-20 min-h-[500px] h-full relative"
                  id="intro-stage"
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                  <Skull className="w-16 h-16 text-amber-500 mb-6 animate-pulse" />
                  <h2 className="text-3xl font-sans tracking-tight font-medium text-zinc-100 max-w-md">
                    DUEL THE DEVIL IN THE CHAMBER
                  </h2>
                  <p className="text-sm text-zinc-400 mt-4 max-w-lg leading-relaxed">
                    A high-stakes tactical game of Buckshot Roulette. A random sequence of LIVE Gold shells and SILVER Blanks resides in the chamber. Evaluate risks, leverage items, and outsmart the Dealer.
                  </p>
                  
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mt-8 text-left max-w-md w-full text-xs space-y-2">
                    <p className="font-mono text-zinc-300 font-bold uppercase tracking-wider text-[11px] border-b border-zinc-800 pb-1.5 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-amber-500" /> Duelling Regulations
                    </p>
                    <p className="text-zinc-400">● Firing a <strong className="text-amber-500">LIVE GOLD</strong> deals 1 damage to the target.</p>
                    <p className="text-zinc-400">● Firing a <strong className="text-zinc-300">SILVER BLANK</strong> does no damage.</p>
                    <p className="text-zinc-400">● Shooting yourself with a <strong className="text-zinc-300">BLANK</strong> grants an <strong className="text-emerald-500">immediate extra play</strong>.</p>
                    <p className="text-zinc-400">● Outwit the calculated AI dealer over three stages of increasing pressure.</p>
                  </div>

                  <button 
                    onClick={startGame}
                    className="mt-8 px-8 py-4 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-mono font-bold uppercase text-sm rounded-xl tracking-wider shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all flex items-center gap-3 group active:scale-98 duration-150"
                    id="btn-enter"
                  >
                    Enter the Chamber 
                    <Play className="w-4 h-4 fill-current group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </motion.div>
              ) : (
                /* THE ACTIVE ARENA SCREEN */
                <motion.div 
                  key="arena-screen"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-6 h-full"
                >
                  
                  {/* HEALTH BOARDS */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* PLAYER HEALTH (GOLD/AMBER) */}
                    <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl flex items-center justify-between relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-950/30 border border-emerald-900/40 flex items-center justify-center">
                          <User className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-zinc-400 tracking-wider block">PLAYER CHARGES</span>
                          <span className="text-lg font-mono font-bold text-zinc-100">{playerHealth} <span className="text-zinc-500 text-xs">/ {maxHealth}</span></span>
                        </div>
                      </div>
                      
                      {/* Health points badges */}
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: maxHealth }).map((_, i) => (
                          <div 
                            key={`p-hl-${i}`}
                            className={`w-4 h-6 rounded-md border transition-all duration-300 ${
                              i < playerHealth 
                                ? "bg-emerald-500/20 border-emerald-500/60 shadow-sm shadow-emerald-500/25 animate-pulse" 
                                : "bg-zinc-900/85 border-zinc-800"
                            }`}
                          />
                        ))}
                      </div>

                      {isPlayerCuffed && (
                        <div className="absolute inset-0 bg-red-950/35 backdrop-blur-sm border border-red-900/50 flex items-center justify-center gap-2">
                          <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest animate-bounce">⛓️ Handcuffed</span>
                        </div>
                      )}
                    </div>

                    {/* DEVIL HEALTH (CRIMSON) */}
                    <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl flex items-center justify-between relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-1 h-full bg-red-500" />
                      
                      {/* Health points badges */}
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: maxHealth }).map((_, i) => (
                          <div 
                            key={`d-hl-${i}`}
                            className={`w-4 h-6 rounded-md border transition-all duration-300 ${
                              i < dealerHealth 
                                ? "bg-red-500/20 border-red-500/60 shadow-sm shadow-red-500/25 animate-pulse" 
                                : "bg-zinc-900/85 border-zinc-800"
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <span className="text-[10px] font-mono text-zinc-400 tracking-wider block">DEVIL CHARGES</span>
                          <span className="text-lg font-mono font-bold text-zinc-100">{dealerHealth} <span className="text-zinc-500 text-xs">/ {maxHealth}</span></span>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-red-950/30 border border-red-900/40 flex items-center justify-center">
                          <Skull className="w-5 h-5 text-red-500" />
                        </div>
                      </div>

                      {isDealerCuffed && (
                        <div className="absolute inset-0 bg-red-950/35 backdrop-blur-sm border border-red-900/50 flex items-center justify-center gap-2">
                          <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest animate-bounce">⛓️ Handcuffed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CHAMBER HUD DISPLAY (THE ONE SHOWN IN THE USER IMAGES) */}
                  <div className="bg-zinc-950/40 border border-zinc-900 p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Current Shotgun Load</h4>
                      <p className="text-[11px] text-zinc-500 mt-1">Remaining shells loaded into the magazine. Shuffled randomly.</p>
                    </div>

                    {/* Shell Badges matching user's image aesthetics with perfect state links */}
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 bg-gradient-to-r from-amber-950/30 to-amber-900/10 border border-amber-800/60 rounded-lg flex items-center gap-2 pr-5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-sm shadow-amber-500" />
                        <span className="text-sm font-mono font-bold text-amber-500">{currentLive} Live Gold</span>
                      </div>

                      <div className="px-4 py-2 bg-gradient-to-r from-zinc-900 to-zinc-800/40 border border-zinc-700/60 rounded-lg flex items-center gap-2 pr-5">
                        <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 animate-pulse shadow-sm shadow-zinc-400" />
                        <span className="text-sm font-mono font-bold text-zinc-300">{currentBlank} silver Blanks</span>
                      </div>
                    </div>
                  </div>

                  {/* STAGE & THE SHOTGUN MECHANISM */}
                  <div className="flex-1 bg-zinc-950/70 border border-zinc-900 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[280px] relative overflow-hidden">
                    
                    {/* Eerie background grids */}
                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-[0.015] pointer-events-none">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div key={`g-${i}`} className="border-r border-b border-white" />
                      ))}
                    </div>

                    {/* The pointer display text */}
                    <div className="absolute top-4 font-mono text-[10px] uppercase tracking-widest text-zinc-500 px-3 py-1 border border-zinc-900 rounded bg-zinc-950%">
                      STABILIZER ORBITAL STAGE
                    </div>

                    {/* Shotgun Render Component */}
                    <div className="relative w-64 h-32 flex items-center justify-center my-4">
                      {/* Shotgun visual container */}
                      <motion.div 
                        animate={
                          gunAction === "pointing-player" 
                            ? { rotate: -35, x: -30, scale: 1.1 } 
                            : gunAction === "pointing-dealer"
                            ? { rotate: 35, x: 30, scale: 1.1 }
                            : gunAction === "reloading"
                            ? { rotate: 360, scale: 0.9, opacity: 0.4 }
                            : { rotate: 0, x: 0, scale: 1 }
                        }
                        transition={{ type: "spring", stiffness: 100, damping: 15 }}
                        className="w-48 h-10 rounded-md border-y border-zinc-700 bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-950 shadow-2xl relative flex items-center"
                      >
                        {/* Sawed-off barrel barrel end */}
                        <div className="absolute left-0 w-2 h-8 rounded bg-zinc-600 border-r border-zinc-500 z-10" />
                        
                        {/* Dynamic Shotgun length depiction */}
                        <div className={`absolute right-0 h-10 bg-gradient-to-r from-amber-950 to-amber-900/30 rounded-r-md transition-all duration-300 ${sawedOff ? "w-16" : "w-28"}`} />

                        {/* Text indicating trigger load */}
                        {damageMultiplier > 1 && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-800 text-red-100 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-500 animate-pulse tracking-wide uppercase">
                            🪚 SAWED DOUBLE DMG
                          </div>
                        )}

                        {knownShell && (
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-zinc-300 font-mono text-[9px] px-1.5 py-0.5 rounded border border-zinc-700 flex items-center gap-1">
                            <Eye className="w-2.5 h-2.5 text-amber-500 animate-pulse" /> peeked: {knownShell === "live" ? "🔥 LIVE" : "☁️ BLANK"}
                          </div>
                        )}

                        <div className="mx-auto text-[10px] text-zinc-500 tracking-wider uppercase font-mono">
                          {gunAction === "reloading" ? "LOAD RE-RACK" : "12-GAUGE STOCK"}
                        </div>

                        {/* Chamber smoke/blast effects */}
                        {phase === "firing" && (
                          <motion.div 
                            initial={{ scale: 0.5, opacity: 1 }}
                            animate={{ scale: 2.2, opacity: 0 }}
                            className="absolute -left-12 w-20 h-20 rounded-full bg-amber-500/35 border border-amber-300/40 blur-md"
                          />
                        )}
                      </motion.div>
                    </div>

                    {/* Active phase text banner */}
                    <div className="text-sm font-medium tracking-wide font-sans text-center h-6 flex items-center justify-center">
                      {phase === "setup" && (
                        <span className="text-amber-500 font-mono text-xs uppercase tracking-widest animate-pulse flex items-center gap-2">
                          <RotateCw className="w-3.5 h-3.5 animate-spin" /> Racking shotgun magazine...
                        </span>
                      )}
                      {phase === "player-turn" && (
                        <span className="text-emerald-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                          <Crosshair className="w-3.5 h-3.5 animate-pulse" /> Your Turn: Choose Target
                        </span>
                      )}
                      {phase === "dealer-turn" && (
                        <span className="text-red-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2 animate-pulse">
                          ⚠️ The Devil is calculating...
                        </span>
                      )}
                      {phase === "firing" && (
                        <span className="text-xs uppercase font-mono text-zinc-400 tracking-widest animate-bounce">
                          Pulling the trigger...
                        </span>
                      )}
                    </div>

                    {/* CORE TRIGGER CONTROLS AT THE CENTERSTAGE */}
                    <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                      <button 
                        onClick={() => executeShot("player")}
                        disabled={isUILocked || phase !== "player-turn"}
                        className={`flex-1 w-full py-4 px-6 border rounded-xl font-mono text-xs font-bold uppercase transition-all duration-150 relative overflow-hidden group active:scale-97 flex items-center justify-center gap-2 ${
                          phase === "player-turn" && !isUILocked
                            ? "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-400"
                            : "bg-zinc-950/40 border-zinc-900/60 text-zinc-600 cursor-not-allowed"
                        }`}
                        id="shoot-self"
                      >
                        <User className="w-4 h-4" />
                        Shoot Yourself
                        <span className="block text-[9px] font-normal text-zinc-500 absolute bottom-1 lowercase group-hover:text-emerald-500 transition-colors">
                          (blank preserves turn)
                        </span>
                      </button>

                      <button 
                        onClick={() => executeShot("dealer")}
                        disabled={isUILocked || phase !== "player-turn"}
                        className={`flex-1 w-full py-4 px-6 border rounded-xl font-mono text-xs font-bold uppercase transition-all duration-150 relative overflow-hidden group active:scale-97 flex items-center justify-center gap-2 ${
                          phase === "player-turn" && !isUILocked
                            ? "bg-amber-950/20 border-amber-900/50 text-amber-500 hover:bg-amber-950/40 hover:border-amber-400 hover:text-amber-400"
                            : "bg-zinc-950/40 border-zinc-900/60 text-zinc-600 cursor-not-allowed"
                        }`}
                        id="shoot-devil"
                      >
                        <Skull className="w-4 h-4" />
                        Shoot Devil
                        <span className="block text-[9px] font-normal text-zinc-500 absolute bottom-1 lowercase group-hover:text-amber-400 transition-colors">
                          (deals 1 damage)
                        </span>
                      </button>
                    </div>

                  </div>

                  {/* SPENT SHELL HISTORY (CRITICAL COMPONENT FROM SCREENSHOT) */}
                  <div className="bg-zinc-950/50 border border-zinc-900 p-5 rounded-xl">
                    <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-500 mb-4">
                      SPENT SHELL HISTORY
                    </h3>
                    
                    {spentShells.length === 0 ? (
                      <div className="h-10 border border-dashed border-zinc-900 rounded-lg flex items-center justify-center text-xs font-mono text-zinc-600">
                        No shells fired in current load yet.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        {spentShells.map((type, idx) => {
                          const isLive = type === "live";
                          return (
                            <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              key={`spent-${idx}`}
                              className={`h-9 px-4 rounded-lg flex items-center gap-2 border font-mono text-xs font-bold transition-all ${
                                isLive 
                                  ? "bg-amber-950/25 border-amber-700/60 text-amber-500 shadow-sm shadow-amber-900/20" 
                                  : "bg-zinc-900/80 border-zinc-850 text-zinc-300"
                              }`}
                            >
                              {isLive ? (
                                <>
                                  <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                  <span>#{idx + 1} LIVE</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                                  <span>#{idx + 1} BLANK</span>
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Visual indicators validation disclaimer */}
                    <p className="text-[10px] font-mono text-zinc-600 mt-3 text-right">
                      Spent history resets upon next mag reload. Sum of spent & remaining always equates load.
                    </p>
                  </div>

                  {/* INVENTORY CABINET (PLAYER ITEMS) */}
                  <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-400">
                          YOUR ITEMS CABINET
                        </h3>
                        <p className="text-[10px] text-zinc-500">Click to deploy items. Max index 8 pockets.</p>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                        Pockets: {playerItems.length} / 8
                      </span>
                    </div>

                    {playerItems.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-zinc-900 rounded-xl text-xs text-zinc-600 font-mono">
                        Item pockets is empty. Items replenish on round loadout.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {playerItems.map((item, idx) => {
                          const itemInfo = ITEM_DETAILS[item];
                          return (
                            <button
                              key={`p-item-${idx}`}
                              disabled={isUILocked || phase !== "player-turn"}
                              onClick={() => useItem("player", item, idx)}
                              className={`p-3 rounded-lg border text-left flex flex-col justify-between h-24 hover:scale-[1.02] active:scale-98 transition-all relative overflow-hidden group ${
                                phase === "player-turn" && !isUILocked
                                  ? "bg-zinc-900 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850"
                                  : "bg-zinc-950/40 border-zinc-900/60 text-zinc-600 cursor-not-allowed"
                              }`}
                              style={{ height: "105px" }}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xl">{itemInfo.icon}</span>
                                <span className="text-[9px] font-mono text-amber-500/80 bg-amber-950/40 border border-amber-900/50 px-1 py-0.2 rounded">
                                  Use
                                </span>
                              </div>
                              <div className="mt-2">
                                <span className="text-xs font-bold text-zinc-200 block truncate group-hover:text-amber-400 transition-colors uppercase font-mono">{itemInfo.name}</span>
                                <span className="text-[9px] text-zinc-500 block leading-tight truncate mt-1">{itemInfo.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          )}

        </div>

        {/* RIGHT COLUMN: STATISTICS, DEVIL ITEMS & COGNITIVE RISK RADAR (COL-SPAN 4) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          
          {/* DEVIL ITEMS tray */}
          {phase !== "intro" && (
            <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-xl">
              <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4 text-red-500" />
                  <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-300">
                    DEVIL ITEMS TRAY
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-zinc-900/80 border border-zinc-850 px-2 py-0.5 rounded text-zinc-500">
                  {dealerItems.length}/8
                </span>
              </div>

              {dealerItems.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-600 font-mono">
                  The Devil has no items left.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dealerItems.map((item, idx) => {
                    const itemInfo = ITEM_DETAILS[item];
                    return (
                      <div 
                        key={`d-item-${idx}`}
                        className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 rounded text-xs text-zinc-300 font-mono flex items-center gap-1.5 select-none relative"
                      >
                        <span>{itemInfo.icon}</span>
                        <span>{itemInfo.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* AI DECISION RUNIC RADAR (BOT RISK DETAILS) */}
          {phase !== "intro" && (
            <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-xl flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/[0.015] rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-300">
                  DEVIL RISK-DECI RADAR
                </h3>
              </div>

              {/* Real-time Math Analysis visualization */}
              <div className="space-y-3.5 relative z-10">
                
                {/* Probability meters */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
                    <span>LIVE GOLD ODDS (P_live):</span>
                    <span className="text-amber-500 font-bold">{Math.round(aiAnalysis.liveProbability * 100)}%</span>
                  </div>
                  <div className="h-2 rounded bg-zinc-900 overflow-hidden flex">
                    <div 
                      className="bg-amber-500 transition-all duration-500 h-full"
                      style={{ width: `${aiAnalysis.liveProbability * 100}%` }}
                    />
                    <div 
                      className="bg-zinc-700/60 transition-all duration-500 h-full flex-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-zinc-900/50 border border-zinc-850 p-2.5 rounded-lg text-left">
                    <span className="text-[10px] font-mono text-zinc-500 block leading-none">RECOMMENDED TARGET</span>
                    <span className={`text-xs font-bold font-mono tracking-wider block mt-1 uppercase ${aiAnalysis.recommendedShot === "player" ? "text-amber-500" : "text-emerald-400"}`}>
                      {aiAnalysis.recommendedShot === "player" ? "👉 SHOOT YOU" : "👈 SHOOT SELF"}
                    </span>
                  </div>

                  <div className="bg-zinc-900/50 border border-zinc-850 p-2.5 rounded-lg text-left">
                    <span className="text-[10px] font-mono text-zinc-500 block leading-none">AI AGGRESSION MATRIX</span>
                    <span className="text-xs font-bold text-zinc-300 font-mono block mt-1 uppercase">
                      {aiAnalysis.aggression}
                    </span>
                  </div>
                </div>

                {/* Cognitive explain reasoning block */}
                <div className="bg-amber-950/10 border border-amber-900/35 p-3 rounded-lg text-xs leading-relaxed text-amber-500">
                  <span className="font-mono font-bold uppercase text-[9px] text-amber-400 block mb-1">PROBABILITY EXPLAINER:</span>
                  <p className="font-mono leading-tight text-[11px] text-zinc-300">
                    {aiAnalysis.actionReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE SOUL GAME CHRONOLOG (LOGS) */}
          <div className="flex-1 bg-zinc-950/70 border border-zinc-900 rounded-2xl p-5 flex flex-col min-h-[160px] h-full relative overflow-hidden">
            <div className="flex items-center jusitfy-between mb-3 border-b border-zinc-900 pb-3 h-6">
              <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-400">
                CHAMBER DUAL CHRONO
              </h3>
            </div>

            {/* Scrollable logs */}
            <div 
              ref={logsContainerRef}
              className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs max-h-[200px] lg:max-h-none"
            >
              {logs.map((log) => {
                let colorClass = "text-zinc-500";
                if (log.type === "player") colorClass = "text-emerald-400";
                if (log.type === "dealer") colorClass = "text-red-400";
                if (log.type === "warning") colorClass = "text-amber-500";
                if (log.type === "success") colorClass = "text-emerald-500 font-bold";

                return (
                  <div key={log.id} className="leading-snug">
                    <span className="text-[10px] text-zinc-600 block">[UTC COMM]</span>
                    <span className={colorClass}>{log.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GAME OVER CARD OVERLAY (DASHBOARD ACTION) */}
          {phase === "game-over" && (
            <div className="bg-zinc-950 border border-red-950 p-6 rounded-2xl flex flex-col items-center justify-center text-center py-8 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-red-950/20 rounded-full blur-2xl pointer-events-none" />
              <Skull className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
              <h3 className="text-xl font-bold font-mono tracking-wider text-zinc-100 uppercase">
                {playerHealth <= 0 ? "⚠️ YOUR DEFEAT" : "🏆 CHAMPION DUELIST"}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 max-w-sm">
                {playerHealth <= 0 
                  ? "The Devil claims your soul and seals it in the furnace." 
                  : "You survived the mental test, breaking the curse. Your soul is set free!"}
              </p>
              
              <button 
                onClick={startGame}
                className="mt-5 w-full py-3 bg-red-950/45 border border-red-900/70 text-red-400 hover:bg-red-900 hover:text-red-100 font-mono text-xs font-bold uppercase rounded-xl tracking-wider transition-all duration-150 active:scale-97"
                id="btn-re-duel"
              >
                Sign Contract to Re-Duel
              </button>
            </div>
          )}

        </div>

      </main>

      {/* FOOTER METADATA */}
      <footer className="relative z-10 border-t border-zinc-900 py-4 px-6 mt-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-zinc-600 gap-2">
          <p>AUTHENTICATION STATUS: GUEST CLIENT | SECURED BY LOCAL CONTAINER BRIDGE</p>
          <p>TIME: 2026-06-18 UTC | CHAMBER_BOUND_SYSTEM: ESTABLISHED</p>
        </div>
      </footer>
    </div>
  );
}
