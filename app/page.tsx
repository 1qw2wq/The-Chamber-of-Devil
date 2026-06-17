"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Skull,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  PlusCircle,
  Eye,
  Flame,
  Heart,
  Swords,
  Info,
  BookOpen,
  MessageSquare,
  Settings,
  Shuffle,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  Award,
  Users,
  CornerDownRight,
  ArrowRight,
  Zap,
} from "lucide-react";

// --- CLIENT SOUND SYNTHESIZER ---
function playSound(type: 'gunshot' | 'click' | 'reload' | 'heal' | 'spike' | 'chains') {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'gunshot') {
      const bufferSize = ctx.sampleRate * 0.45;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } else if (type === 'reload') {
      const now = ctx.currentTime;
      [0, 0.12].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, now + delay);
        osc.frequency.exponentialRampToValueAtTime(50, now + delay + 0.06);
        gain.gain.setValueAtTime(0.12, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.06);
      });
    } else if (type === 'heal') {
      const now = ctx.currentTime;
      const scale = [440, 554.37, 659.25, 880];
      scale.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.06, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
    } else if (type === 'spike') {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(60, now);
      osc2.frequency.setValueAtTime(62, now);
      osc1.frequency.linearRampToValueAtTime(32, now + 0.7);
      osc2.frequency.linearRampToValueAtTime(33, now + 0.7);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
    } else if (type === 'chains') {
      const now = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400 + Math.random() * 300, now + i * 0.07);
        gain.gain.setValueAtTime(0.05, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.06);
      }
    }
  } catch (err) {
    // Fallback silently if AudioContext is blocked
  }
}

// --- CONSTANTS ---
const GAME_ITEMS = [
  { id: "magnifying-glass", name: "Magnifying Glass", icon: "🔍", desc: "Secretly peek at the top card of the Gun Deck.", rule: "State its value. Lying is allowed." },
  { id: "handsaw", name: "Handsaw", icon: "🪓", desc: "Next shot fired deals double damage (2 BP).", rule: "Wasted if the round is Blank." },
  { id: "coca", name: "Coca", icon: "🥤", desc: "Discard the top card of the deck face down unseen.", rule: "Only you look. State value (lying allowed)." },
  { id: "cigarettes", name: "Cigarettes", icon: "🚬", desc: "Instantly heal exactly 1 Blood Point.", rule: "Cannot exceed 4 BP. Disabled in Sudden Death." },
  { id: "handcuffs", name: "Handcuffs", icon: "🔗", desc: "Place on another player to skip their next turn.", rule: "Does not stack." },
  { id: "inverter", name: "Inverter", icon: "🔄", desc: "Flip top card of the Gun Deck between Live and Blank.", rule: "Places top card in the Inverted Slot." },
  { id: "burner-phone", name: "Burner Phone", icon: "📱", desc: "Roll a 6-sided die to peek at that file card in deck.", rule: "If higher than deck length, peek bottom card." },
  { id: "adrenaline", name: "Adrenaline", icon: "💉", desc: "Steal an item from an opponent and play it instantly.", rule: "Must be played immediately. Cannot steal Adrenaline." },
  { id: "expired-medicine", name: "Expired Medicine", icon: "💊", desc: "Roll a d6: Even (Heads) +2 BP, Odd (Tails) -1 BP.", rule: "Can heal up to full 6 BP. Disabled in Sudden Death." }
];

interface Player {
  id: number;
  name: string;
  role: "human" | "devil";
  bp: number;
  items: string[];
  isExposed: boolean;
  isDead: boolean;
  hasSpiked: boolean;
  skipNext: boolean;
  isBot: boolean;
  aiStyle?: string;
}

// SECURE STATIC PROXY HELPERS OUTSIDE COMPONENT FOR REACHING 100% REACT 19 RENDER PURITY
function getPureRandom(): number {
  return Math.random();
}

function getRandomItemsOutside(count: number): string[] {
  // Weighted pool where powerful items like Adrenaline are rarer
  const weightedPool = [
    "magnifying-glass", "magnifying-glass", "magnifying-glass",
    "cigarettes", "cigarettes", "cigarettes",
    "handsaw", "handsaw", "handsaw",
    "coca", "coca", "coca",
    "handcuffs", "handcuffs", "handcuffs",
    "inverter", "inverter", "inverter",
    "burner-phone", "burner-phone", "burner-phone",
    "expired-medicine", "expired-medicine", "expired-medicine",
    "adrenaline" // Adrenaline is rarer (~4% find rate)
  ];
  const rolled: string[] = [];
  for (let i = 0; i < count; i++) {
    rolled.push(weightedPool[Math.floor(Math.random() * weightedPool.length)]);
  }
  return rolled;
}

export default function Home() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"simulator" | "companion" | "rulebook" | "oracle">("simulator");
  const [isMuted, setIsMuted] = useState(false);

  // --- MULTIPLAYER ROOM STATES ---
  const [multiplayerMode, setMultiplayerMode] = useState<"single" | "host" | "guest">("single");
  const [roomId, setRoomId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [guestId, setGuestId] = useState<number>(0);
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const [roomError, setRoomError] = useState<string>("");
  const [loadingRoom, setLoadingRoom] = useState<boolean>(false);
  const [joinCodeInput, setJoinCodeInput] = useState<string>("");

  // --- ADDITIONAL IMMERSIVE STATES ---
  const [botActingId, setBotActingId] = useState<number | null>(null);
  const [botActionText, setBotActionText] = useState("");
  const [screenFlash, setScreenFlash] = useState<null | "live" | "blank" | "heal">(null);
  const [shakeScreen, setShakeScreen] = useState<"live" | "blank" | null>(null);
  const [showMuzzleFlash, setShowMuzzleFlash] = useState<"live" | "blank" | null>(null);
  const [hoveredItemDescriptor, setHoveredItemDescriptor] = useState<{ name: string; desc: string; rule: string } | null>(null);
  const [activeShot, setActiveShot] = useState<{ shooter: string; target: string; type: "live" | "blank"; dmg: number } | null>(null);
  const [lastShotResult, setLastShotResult] = useState<string | null>(null);
  const [revolving, setRevolving] = useState(false);
  const [cylinderRotationAngle, setCylinderRotationAngle] = useState(360 / 7);
  const [activeItemEffect, setActiveItemEffect] = useState<{
    itemId: string;
    playerName: string;
    itemName: string;
    icon: string;
    outcome?: string;
  } | null>(null);

  // --- TAB 1: INTERACTIVE SIMULATOR STATE ---
  const [gameState, setGameState] = useState<"setup" | "phase1" | "phase2" | "ended">("setup");
  const [winnerFaction, setWinnerFaction] = useState<"survivors" | "devils" | null>(null);
  const [simPlayers, setSimPlayers] = useState<Player[]>([
    { id: 0, name: "You (Survivor)", role: "human", bp: 6, items: ["magnifying-glass", "cigarettes", "handsaw", "coca"], isExposed: false, isDead: false, hasSpiked: false, skipNext: false, isBot: false },
    { id: 1, name: "Alistair", role: "devil", bp: 6, items: ["handsaw", "cigarettes", "inverter"], isExposed: false, isDead: false, hasSpiked: false, skipNext: false, isBot: true, aiStyle: "aggressive" },
    { id: 2, name: "Beatrice", role: "human", bp: 6, items: ["magnifying-glass", "handcuffs", "burner-phone"], isExposed: false, isDead: false, hasSpiked: false, skipNext: false, isBot: true, aiStyle: "logical" },
    { id: 3, name: "Damien", role: "devil", bp: 6, items: ["adrenaline", "expired-medicine"], isExposed: false, isDead: false, hasSpiked: false, skipNext: false, isBot: true, aiStyle: "manipulative" },
    { id: 4, name: "Cassandra", role: "human", bp: 6, items: ["coca", "cigarettes", "handcuffs"], isExposed: false, isDead: false, hasSpiked: false, skipNext: false, isBot: true, aiStyle: "cautious" }
  ]);
  const [gunDeck, setGunDeck] = useState<("live" | "blank")[]>([]);
  const [revealedBulletCount, setRevealedBulletCount] = useState<{ live: number; blank: number }>({ live: 0, blank: 0 });
  const [expendedBullets, setExpendedBullets] = useState<{ type: "live" | "blank"; action: "fired" | "discarded" }[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [simRoundCount, setSimRoundCount] = useState(1);
  const [simLogs, setSimLogs] = useState<string[]>(["Welcome to the Chamber. Roles are secretly allocated."]);
  const [handsawActive, setHandsawActive] = useState(false);
  const [userRole, setUserRole] = useState<"human" | "devil">("human");
  
  // Interactive peek states
  const [peekingTopCard, setPeekingTopCard] = useState<string | null>(null);
  const [burnerPhoneMessage, setBurnerPhoneMessage] = useState<string | null>(null);
  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);
  const [adrenalineSelection, setAdrenalineSelection] = useState<{ targetId: number; items: string[] } | null>(null);
  const [userHandcuffsPending, setUserHandcuffsPending] = useState<boolean>(false);
  const [userAdrenalinePending, setUserAdrenalinePending] = useState<{ step: "select-player" | "select-item"; targetId: number | null } | null>(null);
  const [botCaterDialogue, setBotCaterDialogue] = useState<{ name: string; dialog: string } | null>(null);

  // --- REFS TO PREVENT STALE STATE BUGS FOR BOT TURNS ---
  const simPlayersRef = useRef(simPlayers);
  const gunDeckRef = useRef(gunDeck);
  const turnIndexRef = useRef(turnIndex);
  const gameStateRef = useRef(gameState);
  const simRoundCountRef = useRef(simRoundCount);
  const handsawActiveRef = useRef(handsawActive);
  const botActingRef = useRef(false);

  useEffect(() => { simPlayersRef.current = simPlayers; }, [simPlayers]);
  useEffect(() => { gunDeckRef.current = gunDeck; }, [gunDeck]);
  useEffect(() => { turnIndexRef.current = turnIndex; }, [turnIndex]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { simRoundCountRef.current = simRoundCount; }, [simRoundCount]);
  useEffect(() => { handsawActiveRef.current = handsawActive; }, [handsawActive]);

  // Sync wrapper utilities to guarantee absolute consistency between views and hooks
  const setSimPlayersSync = (updater: Player[] | ((prev: Player[]) => Player[])) => {
    const next = typeof updater === "function" ? updater(simPlayersRef.current) : updater;
    simPlayersRef.current = next;
    setSimPlayers(next);
  };

  const setGunDeckSync = (updater: ("live" | "blank")[] | ((prev: ("live" | "blank")[]) => ("live" | "blank")[])) => {
    const next = typeof updater === "function" ? updater(gunDeckRef.current) : updater;
    gunDeckRef.current = next;
    setGunDeck(next);
  };

  const setTurnIndexSync = (updater: number | ((prev: number) => number)) => {
    const next = typeof updater === "function" ? updater(turnIndexRef.current) : updater;
    turnIndexRef.current = next;
    setTurnIndex(next);
  };

  const setGameStateSync = (updater: ("setup" | "phase1" | "phase2" | "ended") | ((prev: "setup" | "phase1" | "phase2" | "ended") => "setup" | "phase1" | "phase2" | "ended")) => {
    const next = typeof updater === "function" ? updater(gameStateRef.current) : updater;
    gameStateRef.current = next;
    setGameState(next);
  };

  const setHandsawActiveSync = (val: boolean) => {
    setHandsawActive(val);
    handsawActiveRef.current = val;
  };

  const setSimRoundCountSync = (updater: number | ((prev: number) => number)) => {
    const next = typeof updater === "function" ? updater(simRoundCountRef.current) : updater;
    simRoundCountRef.current = next;
    setSimRoundCount(next);
  };

  // --- MULTIPLAYER CORE COORDINATORS ---
  const localPlayerId = (multiplayerMode === "guest") ? guestId : 0;

  const createHostRoom = async () => {
    if (!playerName.trim()) {
      setRoomError("You must proclaim your name to the shadows.");
      return;
    }
    setRoomError("");
    setLoadingRoom(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", playerName: playerName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setRoomId(data.roomId);
        setMultiplayerMode("host");
        setGuestId(0);
        setLobbyPlayers(data.players);
      } else {
        setRoomError(data.error || "Failed to summon network room.");
      }
    } catch (err) {
      setRoomError("Transient error reaching the Grimoire repository.");
      console.error(err);
    } finally {
      setLoadingRoom(false);
    }
  };

  const joinGuestRoom = async (codeStr: string) => {
    if (!playerName.trim()) {
      setRoomError("You must proclaim your name to the shadows.");
      return;
    }
    if (!codeStr || codeStr.length < 8) {
      setRoomError("Chamber codes require exactly 8 digits.");
      return;
    }
    setRoomError("");
    setLoadingRoom(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", roomId: codeStr.trim(), playerName: playerName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setRoomId(data.roomId);
        setMultiplayerMode("guest");
        setGuestId(data.playerId);
        setLobbyPlayers(data.players);
      } else {
        setRoomError(data.error || "The table bounds could not be joined.");
      }
    } catch (err) {
      setRoomError("Transient error reaching the Table repository.");
      console.error(err);
    } finally {
      setLoadingRoom(false);
    }
  };

  const leaveRoom = () => {
    setMultiplayerMode("single");
    setRoomId("");
    setGuestId(0);
    setLobbyPlayers([]);
    setRoomError("");
    setGameStateSync("setup");
  };

  const dispatchGameAction = async (type: "shoot" | "use_item", payload: { targetId?: number, itemId?: string }) => {
    if (multiplayerMode === "guest") {
      try {
        await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "guest_action",
            roomId,
            playerId: guestId,
            guestAction: {
              type,
              itemId: payload.itemId,
              targetId: payload.targetId,
            }
          })
        });
      } catch (err) {
        console.error("Guest action dispatch error:", err);
      }
    } else {
      if (type === "shoot") {
        shootPlayerSimulator(0, payload.targetId!);
      } else if (type === "use_item") {
        executeItemOnSimulator(0, payload.itemId!, payload.targetId);
      }
    }
  };

  const initializeMultiplayerSimulation = () => {
    const roles: ("human" | "devil")[] = ["human", "human", "human", "devil", "devil"];
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(getPureRandom() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    const finalRoles = [...roles];
    setUserRole(finalRoles[0]);

    const botNames = ["Alistair", "Beatrice", "Damien", "Cassandra"];
    const botStyles: ("aggressive" | "logical" | "manipulative" | "cautious")[] = ["aggressive", "logical", "manipulative", "cautious"];
    
    const startingPlayers: Player[] = [];

    // Seat 0: Host
    startingPlayers.push({
      id: 0,
      name: playerName.trim() || "Host Survivor",
      role: finalRoles[0],
      bp: 6,
      items: getRandomItems(4),
      isExposed: finalRoles[0] === "devil",
      isDead: false,
      hasSpiked: false,
      skipNext: false,
      isBot: false
    });

    // Seats 1 to 4: Joined players or AI bots
    for (let seat = 1; seat <= 4; seat++) {
      const joinedPlayer = lobbyPlayers.find(p => p.id === seat);
      if (joinedPlayer) {
        startingPlayers.push({
          id: seat,
          name: joinedPlayer.name,
          role: finalRoles[seat],
          bp: 6,
          items: getRandomItems(4),
          isExposed: false,
          isDead: false,
          hasSpiked: false,
          skipNext: false,
          isBot: false,
        });
      } else {
        startingPlayers.push({
          id: seat,
          name: `${botNames[seat - 1]} (AI)`,
          role: finalRoles[seat],
          bp: 6,
          items: getRandomItems(4),
          isExposed: false,
          isDead: false,
          hasSpiked: false,
          skipNext: false,
          isBot: true,
          aiStyle: botStyles[seat - 1],
        });
      }
    }

    setSimPlayersSync(startingPlayers);

    const totalBullets = 7;
    const liveBulletsCount = getPureRandom() > 0.5 ? 3 : 4;
    const blankBulletsCount = totalBullets - liveBulletsCount;
    const newDeck: ("live" | "blank")[] = [];
    for (let i = 0; i < liveBulletsCount; i++) newDeck.push("live");
    for (let i = 0; i < blankBulletsCount; i++) newDeck.push("blank");
    
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(getPureRandom() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    setCylinderRotationAngle(prev => {
      const targetZeroAngle = 360 / 7;
      const currentFullRotations = Math.floor(prev / 360) * 360;
      return currentFullRotations + 1440 + targetZeroAngle;
    });

    setGunDeckSync(newDeck);
    setRevealedBulletCount({ live: liveBulletsCount, blank: blankBulletsCount });

    setTurnIndexSync(0);
    setSimRoundCountSync(1);
    setHandsawActiveSync(false);
    setPeekingTopCard(null);
    setBurnerPhoneMessage(null);
    setInspectedIndex(null);
    setAdrenalineSelection(null);
    setUserHandcuffsPending(false);
    setUserAdrenalinePending(null);
    setBotCaterDialogue(null);
    setLastShotResult(null);
    setWinnerFaction(null);

    setGameStateSync("phase1");
    setSimLogs([
      `🕯️ The Shrouded Oak Table Ceremony commences. Roles are sealed.`,
      `📢 Loader Manifest is announced: "Exactly ${liveBulletsCount} Live Gold shells, and ${blankBulletsCount} Silver Blanks of lead."`
    ]);
  };

  // Synchronize Host State to Server
  useEffect(() => {
    if (multiplayerMode !== "host" || !roomId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sync_state",
            roomId,
            gameState: {
              activeTab,
              gameState,
              winnerFaction,
              simPlayers,
              gunDeck,
              revealedBulletCount,
              expendedBullets,
              simLogs,
              turnIndex,
              peekingTopCard,
              burnerPhoneMessage,
              inspectedIndex,
              botActingId,
              botActionText,
              revolving,
              handsawActive,
              screenFlash,
              shakeScreen,
              showMuzzleFlash,
              activeShot,
              lastShotResult,
              activeItemEffect,
              simRoundCount,
            }
          })
        });
        const data = await res.json();
        if (data.success) {
          if (data.players) {
            setLobbyPlayers(data.players);
          }
          if (data.pendingActions && data.pendingActions.length > 0) {
            for (const act of data.pendingActions) {
              const activePlayer = simPlayersRef.current[turnIndexRef.current];
              if (act.playerId === activePlayer.id) {
                if (act.type === "shoot") {
                  shootPlayerSimulator(activePlayer.id, act.targetId);
                } else if (act.type === "use_item") {
                  executeItemOnSimulator(activePlayer.id, act.itemId, act.targetId);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Host sync error:", err);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [
    multiplayerMode, roomId, activeTab, gameState, winnerFaction, simPlayers, gunDeck, 
    revealedBulletCount, expendedBullets, simLogs, turnIndex, peekingTopCard, 
    burnerPhoneMessage, inspectedIndex, botActingId, botActionText, revolving, 
    handsawActive, screenFlash, shakeScreen, showMuzzleFlash, activeShot, 
    lastShotResult, activeItemEffect, simRoundCount
  ]);

  // Synchronize Guest State from Server
  const prevActiveShotRef = useRef<any>(null);
  const prevActiveItemRef = useRef<any>(null);
  const prevTurnIndexRef = useRef<number>(0);
  
  useEffect(() => {
    if (multiplayerMode !== "guest" || !roomId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "pull_state",
            roomId,
          })
        });
        const data = await res.json();
        if (data.success) {
          if (data.players) {
            setLobbyPlayers(data.players);
          }
          if (data.gameState) {
            const hState = data.gameState;
            
            if (hState.activeShot && !prevActiveShotRef.current) {
              if (hState.activeShot.type === "live") {
                triggerAudio("gunshot");
              } else {
                triggerAudio("click");
              }
            }
            prevActiveShotRef.current = hState.activeShot;

            if (hState.activeItemEffect && !prevActiveItemRef.current) {
              const item = hState.activeItemEffect.itemId;
              if (item === "cigarettes" || item === "expired-medicine") {
                triggerAudio("heal");
              } else if (item === "handcuffs") {
                triggerAudio("chains");
              }
            }
            prevActiveItemRef.current = hState.activeItemEffect;

            if (hState.turnIndex !== prevTurnIndexRef.current) {
              triggerAudio("reload");
            }
            prevTurnIndexRef.current = hState.turnIndex;

            setGameState(hState.gameState);
            setWinnerFaction(hState.winnerFaction);
            setSimPlayers(hState.simPlayers);
            setGunDeck(hState.gunDeck);
            setRevealedBulletCount(hState.revealedBulletCount);
            setExpendedBullets(hState.expendedBullets);
            setSimLogs(hState.simLogs);
            setTurnIndex(hState.turnIndex);
            setPeekingTopCard(hState.peekingTopCard);
            setBurnerPhoneMessage(hState.burnerPhoneMessage);
            setInspectedIndex(hState.inspectedIndex);
            setBotActingId(hState.botActingId);
            setBotActionText(hState.botActionText);
            setRevolving(hState.revolving);
            setHandsawActive(hState.handsawActive);
            setScreenFlash(hState.screenFlash);
            setShakeScreen(hState.shakeScreen);
            setShowMuzzleFlash(hState.showMuzzleFlash);
            setActiveShot(hState.activeShot);
            setLastShotResult(hState.lastShotResult);
            setActiveItemEffect(hState.activeItemEffect);
            setSimRoundCount(hState.simRoundCount);
          }
        }
      } catch (err) {
        console.error("Guest sync error:", err);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [multiplayerMode, roomId]);

  // --- TAB 2: COMPANION TRACKER STATE ---
  const [compPlayers, setCompPlayers] = useState<{ name: string; bp: number; isDevil: boolean; spiked: boolean; handcuffed: boolean; dead: boolean }[]>([
    { name: "Player 1", bp: 6, isDevil: false, spiked: false, handcuffed: false, dead: false },
    { name: "Player 2", bp: 6, isDevil: false, spiked: false, handcuffed: false, dead: false },
    { name: "Player 3", bp: 6, isDevil: false, spiked: false, handcuffed: false, dead: false },
    { name: "Player 4", bp: 6, isDevil: false, spiked: false, handcuffed: false, dead: false },
    { name: "Player 5", bp: 6, isDevil: false, spiked: false, handcuffed: false, dead: false },
  ]);
  const [compDeckSpecs, setCompDeckSpecs] = useState({ live: 3, blank: 4 });
  const [compCurrentDeck, setCompCurrentDeck] = useState<("live" | "blank" | "unknown")[]>([
    "unknown","unknown","unknown","unknown","unknown","unknown","unknown"
  ]);
  const [compLogs, setCompLogs] = useState<string[]>(["Companion setup. Track your physical tabletop game."]);
  const [compRoundNum, setCompRoundNum] = useState(1);

  // --- TAB 3: RULEBOOK & ORACLE PROBABILITY MATRIX ---
  const [calcLive, setCalcLive] = useState(3);
  const [calcBlank, setCalcBlank] = useState(4);

  // --- TAB 4: WHISPERING ORACLE STATE ---
  const [oracleInput, setOracleInput] = useState("");
  const [oracleHistory, setOracleHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "I am the Whispering Grimoire. Ask me rules, tactical moves, or seek recommendations based on your simulator game. Speak, traveler." }
  ]);
  const [isOracleLoading, setIsOracleLoading] = useState(false);

  // Helper utility
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  function triggerAudio(sound: 'gunshot' | 'click' | 'reload' | 'heal' | 'spike' | 'chains') {
    if (!isMuted) playSound(sound);
  }

  const addSimLog = (msg: string) => {
    setSimLogs(prev => [msg, ...prev.slice(0, 35)]);
  };

  const addCompLog = (msg: string) => {
    setCompLogs(prev => [msg, ...prev.slice(0, 35)]);
  };

  // --- SIMULATION INITIALIZER ---
  const initializeSimulation = () => {
    const roles: ("human" | "devil")[] = ["human", "human", "human", "devil", "devil"];
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(getPureRandom() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    const finalRoles = [...roles];
    setUserRole(finalRoles[0]);

    const startingPlayers: Player[] = [
      { id: 0, name: "You (Survivor)", role: finalRoles[0], bp: 6, items: getRandomItems(4), isExposed: finalRoles[0] === "devil", isDead: false, hasSpiked: false, skipNext: false, isBot: false },
      { id: 1, name: "Alistair", role: finalRoles[1], bp: 6, items: getRandomItems(4), isExposed: false, isDead: false, hasSpiked: false, skipNext: false, isBot: true, aiStyle: "aggressive" },
      { id: 2, name: "Beatrice", role: finalRoles[2], bp: 6, items: getRandomItems(4), isExposed: false, isDead: false, hasSpiked: false, skipNext: false, isBot: true, aiStyle: "logical" },
      { id: 3, name: "Damien", role: finalRoles[3], bp: 6, items: getRandomItems(4), isExposed: false, isDead: false, hasSpiked: false, skipNext: false, isBot: true, aiStyle: "manipulative" },
      { id: 4, name: "Cassandra", role: finalRoles[4], bp: 6, items: getRandomItems(4), isExposed: false, isDead: false, hasSpiked: false, skipNext: false, isBot: true, aiStyle: "cautious" }
    ];

    setSimPlayersSync(startingPlayers);

    const totalBullets = 7;
    const liveBulletsCount = getPureRandom() > 0.5 ? 3 : 4;
    const blankBulletsCount = totalBullets - liveBulletsCount;
    const newDeck: ("live" | "blank")[] = [];
    for (let i = 0; i < liveBulletsCount; i++) newDeck.push("live");
    for (let i = 0; i < blankBulletsCount; i++) newDeck.push("blank");
    
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(getPureRandom() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    // Spin the chamber with momentum (multiple turns) on reload, landing precisely at the ready position (360/7 degrees)
    setCylinderRotationAngle(prev => {
      const targetZeroAngle = 360 / 7;
      // Add 1440 degrees (4 complete clockwise turns) to produce a fast rotative visual spin
      const currentFullRotations = Math.floor(prev / 360) * 360;
      return currentFullRotations + 1440 + targetZeroAngle;
    });

    setGunDeckSync(newDeck);
    setRevealedBulletCount({ live: liveBulletsCount, blank: blankBulletsCount });

    setTurnIndexSync(0);
    setSimRoundCountSync(1);
    setHandsawActiveSync(false);
    setPeekingTopCard(null);
    setBurnerPhoneMessage(null);
    setInspectedIndex(null);
    setAdrenalineSelection(null);
    setUserHandcuffsPending(false);
    setUserAdrenalinePending(null);
    setBotCaterDialogue(null);
    setLastShotResult(null);
    setWinnerFaction(null);

    setGameStateSync("phase1");
    setSimLogs([
      `🕯️ The Chamber Awakens. Shuffle completed by the Grimoire Loader.`,
      `📢 Loader Manifest is announced: "Exactly ${liveBulletsCount} Live Gold shells, and ${blankBulletsCount} Silver Blanks of lead."`
    ]);
    triggerAudio("reload");
  };

  const startFiringPhase = () => {
    setGameStateSync("phase2");
    addSimLog("🔫 The gun is chambered. Phase 2: Deploy your items or pull the trigger!");
    triggerAudio("reload");
  };

  const resetAllSimulator = () => {
    setGameStateSync("setup");
    setWinnerFaction(null);
  };

  function getRandomItems(count: number): string[] {
    return getRandomItemsOutside(count);
  }

  // --- BOT BEHAVIOR ASYNC SEQUENCE STAGE (PREVENTS STUCK SIMULATIONS!) ---
  const runBotTurnSequence = async (botId: number) => {
    if (botActingRef.current) return;
    botActingRef.current = true;
    setBotActingId(botId);

    try {
      let isActing = true;
      let botKnownTop: "live" | "blank" | "unknown" = "unknown";
      let handsawPlayedThisTurn = false;

      while (isActing) {
        // Refresh player metadata from latest reference
        const currentPlayers = simPlayersRef.current;
        const bot = currentPlayers.find(p => p.id === botId);

        if (!bot || bot.isDead || turnIndexRef.current !== botId || gameStateRef.current !== "phase2") {
          break;
        }

        // 1. Resolve Skip due to Handcuffs
        if (bot.skipNext) {
          setBotActionText(`${bot.name}'s turn is skipped due to Handcuffs!`);
          setSimPlayersSync(prev => prev.map(p => p.id === bot.id ? { ...p, skipNext: false } : p));
          addSimLog(`🔗 ${bot.name}'s turn skipped due to heavy constraints!`);
          triggerAudio("chains");
          await sleep(1800);
          resolveNextTurnIndex();
          break;
        }

        // 2. Resolve Empty Gun Deck safety reload
        if (gunDeckRef.current.length === 0) {
          setBotActionText("The gun is empty. Refilling cylinder chambers...");
          triggerNewFullLoad();
          await sleep(1500);
          continue; 
        }

        // 3. Heal checks
        if (bot.bp <= 3 && bot.items.includes("cigarettes") && simRoundCountRef.current < 4) {
          setBotActionText(`${bot.name} is smoking standard cigarettes to soothe the nerves (+1 BP)...`);
          await sleep(1600);
          executeItemOnSimulator(bot.id, "cigarettes");
          await sleep(1200);
          continue;
        }

        if (bot.bp <= 4 && bot.items.includes("expired-medicine") && simRoundCountRef.current < 4) {
          setBotActionText(`${bot.name} is gambling on an expired-medicine bottle...`);
          await sleep(1600);
          executeItemOnSimulator(bot.id, "expired-medicine");
          await sleep(1500);
          continue;
        }

        // 4. Information Gathering
        if (bot.items.includes("burner-phone") && botKnownTop === "unknown") {
          setBotActionText(`${bot.name} is picking up a Burner Phone 📱...`);
          await sleep(1600);
          
          const diceRoll = Math.floor(getPureRandom() * 6) + 1;
          if (gunDeckRef.current.length > 0) {
            const checkIdx = diceRoll - 1 < gunDeckRef.current.length ? diceRoll - 1 : gunDeckRef.current.length - 1;
            const bulletName = gunDeckRef.current[checkIdx];
            if (checkIdx === 0) {
              botKnownTop = bulletName;
            }
            executeItemOnSimulator(bot.id, "burner-phone");
            setBotCaterDialogue({
              name: bot.name,
              dialog: `📱 dial tone whispers... "A wire-check on chamber slot #${checkIdx + 1} confirms a ${bulletName.toUpperCase()} shell."`
            });
          }
          await sleep(1800);
          continue;
        }

        if (bot.items.includes("magnifying-glass") && botKnownTop === "unknown") {
          setBotActionText(`${bot.name} is looking through the magnifying glass to inspect next cylinder...`);
          await sleep(1600);
          
          const topBullet = gunDeckRef.current[0];
          botKnownTop = topBullet;
          
          executeItemOnSimulator(bot.id, "magnifying-glass");
          setBotCaterDialogue({
            name: bot.name,
            dialog: `🔍 peeks through the spyglass... "The next slot feels like a ${getPureRandom() > 0.3 ? topBullet : (topBullet === "live" ? "blank" : "live")}. But secrets can deceive."`
          });
          await sleep(1800);
          continue;
        }

        // 4.5. Adrenaline Surge check
        if (bot.items.includes("adrenaline")) {
          const potentialTargets = currentPlayers.filter(p => p.id !== bot.id && !p.isDead && p.items.some(it => it !== "adrenaline"));
          if (potentialTargets.length > 0) {
            setBotActionText(`${bot.name} injects Adrenaline 💉 to extract an item from an opponent's deck...`);
            await sleep(1600);
            executeItemOnSimulator(bot.id, "adrenaline");
            await sleep(1500);
            continue;
          }
        }

        // 4.6. Strategic Inverter check
        if (bot.items.includes("inverter") && botKnownTop === "blank") {
          setBotActionText(`${bot.name} installs an Inverter 🔄 to flip the known Blank into a Live golden bullet...`);
          await sleep(1600);
          executeItemOnSimulator(bot.id, "inverter");
          botKnownTop = "live";
          await sleep(1500);
          continue;
        }

        // 4.7. Strategic Coca check (cycles blank bullets out or takes 30% chance to cycle if unknown)
        if (bot.items.includes("coca")) {
          if (botKnownTop === "blank") {
            setBotActionText(`${bot.name} chugs a cold Coca 🥤 to cycle out the known Blank bullet directly...`);
            await sleep(1600);
            executeItemOnSimulator(bot.id, "coca");
            botKnownTop = "unknown";
            await sleep(1500);
            continue;
          } else if (botKnownTop === "unknown" && getPureRandom() < 0.3) {
            setBotActionText(`${bot.name} pops open Coca 🥤 to cycle the unrevealed top bullet into the spent tray...`);
            await sleep(1600);
            executeItemOnSimulator(bot.id, "coca");
            botKnownTop = "unknown";
            await sleep(1500);
            continue;
          }
        }

        // 5. Apply constraint handcuffs to priority target
        if (bot.items.includes("handcuffs")) {
          const nonHandcuffedPlayers = currentPlayers.filter(p => p.id !== bot.id && !p.isDead && !p.skipNext);
          if (nonHandcuffedPlayers.length > 0) {
            const target = selectBotTarget(bot, nonHandcuffedPlayers);
            if (target) {
              setBotActionText(`${bot.name} is locking handcuffs on ${target.name} to restrict actions...`);
              await sleep(1600);
              executeItemOnSimulator(bot.id, "handcuffs", target.id);
              await sleep(1500);
              continue;
            }
          }
        }

        // 6. Double dmg next Live round using handsaw
        if (bot.items.includes("handsaw") && !handsawPlayedThisTurn && !handsawActiveRef.current && botKnownTop === "live") {
          setBotActionText(`${bot.name} is mounting a handsaw onto the barrel (deals 2 damage next Live shot)...`);
          await sleep(1600);
          executeItemOnSimulator(bot.id, "handsaw");
          handsawPlayedThisTurn = true;
          await sleep(1500);
          continue;
        }

        // 7. Fire! Determine ideal target
        const opponent = selectBotTarget(bot, currentPlayers);
        if (!opponent) {
          isActing = false;
          break;
        }

        let isSelfGamble = false;
        let finalTargetId = opponent.id;

        if (botKnownTop === "live") {
          finalTargetId = opponent.id;
          setBotActionText(`${bot.name} holds unwavering gaze and fires output on ${opponent.name}!`);
        } else if (botKnownTop === "blank") {
          finalTargetId = bot.id;
          isSelfGamble = true;
          setBotActionText(`${bot.name} points the gun inwards. Dry click preserves their turn!`);
        } else {
          // General gamble of density directly from ref to prevent stale status
          const currentDeck = gunDeckRef.current;
          const li = currentDeck.filter(b => b === "live").length;
          const bl = currentDeck.filter(b => b === "blank").length;
          // If blank probability feels higher, high chance to shoot self
          if (bl > li && getPureRandom() > 0.4) {
            finalTargetId = bot.id;
            isSelfGamble = true;
            setBotActionText(`${bot.name} riskfully targets themselves to sustain turn flow...`);
          } else {
            finalTargetId = opponent.id;
            setBotActionText(`${bot.name} raises barrel and targets ${opponent.name}!`);
          }
        }

        // Immersion & Realism delay: Suspenseful random 5 to 10 seconds sequence before taking the shot!
        const totalDurationMs = 5000 + Math.floor(getPureRandom() * 5000);
        const stepsCount = 4;
        const stepDelay = Math.floor(totalDurationMs / stepsCount);

        setBotActionText(`🎯 ${bot.name} is holding unwavering gaze at target... (Calculating Decision: ${(totalDurationMs / 1000).toFixed(1)}s remaining)`);
        await sleep(stepDelay);
        setBotActionText(`⚙️ ${bot.name} is raising the heavy barrel, feeling the cold steel... (Suspense: ${((totalDurationMs - stepDelay) / 1000).toFixed(1)}s remaining)`);
        await sleep(stepDelay);
        setBotActionText(`🧠 ${bot.name} is adjusting finger grip on the ignition trigger... (Suspense: ${((totalDurationMs - stepDelay * 2) / 1000).toFixed(1)}s remaining)`);
        await sleep(stepDelay);
        setBotActionText(`🚨 ${bot.name} takes a deep final breath in complete silence... (Suspense: ${((totalDurationMs - stepDelay * 3) / 1000).toFixed(1)}s remaining)`);
        await sleep(stepDelay);

        const shotResult = await shootPlayerSimulator(bot.id, finalTargetId);
        await sleep(1200);

        if (shotResult === "blank" && finalTargetId === bot.id) {
          addSimLog(`🤖 ${bot.name} retains their turn after surviving a self-shot Blank.`);
          continue; // Keep acting and loop!
        }
        
        isActing = false; // Turn concludes after shooting
      }
    } catch (e) {
      console.error(e);
    } finally {
      botActingRef.current = false;
      setBotActingId(null);
      setBotActionText("");
    }
  };

  const selectBotTarget = (bot: Player, players: Player[]): Player | null => {
    const livingOpponents = players.filter(p => p.id !== bot.id && !p.isDead);
    if (livingOpponents.length === 0) return null;

    if (bot.role === "devil") {
      // Devil AI: seek out and attack humans, avoid fellow Devils
      const humans = livingOpponents.filter(p => p.role === "human");
      if (humans.length > 0) return humans[Math.floor(getPureRandom() * humans.length)];
    } else {
      // Human AI: attack exposed Devils as absolute priority
      const exposedDevils = livingOpponents.filter(p => p.role === "devil" && p.isExposed);
      if (exposedDevils.length > 0) return exposedDevils[Math.floor(getPureRandom() * exposedDevils.length)];

      // Avoid attacking players shown/exposed as Humans
      const nonExposedHumans = livingOpponents.filter(p => !(p.role === "human" && p.isExposed));
      if (nonExposedHumans.length > 0) return nonExposedHumans[Math.floor(getPureRandom() * nonExposedHumans.length)];
    }
    return livingOpponents[Math.floor(getPureRandom() * livingOpponents.length)];
  };

  const checkWinConditions = (latestPlayers: Player[]) => {
    const survDevils = latestPlayers.filter(p => p.role === "devil" && !p.isDead).length;
    const survHumans = latestPlayers.filter(p => p.role === "human" && !p.isDead).length;

    if (survDevils === 0) {
      setGameStateSync("ended");
      setWinnerFaction("survivors");
      addSimLog("🛡️ CONGRATULATIONS! Surviving humans purged the evil entity. SURVIVORS WIN!");
      return true;
    } else if (survHumans === 0) {
      setGameStateSync("ended");
      setWinnerFaction("devils");
      addSimLog("😈 MATCH CONCLUDED! Infiltrating Devils dominate the dining table. DEVILS WIN!");
      return true;
    }
    return false;
  };

  // --- RESOLVE SHOOT ACTIONS ---
  async function shootPlayerSimulator(shooterId: number, targetId: number): Promise<"live" | "blank"> {
    const currentDeck = gunDeckRef.current;
    if (currentDeck.length === 0) {
      addSimLog("❌ Cylinder is spent. Cylinder needs a reload.");
      return "blank";
    }

    // Slower, highly realistic continuous clockwise spin (+360 deg for full barrel spin + remaining distance for next chamber)
    setRevolving(true);
    triggerAudio("reload");
    setCylinderRotationAngle(prev => prev + 360 + (360 - 360 / 7));
    await sleep(1150);

    triggerAudio("click");
    setRevolving(false);

    // Now assess the shell positioned directly under the firing pin
    const currentBullet = currentDeck[0];
    const updatedDeck = [...currentDeck.slice(1)];
    setGunDeckSync(updatedDeck);
    setExpendedBullets(prev => [...prev, { type: currentBullet, action: "fired" }]);

    // Read current players from synchronized ref
    const currentPlayers = simPlayersRef.current;
    const shooter = currentPlayers.find(p => p.id === shooterId)!;
    const target = currentPlayers.find(p => p.id === targetId)!;
    const isSelfShoot = shooterId === targetId;

    let dmg = handsawActiveRef.current ? 2 : 1;
    setHandsawActiveSync(false);

    if (currentBullet === "live") {
      setScreenFlash("live");
      setShakeScreen("live");
      setShowMuzzleFlash("live");
      triggerAudio("gunshot");
      setActiveShot({ shooter: shooter.name, target: target.name, type: "live", dmg });
      
      setTimeout(() => {
        setScreenFlash(null);
        setShakeScreen(null);
        setShowMuzzleFlash(null);
        setActiveShot(null);
      }, 1600);

      const nextBp = Math.max(0, target.bp - dmg);
      const isDeadState = nextBp === 0;

      const actionMsg = `💥 LIVE GOLD SHELL! ${shooter.name} blasted ${target.name} dealing ${dmg} damage!`;
      addSimLog(actionMsg);
      setLastShotResult(actionMsg);

      const nextPlayers = simPlayersRef.current.map(p => {
        if (p.id === target.id) {
          let updatedPlayer = { ...p, bp: nextBp, isDead: isDeadState };
          if (p.role === "devil" && !p.hasSpiked && (nextBp === 1 || nextBp === 0)) {
            updatedPlayer.bp += 2;
            updatedPlayer.hasSpiked = true;
            updatedPlayer.isDead = false;
            updatedPlayer.isExposed = true; 
            addSimLog(`🩸 DEVIL'S ADRENALINE SPIKE triggered on ${p.name}! Instantly heals +2 Blood!`);
            triggerAudio("spike");
          }
          return updatedPlayer;
        }
        return p;
      });

      setSimPlayersSync(nextPlayers);

      const isGameOver = checkWinConditions(nextPlayers);
      if (!isGameOver) {
        resolveNextTurnIndex();
      }
    } else {
      setScreenFlash("blank");
      setShakeScreen("blank");
      setShowMuzzleFlash("blank");
      triggerAudio("click");
      setActiveShot({ shooter: shooter.name, target: target.name, type: "blank", dmg: 0 });
      
      setTimeout(() => {
        setScreenFlash(null);
        setShakeScreen(null);
        setShowMuzzleFlash(null);
        setActiveShot(null);
      }, 1200);

      const actionMsg = `💨 SILVER BLANK CLICK! ${shooter.name} shot at ${target.name} with dry ignition.`;
      addSimLog(actionMsg);
      setLastShotResult(actionMsg);

      if (isSelfShoot) {
        addSimLog(`🛡️ ${shooter.name} survived selffire blank and retains their turn!`);
      } else {
        resolveNextTurnIndex();
      }
    }

    // Elegant dramatic suspense freeze for 1.5 seconds during the visual flash/shake
    await sleep(1500);

    if (updatedDeck.length === 0) {
      setTimeout(() => {
        triggerNewFullLoad();
      }, 1000);
    }

    return currentBullet;
  }

  const resolveNextTurnIndex = () => {
    const latestPlayers = simPlayersRef.current;
    const currentTurn = turnIndexRef.current;
    let nextIdx = (currentTurn + 1) % 5;
    let iterations = 0;
    while (latestPlayers[nextIdx].isDead && iterations < 5) {
      nextIdx = (nextIdx + 1) % 5;
      iterations++;
    }
    setTurnIndexSync(nextIdx);
  };

  const triggerNewFullLoad = () => {
    const nextRound = simRoundCountRef.current + 1;
    setSimRoundCountSync(nextRound);

    if (nextRound >= 4) {
      addSimLog("☠️ SUDDEN DEATH: Cigarettes and Expired Medicine cards fail to trigger!");
    }

    const liveBulletsCount = getPureRandom() > 0.5 ? 3 : 4;
    const blankBulletsCount = 7 - liveBulletsCount;
    const newDeck: ("live" | "blank")[] = [];
    for (let i = 0; i < liveBulletsCount; i++) newDeck.push("live");
    for (let i = 0; i < blankBulletsCount; i++) newDeck.push("blank");
    
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(getPureRandom() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    // Spin the chamber with momentum (multiple turns) on reload, landing precisely at the ready position (360/7 degrees)
    setCylinderRotationAngle(prev => {
      const targetZeroAngle = 360 / 7;
      // Add 1440 degrees (4 complete clockwise turns) to produce a rapid visual spin
      const currentFullRotations = Math.floor(prev / 360) * 360;
      return currentFullRotations + 1440 + targetZeroAngle;
    });

    setGunDeckSync(newDeck);
    setRevealedBulletCount({ live: liveBulletsCount, blank: blankBulletsCount });
    setExpendedBullets([]);
    setHandsawActiveSync(false);
    setPeekingTopCard(null);
    setBurnerPhoneMessage(null);
    setInspectedIndex(null);
    setAdrenalineSelection(null);
    setUserHandcuffsPending(false);
    setUserAdrenalinePending(null);

    setSimPlayersSync(prev => prev.map(p => {
      if (p.isDead) return p;
      const finalHand = [...p.items, ...getRandomItems(4)].slice(0, 8);
      return { ...p, items: finalHand };
    }));

    addSimLog(`🔄 Cylinder chambers rolled clockwise. Shuffled 7-deck inside barrel.`);
    triggerAudio("reload");
  };
  
  const executeUserAdrenalineSteal = (victimId: number, stolenItem: string) => {
    const victim = simPlayers.find(p => p.id === victimId)!;

    // 1. Remove exactly 1 "adrenaline" from User's hand
    setSimPlayersSync(prev => prev.map(p => {
      if (p.id === 0) {
        const idx = p.items.indexOf("adrenaline");
        const newItems = [...p.items];
        if (idx > -1) newItems.splice(idx, 1);
        return { ...p, items: newItems };
      }
      return p;
    }));

    // 2. Remove exactly 1 "stolenItem" from Victim's hand
    setSimPlayersSync(prev => prev.map(p => {
      if (p.id === victimId) {
        const idx = p.items.indexOf(stolenItem);
        const newItems = [...p.items];
        if (idx > -1) newItems.splice(idx, 1);
        return { ...p, items: newItems };
      }
      return p;
    }));

    // Clear adrenaline choosing state
    setUserAdrenalinePending(null);

    addSimLog(`✨ You (Survivor) utilized: Adrenaline 💉`);
    addSimLog(`💉 Adrenaline surge! Stole ${GAME_ITEMS.find(i => i.id === stolenItem)?.name || stolenItem} from ${victim.name} and played it instantly.`);
    triggerAudio("heal");

    // 3. Immediately trigger the stolen item's effect as if User played it!
    executeItemOnSimulator(0, stolenItem);
  };

  // --- PLAY ITEM ENGINE ---
  function executeItemOnSimulator(playerId: number, itemId: string, additionalTargetId?: number) {
    // Use interactive selection interceptors for Player 0 (You)
    if (playerId === 0) {
      if (itemId === "handcuffs" && additionalTargetId === undefined) {
        const livingOpponents = simPlayersRef.current.filter(p => p.id !== 0 && !p.isDead);
        if (livingOpponents.length === 0) {
          addSimLog("❌ No living opponents to handcuff!");
          return;
        }
        setUserHandcuffsPending(true);
        setUserAdrenalinePending(null);
        return;
      }
      if (itemId === "adrenaline" && additionalTargetId === undefined) {
        const potentialVictims = simPlayersRef.current.filter(
          p => p.id !== 0 && !p.isDead && p.items.some(it => it !== "adrenaline")
        );
        if (potentialVictims.length === 0) {
          addSimLog("❌ No opponents hold stealable items (excludes Adrenaline)!");
          return;
        }
        setUserAdrenalinePending({ step: "select-player", targetId: null });
        setUserHandcuffsPending(false);
        return;
      }
    }

    const user = simPlayersRef.current.find(p => p.id === playerId)!;
    
    if (simRoundCountRef.current >= 4 && (itemId === "cigarettes" || itemId === "expired-medicine")) {
      addSimLog(`❌ Cigarettes and Expired Medicine fail to ignite in Sudden Death!`);
      return;
    }

    if (itemId === "cigarettes" && user.bp >= 6) {
      addSimLog(`🚬 Cigarettes fail to restore points: Blood level is capped at exactly 6.`);
      return;
    }

    addSimLog(`✨ ${user.name} utilized: ${GAME_ITEMS.find(i => i.id === itemId)?.name}`);
    
    setSimPlayersSync(prev => prev.map(p => {
      if (p.id === playerId) {
        const idx = p.items.indexOf(itemId);
        const newItems = [...p.items];
        if (idx > -1) newItems.splice(idx, 1);
        return { ...p, items: newItems };
      }
      return p;
    }));

    const itemRef = GAME_ITEMS.find(i => i.id === itemId);
    if (itemRef) {
      setActiveItemEffect({
        itemId,
        playerName: user.name,
        itemName: itemRef.name,
        icon: itemRef.icon,
        outcome: undefined,
      });
      setTimeout(() => {
        setActiveItemEffect(current => {
          if (current && current.itemId === itemId && current.playerName === user.name) {
            return null;
          }
          return current;
        });
      }, 2500);
    }

    switch (itemId) {
      case "magnifying-glass": {
        const bullet = gunDeckRef.current[0];
        if (playerId === 0) {
          setPeekingTopCard(bullet);
          addSimLog(`🔍 PEAK SHROUD: First chamber card contains a ${bullet.toUpperCase()} shell.`);
          setActiveItemEffect(prev => prev ? { ...prev, outcome: bullet } : null);
        } else {
          setActiveItemEffect(prev => prev ? { ...prev, outcome: "bot" } : null);
        }
        triggerAudio("click");
        break;
      }

      case "handsaw":
        setHandsawActiveSync(true);
        triggerAudio("click");
        setActiveItemEffect(prev => prev ? { ...prev, outcome: "sawed" } : null);
        break;

      case "coca":
        if (gunDeckRef.current.length > 0) {
          const disc = gunDeckRef.current[0];
          setCylinderRotationAngle(prev => prev + 360 - 360 / 7);
          setGunDeckSync(prev => prev.slice(1));
          setExpendedBullets(prev => [...prev, { type: disc, action: "discarded" }]);
          if (playerId === 0) {
            addSimLog(`🥤 Coca discarded top shell. Peek revealed it was ${disc.toUpperCase()}.`);
            setActiveItemEffect(prev => prev ? { ...prev, outcome: disc } : null);
          } else {
            addSimLog(`🥤 ${user.name} discarded the top barrel bullet face down unseen.`);
            setActiveItemEffect(prev => prev ? { ...prev, outcome: "bot" } : null);
          }
        }
        triggerAudio("reload");
        break;

      case "cigarettes":
        setSimPlayersSync(prev => prev.map(p => {
          if (p.id === playerId) return { ...p, bp: Math.min(6, p.bp + 1) };
          return p;
        }));
        setScreenFlash("heal");
        setTimeout(() => setScreenFlash(null), 500);
        triggerAudio("heal");
        setActiveItemEffect(prev => prev ? { ...prev, outcome: "success" } : null);
        break;

      case "handcuffs": {
        const targetId = additionalTargetId !== undefined ? additionalTargetId : (playerId === 0 ? 1 : 0);
        setSimPlayersSync(prev => prev.map(p => {
          if (p.id === targetId) return { ...p, skipNext: true };
          return p;
        }));
        const targetPl = simPlayersRef.current.find(p => p.id === targetId);
        addSimLog(`🔗 Constraints locked targets skip list on ${targetPl?.name}`);
        triggerAudio("chains");
        if (playerId === 0) {
          setUserHandcuffsPending(false);
        }
        setActiveItemEffect(prev => prev ? { ...prev, outcome: targetPl?.name || "Target" } : null);
        break;
      }

      case "inverter":
        if (gunDeckRef.current.length > 0) {
          const original = gunDeckRef.current[0];
          const inverted = original === "live" ? "blank" : "live";
          setGunDeckSync(prev => [inverted, ...prev.slice(1)]);
          addSimLog(`🔄 Top card inverted sequentially ${original.toUpperCase()} ↔ ${inverted.toUpperCase()}`);
          triggerAudio("reload");
          setActiveItemEffect(prev => prev ? { ...prev, outcome: `${original.toUpperCase()} ➔ ${inverted.toUpperCase()}` } : null);
        }
        break;

      case "burner-phone": {
        const diceRoll = Math.floor(getPureRandom() * 6) + 1;
        if (gunDeckRef.current.length > 0) {
          const checkIdx = diceRoll - 1 < gunDeckRef.current.length ? diceRoll - 1 : gunDeckRef.current.length - 1;
          const bulletName = gunDeckRef.current[checkIdx];
          const msg = `The chamber slot #${checkIdx + 1} contains a sturdy ${bulletName.toUpperCase()} shell.`;
          if (playerId === 0) {
            setBurnerPhoneMessage(msg);
            setInspectedIndex(checkIdx);
            setActiveItemEffect(prev => prev ? { ...prev, outcome: `Slot #${checkIdx + 1}: ${bulletName.toUpperCase()}` } : null);
          } else {
            setActiveItemEffect(prev => prev ? { ...prev, outcome: "bot" } : null);
          }
          addSimLog(`📱 Burner Phone inspected chamber slot numbered #${checkIdx + 1}`);
          triggerAudio("click");
        }
        break;
      }

      case "expired-medicine": {
        const isHeal = getPureRandom() > 0.5;
        if (isHeal) {
          setSimPlayersSync(prev => prev.map(p => {
            if (p.id === playerId) return { ...p, bp: Math.min(6, p.bp + 2) };
            return p;
          }));
          setScreenFlash("heal");
          setTimeout(() => setScreenFlash(null), 500);
          addSimLog(`💊 Expired Medicine clinical SUCCESS! heals +2 Blood points!`);
          triggerAudio("heal");
          setActiveItemEffect(prev => prev ? { ...prev, outcome: "success" } : null);
        } else {
          setSimPlayersSync(prev => prev.map(p => {
            if (p.id === playerId) return { ...p, bp: Math.max(1, p.bp - 1) };
            return p;
          }));
          addSimLog(`💊 Expired Medicine backfire: lost -1 Blood due to toxification.`);
          triggerAudio("click");
          setActiveItemEffect(prev => prev ? { ...prev, outcome: "failure" } : null);
        }
        break;
      }

      case "adrenaline":
        if (playerId === 0) {
          const opposition = simPlayersRef.current.filter(p => p.id !== 0 && p.items.length > 0 && !p.isDead);
          if (opposition.length > 0) {
            const first = opposition[0];
            setAdrenalineSelection({ targetId: first.id, items: first.items });
            setActiveItemEffect(prev => prev ? { ...prev, outcome: "choose" } : null);
          } else {
            addSimLog("💉 No targets own active items to steal!");
            setActiveItemEffect(prev => prev ? { ...prev, outcome: "empty" } : null);
          }
        } else {
          const survivors = simPlayersRef.current.filter(p => p.id !== playerId && !p.isDead && p.items.length > 0);
          if (survivors.length > 0) {
            const victim = survivors[Math.floor(getPureRandom() * survivors.length)];
            const stolenItem = victim.items[Math.floor(getPureRandom() * victim.items.length)];
            
            setSimPlayersSync(prev => prev.map(p => {
              if (p.id === victim.id) {
                const copy = [...p.items];
                const i = copy.indexOf(stolenItem);
                if (i > -1) copy.splice(i, 1);
                return { ...p, items: copy };
              }
              return p;
            }));

            addSimLog(`💉 Adrenaline surge! Bot stolen card: ${stolenItem} from target ${victim.name}`);
            setActiveItemEffect(prev => prev ? { ...prev, outcome: `stole ${stolenItem}` } : null);
            executeItemOnSimulator(playerId, stolenItem);
          }
        }
        break;
    }
  }

  // --- EFFECT THAT OBSERVES TURNS AND CALLS BOT ACTIONS SEQUENTIALLY ---
  useEffect(() => {
    if (gameState === "phase2") {
      const activePlayer = simPlayers[turnIndex];
      if (activePlayer && activePlayer.isDead) {
        // Skips dead players clockwise, with a small safe transition
        const timer = setTimeout(() => {
          resolveNextTurnIndex();
        }, 100);
        return () => clearTimeout(timer);
      }

      // Handle Handcuffed Human Player
      if (activePlayer && !activePlayer.isBot && activePlayer.skipNext) {
        const timer = setTimeout(() => {
          addSimLog(`🔗 Your turn (Survivor) was skipped due to heavy Handcuffs!`);
          triggerAudio("chains");
          setSimPlayersSync(prev => prev.map(p => p.id === 0 ? { ...p, skipNext: false } : p));
          resolveNextTurnIndex();
        }, 3500);
        return () => clearTimeout(timer);
      }

      if (activePlayer && activePlayer.isBot && botActingId === null) {
        runBotTurnSequence(activePlayer.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIndex, gameState, botActingId]);

  // --- PHYSICAL GAME COMPANION TRACKER SYSTEM ---
  const updateCompHealth = (playerIdx: number, change: number) => {
    setCompPlayers(prev => prev.map((p, idx) => {
      if (idx === playerIdx) {
        let newBp = Math.max(0, Math.min(6, p.bp + change));
        let dead = newBp === 0;
        let spiked = p.spiked;
        if (p.isDevil && !p.spiked && (newBp === 1 || newBp === 0)) {
          newBp += 2;
          spiked = true;
          dead = false;
          addCompLog(`🚨 AUTOMATIC: Devil's Adrenaline Spike triggered on Player ${playerIdx + 1}! (+2 BP)`);
          triggerAudio("spike");
        }
        return { ...p, bp: newBp, dead, spiked };
      }
      return p;
    }));
  };

  const markCompBullet = (bulletIndex: number, roundedType: "live" | "blank") => {
    setCompCurrentDeck(prev => {
      const copy = [...prev];
      copy[bulletIndex] = roundedType;
      return copy;
    });
    addCompLog(`🔫 marked position #${bulletIndex + 1} as ${roundedType.toUpperCase()} shell.`);
    triggerAudio("click");
  };

  const handleCompBulletShot = (roundCode: "live" | "blank") => {
    addCompLog(`💥 Fired a ${roundCode.toUpperCase()} shell at physical table.`);
    triggerAudio(roundCode === "live" ? "gunshot" : "click");
  };

  // --- WHISPERING ORACLE ORACULAR CONSULT WITH PROXIED GEMINI ---
  const handleWhisperingOracleConsult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oracleInput.trim() || isOracleLoading) return;

    const userMsg = oracleInput;
    setOracleHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setOracleInput("");
    setIsOracleLoading(true);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...oracleHistory, { role: "user", content: userMsg }],
          currentGameState: {
            simActive: gameState !== "setup",
            round: simRoundCount,
            turn: simPlayers[turnIndex]?.name,
            hp: simPlayers.map(p => ({ name: p.name, hp: p.bp, role: p.isExposed ? p.role : "hidden", items: p.items })),
            deckRemaining: gunDeck.length,
            peekingState: peekingTopCard ? "top peeked" : "concealed"
          }
        }),
      });

      const data = await response.json();
      if (data.text) {
        setOracleHistory(prev => [...prev, { role: "assistant", content: data.text }]);
      } else {
        setOracleHistory(prev => [...prev, { role: "assistant", content: `Failed: ${data.error || "The chamber echoes in silent static."}` }]);
      }
    } catch (err) {
      setOracleHistory(prev => [...prev, { role: "assistant", content: "Error: The Whispering Oracle could not transcend the void." }]);
    } finally {
      setIsOracleLoading(false);
    }
  };

  const askAboutGameState = () => {
    if (gameState === "setup") {
      setOracleInput("What is the best setup strategy for first turn?");
    } else {
      const u = simPlayers[localPlayerId];
      setOracleInput(`Current hand: [${u.items.join(", ")}]. Next shell peeking: ${peekingTopCard || "unknown"}. Which item must I deploy to maximize survival?`);
    }
    setActiveTab("oracle");
  };

  const totalInCalc = calcLive + calcBlank;
  const liveProbability = totalInCalc > 0 ? (calcLive / totalInCalc) * 100 : 0;
  const blankProbability = totalInCalc > 0 ? (calcBlank / totalInCalc) * 100 : 0;

  // Coordinate generator for Cylinder
  const getChamberAngle = (idx: number) => {
    return (idx * 360) / 7;
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-gray-200 selection:bg-red-900 selection:text-white pb-12 relative overflow-hidden">
      
      {/* SCREEN FLASH OVERLAY EFFECTS */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed inset-0 z-50 pointer-events-none ${
              screenFlash === "live" 
                ? "bg-red-600/35 shadow-[inset_0_0_100px_rgba(239,68,68,0.7)]" 
                : screenFlash === "blank"
                ? "bg-slate-400/25 shadow-[inset_0_0_100px_rgba(156,163,175,0.4)]"
                : "bg-emerald-600/20 shadow-[inset_0_0_100px_rgba(16,185,129,0.3)]"
            }`}
          />
        )}
      </AnimatePresence>

      {/* FLOATING ACTION OVERLAY FOR BOTS */}
      <AnimatePresence>
        {botActingId !== null && (
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.9 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#12141c]/95 border-2 border-red-700 shadow-[0_0_35px_rgba(197,48,48,0.4)] px-6 py-3.5 rounded-full text-xs font-semibold font-cinzel text-white flex items-center gap-3 backdrop-blur-md"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            <span className="tracking-wide">
              {botActionText || `${simPlayers.find(p => p.id === botActingId)?.name} is contemplating...`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CINEMATIC SHOOTOUT SCREEN ACTION EFFECTS */}
      <AnimatePresence>
        {activeShot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm pointer-events-none overflow-hidden select-none"
          >
            {/* Cinematic Letterbox Bars */}
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              className="absolute top-0 left-0 right-0 h-16 bg-[#040507] border-b border-zinc-900/40 z-10"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-0 left-0 right-0 h-16 bg-[#040507] border-t border-zinc-900/40 z-10"
            />

            {/* Muzzle Sparks / Heatwave Ring */}
            {activeShot.type === "live" ? (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Visual shockwave rings */}
                <motion.div
                  initial={{ scale: 0.1, opacity: 1 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="w-96 h-96 rounded-full border-8 border-amber-500/75 filter blur-sm absolute"
                />
                <motion.div
                  initial={{ scale: 0.1, opacity: 1 }}
                  animate={{ scale: 4.5, opacity: 0 }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
                  className="w-96 h-96 rounded-full border-4 border-red-500/60 filter blur-lg absolute"
                />

                {/* Flying embers */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const angle = (i * 360) / 24;
                  const distanceFactor = ((i * 17) % 21) / 20;
                  const distance = 250 + distanceFactor * 200;
                  const randomX = Math.cos((angle * Math.PI) / 180) * distance;
                  const randomY = Math.sin((angle * Math.PI) / 180) * distance;
                  const durationFactor = ((i * 11) % 11) / 10;
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, scale: 2, opacity: 1 }}
                      animate={{ x: randomX, y: randomY, scale: 0, opacity: 0 }}
                      transition={{ duration: 0.6 + durationFactor * 0.5, ease: "easeOut" }}
                      className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]"
                    />
                  );
                })}
              </div>
            ) : (
              /* Blank puff smoke */
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.1, opacity: 0.8 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="w-80 h-80 rounded-full border-4 border-neutral-400/40 filter blur-md absolute"
                />
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i * 360) / 12;
                  const distanceFactor = ((i * 13) % 11) / 10;
                  const distance = 120 + distanceFactor * 80;
                  const randomX = Math.cos((angle * Math.PI) / 180) * distance;
                  const randomY = Math.sin((angle * Math.PI) / 180) * distance;
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, scale: 1.5, opacity: 0.6 }}
                      animate={{ x: randomX, y: randomY, scale: 3, opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute w-6 h-6 rounded-full bg-neutral-600/20 filter blur-sm"
                    />
                  );
                })}
              </div>
            )}

            {/* Heavy Slam Card layout */}
            <motion.div
              initial={{ scale: 0.3, y: 30, opacity: 0 }}
              animate={{ scale: 1.0, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -20, opacity: 0 }}
              transition={{ type: "spring", damping: 14, stiffness: 220 }}
              className={`z-10 p-8 md:p-12 rounded-3xl border-2 text-center max-w-md bg-neutral-950/95 shadow-2xl relative ${
                activeShot.type === "live"
                  ? "border-red-600/70 shadow-[0_0_60px_rgba(239,68,68,0.45)]"
                  : "border-zinc-800 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
              }`}
            >
              {/* Bullet Case Shell flying out */}
              <motion.div
                initial={{ x: 20, y: -20, rotate: -45, scale: 0 }}
                animate={{ x: 140, y: 120, rotate: 360, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute text-5xl select-none"
                style={{ top: "10%", right: "10%" }}
              >
                {activeShot.type === "live" ? "🔥" : "💨"}
              </motion.div>

              <div className="text-[10px] uppercase font-mono tracking-widest text-[#cca025] mb-2 font-bold bg-[#14120e] border border-amber-950/50 py-1 px-3.5 rounded-full inline-block">
                {activeShot.shooter} Pulls Trigger
              </div>

              {/* Big central announcement text with heavy dynamic impact */}
              {activeShot.type === "live" ? (
                <div className="space-y-2 py-4">
                  <motion.h2 
                    initial={{ scale: 0.5 }}
                    animate={{ scale: [1, 1.25, 1.1] }}
                    className="text-4xl md:text-5xl font-cinzel font-black text-red-500 tracking-wider filter drop-shadow-[0_2px_10px_rgba(239,68,68,0.5)] uppercase animate-pulse"
                  >
                    💥 BOOM!
                  </motion.h2>
                  <p className="text-xs uppercase font-bold text-red-400 font-mono tracking-widest">
                    Live Golden Round Fired!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <motion.h2 
                    initial={{ scale: 0.6 }}
                    animate={{ scale: [1, 1.1, 1.0] }}
                    className="text-3xl md:text-4xl font-cinzel font-black text-slate-400 tracking-wider uppercase"
                  >
                    💨 *CLICK*
                  </motion.h2>
                  <p className="text-xs uppercase font-bold text-slate-500 font-mono tracking-widest">
                    Silver Blank Chamber!
                  </p>
                </div>
              )}

              {/* Shot Details summary with avatars */}
              <div className="mt-4 p-4 rounded-2xl bg-zinc-950/60 border border-neutral-900 flex justify-around items-center gap-4 text-xs font-mono">
                <div className="text-center">
                  <span className="text-2xl block mb-1">👤</span>
                  <span className="text-[10px] text-zinc-500 block">SHOOTER</span>
                  <span className="font-bold text-white block">{activeShot.shooter}</span>
                </div>
                <div className="text-zinc-650 font-bold text-xl">➔</div>
                <div className="text-center">
                  <span className="text-2xl block mb-1">🎯</span>
                  <span className="text-[10px] text-zinc-500 block">TARGET</span>
                  <span className="font-bold text-white block">{activeShot.target}</span>
                </div>
              </div>

              {/* Damage assessment feedback */}
              <div className="mt-5">
                {activeShot.type === "live" ? (
                  <div className="text-xs font-bold font-mono text-red-400 uppercase tracking-widest animate-pulse">
                    🩸 Deals {activeShot.dmg} Damage to {activeShot.target}!
                  </div>
                ) : (
                  <div className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-widest">
                    🛡️ No damage dealt. Dry Spark.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOMIZED ITEM USE SCREEN EFFECTS */}
      <AnimatePresence>
        {activeItemEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-none overflow-hidden"
          >
            {activeItemEffect.itemId === "magnifying-glass" && (
              <motion.div
                initial={{ scale: 2, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
                transition={{ type: "spring", damping: 15 }}
                className="relative w-80 h-80 rounded-full border-4 border-amber-500/50 flex flex-col items-center justify-center bg-[#0d0f17]/95 backdrop-blur-md shadow-[0_0_50px_rgba(245,158,11,0.3)]"
              >
                <div className="absolute inset-4 rounded-full border border-dashed border-amber-500/30 animate-spin" style={{ animationDuration: '24s' }} />
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-amber-500/35 animate-pulse" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-amber-500/15" />
                <span className="text-6xl mb-3 animate-bounce">🔍</span>
                <h3 className="text-lg font-cinzel font-bold text-amber-400 tracking-wider">CHAMBER PEAK</h3>
                <p className="text-[10px] uppercase text-zinc-400 tracking-widest mt-1 mb-3 font-mono">
                  {activeItemEffect.playerName} Scan
                </p>
                {activeItemEffect.outcome && activeItemEffect.outcome !== "bot" ? (
                  <motion.div
                    initial={{ scale: 0, rotateY: 90 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    className={`px-5 py-1.5 rounded-lg border-2 text-xs font-semibold tracking-widest font-mono uppercase bg-neutral-950 ${
                      activeItemEffect.outcome === "live"
                        ? "text-red-500 border-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                        : "text-blue-400 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                    }`}
                  >
                    🚀 {activeItemEffect.outcome}
                  </motion.div>
                ) : (
                  <span className="text-[10px] text-amber-500/80 font-mono italic animate-pulse">
                    Analyzing cylinder...
                  </span>
                )}
              </motion.div>
            )}

            {activeItemEffect.itemId === "handsaw" && (
              <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ x: "-100vw", y: "-40vh", rotate: 20, opacity: 1 }}
                  animate={{ x: "100vw", y: "40vh", opacity: [1, 1, 0] }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute h-3 w-[200vw] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_20px_rgba(239,68,68,0.8)]"
                />
                <motion.div
                  initial={{ x: "100vw", y: "-40vh", rotate: -20, opacity: 1 }}
                  animate={{ x: "-100vw", y: "40vh", opacity: [1, 1, 0] }}
                  transition={{ duration: 0.8, ease: "easeInOut", delay: 0.15 }}
                  className="absolute h-3 w-[200vw] bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.8)]"
                />
                <motion.div
                  initial={{ scale: 0.1, rotate: -180, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", damping: 12 }}
                  className="z-10 bg-black/95 p-8 rounded-2xl border-2 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.4)] text-center max-w-sm"
                >
                  <div className="text-7xl mb-3 animate-pulse">🪓</div>
                  <h3 className="text-2xl font-cinzel font-black tracking-widest text-red-500">DOUBLE HARVEST</h3>
                  <p className="text-[11px] uppercase text-zinc-300 font-mono mt-1 tracking-wider">
                    {activeItemEffect.playerName} cuts barrel
                  </p>
                  <p className="text-[10px] text-red-400 font-bold tracking-widest uppercase mt-3 px-3 py-1.5 bg-red-950/40 rounded border border-red-900/40">
                    🔥 NEXT SHOT DEALS 2X BP DAMAGE
                  </p>
                </motion.div>
              </div>
            )}

            {activeItemEffect.itemId === "coca" && (
              <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                {Array.from({ length: 15 }).map((_, i) => {
                  const xOffset = (((i * 47) % 31) - 15);
                  const scaleVal = ((i * 13) % 5) / 10 + 0.3;
                  const opacityVal = ((i * 17) % 7) / 10 + 0.3;
                  const durationVal = ((i * 23) % 9) / 10 + 0.8;
                  return (
                    <motion.div
                      key={i}
                      initial={{ 
                        x: (i - 7) * 25 + xOffset, 
                        y: 350, 
                        scale: scaleVal, 
                        opacity: opacityVal 
                      }}
                      animate={{ 
                        y: -350, 
                        opacity: 0 
                      }}
                      transition={{ 
                        duration: durationVal, 
                        ease: "easeOut" 
                      }}
                      className="absolute w-6 h-6 rounded-full bg-gradient-to-tr from-amber-600/40 to-amber-400/10 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                    />
                  );
                })}
                <motion.div
                  initial={{ y: 80, scale: 0.8, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ y: -80, scale: 0.8, opacity: 0 }}
                  className="z-10 bg-black/95 p-8 rounded-2xl border-2 border-amber-500/40 text-center shadow-[0_0_35px_rgba(217,119,6,0.3)]"
                >
                  <div className="text-7xl mb-3 animate-bounce">🥤</div>
                  <h3 className="text-xl font-cinzel font-bold text-amber-500 tracking-widest">COCA DISCARD</h3>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1 uppercase tracking-widest">
                    {activeItemEffect.playerName} Ejects Top Shell
                  </p>
                  {activeItemEffect.outcome && activeItemEffect.outcome !== "bot" && (
                    <div className="mt-3 text-[10px] text-zinc-400 bg-neutral-950 px-3 py-1 rounded border border-zinc-800">
                      Secret Peek Discard: <span className="text-amber-500 font-bold uppercase">{activeItemEffect.outcome}</span>
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {activeItemEffect.itemId === "cigarettes" && (
              <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                {Array.from({ length: 8 }).map((_, i) => {
                  const xOffset = (((i * 73) % 201) - 100);
                  const scaleVal = ((i * 29) % 11) / 10 + 0.8;
                  const endScale = ((i * 41) % 17) / 10 + 1.2;
                  const durationVal = ((i * 31) % 13) / 10 + 1.0;
                  return (
                    <motion.div
                      key={i}
                      initial={{ 
                        x: xOffset, 
                        y: 80, 
                        scale: scaleVal, 
                        opacity: 0,
                      }}
                      animate={{ 
                        y: -150, 
                        scale: endScale, 
                        opacity: [0, 0.5, 0.25, 0] 
                      }}
                      transition={{ 
                        duration: durationVal, 
                        ease: "easeOut",
                      }}
                      className="absolute rounded-full bg-gradient-to-t from-orange-500/10 via-amber-500/5 to-transparent w-20 h-20 filter blur-xl"
                    />
                  );
                })}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="z-10 bg-black/95 p-8 rounded-2xl border border-emerald-500/40 text-center shadow-[0_0_35px_rgba(16,185,129,0.3)] max-w-sm"
                >
                  <div className="text-7xl mb-3 animate-pulse">🚬</div>
                  <h3 className="text-xl font-cinzel font-bold text-emerald-400 tracking-wider">NICOTINE RESTORE</h3>
                  <p className="text-[11px] uppercase text-zinc-400 mt-1 tracking-widest font-mono">
                    {activeItemEffect.playerName} Restores Vigor
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 text-emerald-300 font-bold rounded border border-emerald-900/40 font-mono text-[10px] tracking-wider uppercase">
                    ⚕️ BLOOD LEVEL RECOVERY: +1 BP
                  </div>
                </motion.div>
              </div>
            )}

            {activeItemEffect.itemId === "handcuffs" && (
              <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ x: "-18%", opacity: 1 }}
                  exit={{ x: "-100%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 90, damping: 11 }}
                  className="absolute left-0 text-7xl select-none filter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  🔗
                </motion.div>
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: "18%", opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 90, damping: 11 }}
                  className="absolute right-0 text-7xl select-none scale-x-[-1] filter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  🔗
                </motion.div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="z-10 bg-black/95 p-8 rounded-2xl border border-amber-500/50 text-center shadow-[0_0_35px_rgba(245,158,11,0.25)] max-w-sm"
                >
                  <div className="text-7xl mb-3">🔗</div>
                  <h3 className="text-xl font-cinzel font-bold text-amber-500 tracking-widest">STASIS LOCKUP</h3>
                  <p className="text-[10px] text-zinc-400 font-mono uppercase mt-1">
                    {activeItemEffect.playerName} deploys restraints
                  </p>
                  {activeItemEffect.outcome && (
                    <div className="mt-4 text-[10px] bg-red-950/40 text-red-400 font-bold tracking-widest uppercase border border-red-900/40 px-3 py-1.5 rounded">
                      🔒 BLOCKED NEXT ROUND: {activeItemEffect.outcome}
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {activeItemEffect.itemId === "inverter" && (
              <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: [0.4, 0.85, 0] }}
                  className="absolute inset-0 bg-blue-500/20 backdrop-invert-[35%]"
                />
                <motion.div
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="z-10 bg-black/95 p-8 rounded-2xl border-2 border-blue-500/40 text-center shadow-[0_0_35px_rgba(59,130,246,0.35)] max-w-sm"
                >
                  <div className="text-7xl mb-3 animate-spin" style={{ animationDuration: '4s' }}>🔄</div>
                  <h3 className="text-xl font-cinzel font-bold text-blue-400 tracking-wider">CHAMBER INVERSION</h3>
                  <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 mt-1">
                    {activeItemEffect.playerName} flips cylinder polarity
                  </p>
                  {activeItemEffect.outcome && (
                    <div className="mt-4 py-1.5 px-3 bg-blue-950/60 border border-blue-900 rounded font-mono text-[9px] text-blue-300 tracking-widest uppercase font-bold">
                      {activeItemEffect.outcome}
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {activeItemEffect.itemId === "burner-phone" && (
              <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ scale: 0.6, y: 120, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.6, y: -120, opacity: 0 }}
                  transition={{ type: 'spring', damping: 14 }}
                  className="z-10 bg-[#0c0d14]/95 p-8 rounded-3xl border-2 border-indigo-500/40 text-center shadow-[0_0_40px_rgba(99,102,241,0.4)] max-w-sm relative"
                >
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-3.5 rounded bg-zinc-800" />
                  <div className="text-7xl mb-3 mt-3">📱</div>
                  <h3 className="text-xl font-cinzel font-bold text-indigo-400 tracking-widest">WIRE INTERCEPT</h3>
                  <p className="text-[9px] uppercase tracking-widest font-mono text-zinc-500 mt-0.5">
                    {activeItemEffect.playerName} listens to line
                  </p>
                  {activeItemEffect.outcome && activeItemEffect.outcome !== "bot" ? (
                    <div className="mt-4 bg-black/90 px-4 py-3 rounded-xl border border-indigo-800/40 text-xs text-indigo-300 font-mono text-center">
                      <span className="text-red-500 animate-pulse font-bold mr-1">●</span> CELL RECORD:<br />
                      <span className="text-emerald-400 font-bold block mt-1 tracking-wide">{activeItemEffect.outcome}</span>
                    </div>
                  ) : (
                    <div className="mt-4 bg-black/80 px-4 py-2.5 rounded-xl border border-indigo-950 text-[10px] text-indigo-400 font-mono italic animate-pulse">
                      Intercepting radio frequency waves...
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {activeItemEffect.itemId === "adrenaline" && (
              <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.45, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute inset-0 bg-red-600/15 shadow-[inset_0_0_80px_rgba(220,38,38,0.6)]"
                />
                <motion.div
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: [1.3, 0.95, 1.05, 1], opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="z-10 bg-black/95 p-8 rounded-2xl border-2 border-red-600/45 text-center shadow-[0_0_35px_rgba(220,38,38,0.45)] max-w-sm"
                >
                  <div className="text-7xl mb-3 animate-ping" style={{ animationDuration: '1.2s' }}>💉</div>
                  <h3 className="text-xl font-cinzel font-bold text-red-500 tracking-wider">ADRENALINE SURGE</h3>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1 font-mono">
                    {activeItemEffect.playerName} PUMPS BIO-FUEL
                  </p>
                  {activeItemEffect.outcome && (
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 border border-red-900 text-red-400 font-mono text-[9px] tracking-widest uppercase rounded">
                      ⚡ {activeItemEffect.outcome}
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {activeItemEffect.itemId === "expired-medicine" && (
              <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ rotate: 0, scale: 0.2, opacity: 0 }}
                  animate={{ rotate: 720, scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", damping: 14 }}
                  className={`z-10 p-8 rounded-3xl border-2 text-center max-w-sm bg-black/95 ${
                    activeItemEffect.outcome === "success"
                      ? "border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                      : "border-rose-600/50 shadow-[0_0_40px_rgba(225,29,72,0.4)]"
                  }`}
                >
                  <div className="text-7xl mb-3 animate-bounce">💊</div>
                  {activeItemEffect.outcome === "success" ? (
                    <>
                      <h3 className="text-xl font-cinzel font-bold text-emerald-400 tracking-wider">MEDICINE STABILIZED</h3>
                      <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-440 mt-1">
                        {activeItemEffect.playerName} digests capsule
                      </p>
                      <div className="mt-4 py-1.5 px-3 bg-emerald-950/60 text-emerald-300 border border-emerald-900 font-bold rounded font-mono text-[10px]">
                        📈 CLINICAL SUCCESS! +2 BP RECOVERY
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-cinzel font-bold text-rose-500 tracking-wider">MEDICINE TOXIFY</h3>
                      <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-440 mt-1">
                        {activeItemEffect.playerName} digests toxic compound
                      </p>
                      <div className="mt-4 py-1.5 px-3 bg-rose-950/60 text-rose-400 border border-rose-900 font-bold rounded font-mono text-[10px]">
                        💀 TOXIC SHOCK: LOST -1 BP
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TOP BRAND HEADER BAR --- */}
      <header className="border-b border-[#21232c] bg-[#0a0c10] shadow-2xl py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-red-950/20 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center z-10 relative">
          <div className="text-center md:text-left">
            <h1 className="font-cinzel tracking-[3px] text-3xl font-black text-[#c53030] drop-shadow-[0_0_15px_rgba(197,48,48,0.4)] uppercase">
              THE CHAMBER OF DEVIL
            </h1>
            <p className="font-cinzel text-xs tracking-[5px] text-[#cca025] uppercase mt-1">
              Official Digital Companion & Immersive Simulator
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0 bg-[#11131c] px-4 py-2.5 rounded-xl border border-[#21232c]">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-neutral-800"
              title={isMuted ? "Unmute custom synthesized Audio FX" : "Mute audio synthesizer"}
            >
              {isMuted ? <VolumeX size={18} className="text-gray-500" /> : <Volume2 size={18} className="text-red-500 animate-pulse" />}
            </button>
            <div className="h-4 w-[1px] bg-gray-700" />
            <button 
              onClick={askAboutGameState}
              className="flex items-center gap-1.5 text-xs font-bold text-[#cca025] hover:text-[#e4be42] transition-all"
            >
              <Sparkles size={13} className="animate-pulse text-[#cca025]" /> Ask Oracle Advice
            </button>
          </div>
        </div>
      </header>

      {/* --- LEVEL SELECTION COMPONENT NAVIGATION --- */}
      <nav className="bg-[#0c0e14] border-b border-[#1b1c24] sticky top-0 z-40 shadow-md">
        <div className="container mx-auto px-4 flex justify-start overflow-x-auto gap-1">
          <button
            onClick={() => { triggerAudio("click"); setActiveTab("simulator"); }}
            className={`flex items-center gap-2 py-4 px-6 text-xs uppercase tracking-widest font-semibold font-cinzel transition-all border-b-2 whitespace-nowrap ${
              activeTab === "simulator"
                ? "border-[#c53030] text-white bg-red-950/20"
                : "border-transparent text-gray-400 hover:text-white hover:bg-gray-900/40"
            }`}
          >
            <Swords size={16} className={activeTab === "simulator" ? "text-[#c53030]" : ""} /> Play Simulator
          </button>
          <button
            onClick={() => { triggerAudio("click"); setActiveTab("companion"); }}
            className={`flex items-center gap-2 py-4 px-6 text-xs uppercase tracking-widest font-semibold font-cinzel transition-all border-b-2 whitespace-nowrap ${
              activeTab === "companion"
                ? "border-[#cca025] text-white bg-yellow-950/20"
                : "border-transparent text-gray-400 hover:text-white hover:bg-gray-900/40"
            }`}
          >
            <PlusCircle size={16} className={activeTab === "companion" ? "text-[#cca025]" : ""} /> Tabletop Tracker
          </button>
          <button
            onClick={() => { triggerAudio("click"); setActiveTab("rulebook"); }}
            className={`flex items-center gap-2 py-4 px-6 text-xs uppercase tracking-widest font-semibold font-cinzel transition-all border-b-2 whitespace-nowrap ${
              activeTab === "rulebook"
                ? "border-[#cca025] text-white bg-yellow-950/20"
                : "border-transparent text-gray-400 hover:text-white hover:bg-gray-900/40"
            }`}
          >
            <BookOpen size={16} /> Interactive Rulebook
          </button>
          <button
            onClick={() => { triggerAudio("click"); setActiveTab("oracle"); }}
            className={`flex items-center gap-2 py-4 px-6 text-xs uppercase tracking-widest font-semibold font-cinzel transition-all border-b-2 whitespace-nowrap ${
              activeTab === "oracle"
                ? "border-[#c53030] text-white bg-red-950/20"
                : "border-transparent text-gray-400 hover:text-white hover:bg-gray-900/40"
            }`}
          >
            <MessageSquare size={16} className="text-[#c53030] animate-pulse" /> Whispering Oracle
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">

        {/* =========================================================================
            TAB 1: IMMERSIVE GAME PLAY SIMULATOR
            ========================================================================= */}
        {activeTab === "simulator" && (
          <motion.div 
            className="space-y-6"
            animate={
              shakeScreen === "live"
                ? {
                    x: [0, -18, 18, -14, 14, -10, 10, -5, 5, -2, 2, 0],
                    y: [0, 8, -8, 6, -6, 3, -3, 1, -1, 0],
                    rotate: [0, -1.5, 1.5, -1, 1, -0.5, 0.5, 0]
                  }
                : shakeScreen === "blank"
                ? {
                    x: [0, -5, 5, -3, 3, -1, 1, 0],
                    y: [0, 3, -3, 0],
                    rotate: [0, -0.5, 0.5, 0]
                  }
                : {}
            }
            transition={{ 
              duration: shakeScreen === "live" ? 0.75 : 0.4,
              ease: "easeInOut"
            }}
          >
            
            {/* INITIAL CONFIGURATION SCREEN */}
            {gameState === "setup" && (
              roomId !== "" ? (
                <div className="max-w-xl mx-auto rounded-2xl border-2 border-amber-900 bg-[#07090e] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Flame size={150} className="text-red-500" />
                  </div>

                  <h3 className="font-cinzel text-xl text-[#cca025] font-extrabold tracking-wider animate-pulse">Lobby: The Covenant of Fate</h3>
                  <p className="text-xs text-neutral-400">
                    Place your finger on the table. Gather 5 players on this same network to unlock the Chamber cylinders. Missing slots will fall back to smart AI bots.
                  </p>

                  {/* Room Code Badge */}
                  <div className="bg-[#0e111a] border border-[#2c2e39] py-4 px-6 rounded-2xl inline-block shadow-lg mx-auto">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold mb-1">Chamber Room Code</span>
                    <div className="flex items-center gap-2 justify-center">
                      <span className="font-mono text-2xl font-extrabold tracking-widest text-[#cca025]">{roomId}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(roomId);
                          alert("Room Code copied to clipboard!");
                        }}
                        className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#1c2236] text-[11px] cursor-pointer"
                        title="Copy Room Code"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  {/* Connected Seats Status */}
                  <div className="bg-[#050608] border border-neutral-900 rounded-xl p-4 text-left space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Table Seat Layout</span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-900/60 font-mono">
                        {lobbyPlayers.length} / 5 human seats filled
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 pt-2">
                      {Array.from({ length: 5 }).map((_, seatIdx) => {
                        const human = lobbyPlayers.find(p => p.id === seatIdx);
                        const isMe = (multiplayerMode === "guest" && guestId === seatIdx) || (multiplayerMode === "host" && seatIdx === 0);
                        return (
                          <div 
                            key={seatIdx} 
                            className={`rounded-lg p-2 text-center border text-xs flex flex-col justify-between h-20 transition-all ${
                              human 
                                ? "bg-[#0b1411] border-emerald-900 text-emerald-300" 
                                : "bg-[#0a0709] border-red-950/40 text-[#cca025]/40 opacity-75"
                            }`}
                          >
                            <span className="text-[9px] text-gray-500 uppercase font-mono block">Seat #{seatIdx + 1}</span>
                            <span className="truncate font-bold font-sans text-[10.5px] leading-none px-0.5 mt-1 block">
                              {human ? human.name : "Vacant Bot"}
                            </span>
                            <span className="text-[9.5px] leading-none text-zinc-400 mb-0.5 block">
                              {isMe ? "👉 You" : (human ? "Guest" : "AI")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={leaveRoom}
                      className="flex-1 py-3 px-4 rounded-xl border border-[#2c2d3c] bg-[#0c1015] hover:bg-[#1a1c28] text-gray-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Leave Lobby
                    </button>

                    {multiplayerMode === "host" && (
                      <button
                        onClick={initializeMultiplayerSimulation}
                        className="flex-1 py-3 px-4 rounded-xl bg-red-900 hover:bg-red-800 border-t border-red-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play size={13} /> Begin Table Ceremony
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto rounded-2xl border border-[#21232c] bg-[#0c1015] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Flame size={150} className="text-red-600" />
                  </div>
                  
                  <h3 className="font-cinzel text-2xl text-[#cca025] font-bold tracking-wider">The Shrouded oak Table</h3>
                  <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                    The Chamber contains exactly 5 chairs. Shrouded under the shadow of fate, 3 Survivor Humans and 2 Infiltrator Devils occupy these seats. Choose your run mode to proceed.
                  </p>

                  <div className="flex justify-center bg-[#050608] border border-neutral-900 rounded-xl p-1 max-w-sm mx-auto">
                    <button
                      onClick={() => { setMultiplayerMode("single"); setRoomError(""); }}
                      className={`flex-1 py-2 font-cinzel text-xs uppercase tracking-widest font-bold rounded-lg transition-all cursor-pointer ${
                        multiplayerMode === "single"
                          ? "bg-[#1c1e27] text-white border border-[#2a2d39]"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      🛡️ Solo Run
                    </button>
                    <button
                      onClick={() => { setMultiplayerMode("host"); setRoomError(""); }}
                      className={`flex-1 py-2 font-cinzel text-xs uppercase tracking-widest font-bold rounded-lg transition-all cursor-pointer ${
                        multiplayerMode !== "single"
                          ? "bg-[#1c1e27] text-white border border-[#2a2d39]"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      🌐 Table Network
                    </button>
                  </div>

                  {/* Visual Setup of Seats */}
                  <div className="flex justify-center flex-wrap md:flex-nowrap items-center gap-3 py-4 max-w-md mx-auto">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <motion.div
                        key={idx}
                        className="w-16 h-20 rounded-lg bg-gradient-to-br from-[#12131a] via-[#1c1d29] to-[#0d0e14] border-2 border-[#2c2d3c] flex flex-col items-center justify-center p-2 relative shadow-lg group cursor-default"
                        animate={{
                          y: [0, -4, 0],
                          borderColor: ["#2c2d3c", "#cca025", "#2c2d3c"],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          delay: idx * 0.3,
                          ease: "easeInOut"
                        }}
                      >
                        <div className="absolute inset-0 bg-radial-gradient from-red-500/10 to-transparent rounded-lg opacity-40" />
                        <span className="text-[10px] text-zinc-500 font-mono mb-1">Seat</span>
                        <span className="font-cinzel font-bold text-xs text-[#cca025]">#{idx + 1}</span>
                      </motion.div>
                    ))}
                  </div>

                  {multiplayerMode === "single" ? (
                    <div className="space-y-4">
                      <div className="bg-[#050608] p-4 rounded-xl text-left border border-gray-850 max-w-md mx-auto">
                        <h4 className="font-bold text-gray-300 font-cinzel text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5 text-[#cca025]">
                          <Info size={13} /> Solo Chamber Guidelines
                        </h4>
                        <ul className="text-[11px] text-gray-400 space-y-1.5 pl-4 list-disc font-sans leading-relaxed">
                          <li>The Gun cylinder chambers <strong>exactly 7 randomly-shuffled cartridges</strong>.</li>
                          <li>We fill the remaining 4 empty slots with experienced custom AI bots.</li>
                          <li>Your alignment is dealt randomly and secret.</li>
                        </ul>
                      </div>

                      <button
                        onClick={initializeSimulation}
                        className="w-full max-w-md py-4 rounded-xl bg-red-900 hover:bg-red-800 border-t border-red-500 text-white text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg mx-auto cursor-pointer"
                      >
                        <Play size={16} /> Enter active dining hall
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-md mx-auto text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold block">Your Proclaimed Survivor Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Vance" 
                          value={playerName} 
                          onChange={(e) => setPlayerName(e.target.value)}
                          maxLength={15}
                          className="w-full bg-[#050608] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#cca025]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="bg-[#050608]/80 border border-neutral-900 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <h5 className="font-cinzel text-[11px] font-bold text-[#cca025] mb-1">Host Table</h5>
                            <p className="text-[10.5px] text-neutral-500 leading-relaxed">Spawn a network room table and get an 8-digit covenant code.</p>
                          </div>
                          <button
                            onClick={createHostRoom}
                            disabled={loadingRoom}
                            className="w-full py-2.5 mt-3 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                          >
                            {loadingRoom ? "Summoning..." : "Create Room"}
                          </button>
                        </div>

                        <div className="bg-[#050608]/80 border border-neutral-900 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <h5 className="font-cinzel text-[11px] font-bold text-red-400 mb-1">Join Table</h5>
                            <p className="text-[10.5px] text-neutral-500 leading-relaxed">Claim a vacancy at a network table using an 8-digit code.</p>
                            <input 
                              type="text" 
                              placeholder="Code (8 digits)" 
                              value={joinCodeInput} 
                              onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
                              maxLength={8}
                              className="w-full bg-[#08090d] border border-neutral-850 rounded-lg px-2.5 py-1.5 mt-2 text-xs text-white focus:outline-none focus:border-red-500 text-center font-mono tracking-widest"
                            />
                          </div>
                          <button
                            onClick={() => joinGuestRoom(joinCodeInput)}
                            disabled={loadingRoom}
                            className="w-full py-2.5 mt-3 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-900/80 text-red-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                          >
                            {loadingRoom ? "Joining..." : "Join Table"}
                          </button>
                        </div>
                      </div>

                      {roomError && (
                        <p className="text-[11px] text-red-500 font-mono text-center font-bold pt-1">
                          ⚠️ {roomError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            )}

            {/* LIVE BOARD SCREEN */}
            {gameState !== "setup" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Board Left Pane (8 Columns) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* BEAUTIFUL REVOLVING CYLINDER CHAMBER (THE TARGET PORTION OF USER REQUEST) */}
                  <div className="rounded-2xl border border-[#21232c] bg-[#0c1015] p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-radial-gradient from-red-950/20 to-transparent pointer-events-none" />
                    
                    <div className="space-y-4 md:max-w-[40%]">
                      <div className="flex items-center gap-2">
                        <Flame className="text-red-500 animate-pulse" size={18} />
                        <span className="font-cinzel text-xs uppercase tracking-wider text-[#cca025] font-bold">
                          Golden Gun Cylinder (Round {simRoundCount})
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Chambers are positioned clockwise. The golden needle point at the top indicates the live shell up for immediate fire.
                      </p>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-orange-400 font-semibold bg-orange-950/20 px-2.5 py-1 rounded-md border border-orange-900/30">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          <span>{revealedBulletCount.live} Live Gold</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold bg-slate-900/50 px-2.5 py-1 rounded-md border border-gray-800">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span>{revealedBulletCount.blank} silver Blanks</span>
                        </div>
                      </div>

                      {handsawActive && (
                        <div className="text-xs text-red-500 font-bold bg-red-950/30 border border-red-900/50 px-3 py-1.5 rounded-md flex items-center gap-1 animate-pulse">
                          🪓 Handsaw enabled: Next Live round deal exactly 2 damage points!
                        </div>
                      )}

                      {/* SPENT / EXPENDED SHELL CASING TRAY SECTION */}
                      <div className="pt-3 border-t border-zinc-900/60 mt-1 space-y-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold">
                            Spent Shell History
                          </span>
                        </div>
                        {expendedBullets.length === 0 ? (
                          <p className="text-[10px] text-zinc-600 font-mono italic">
                            Chambers are untouched. No casings discharged yet.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                            {expendedBullets.map((bullet, idx) => {
                              const isLive = bullet.type === "live";
                              const isDiscarded = bullet.action === "discarded";
                              return (
                                <span 
                                  key={idx}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold select-none transition-transform hover:scale-105 border ${
                                    isDiscarded
                                      ? "bg-[#0c0d12]/60 border-neutral-800 text-zinc-600 line-through"
                                      : isLive
                                      ? "bg-amber-950/30 border-amber-600/40 text-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.15)]"
                                      : "bg-slate-900/50 border-slate-800 text-zinc-400"
                                  }`}
                                  title={`${isLive ? "Live Gold Shell" : "Blank Silver Shell"} - ${isDiscarded ? "Discarded unseen" : "Fired in chamber"}`}
                                >
                                  {isDiscarded ? "🗑️" : (isLive ? "🔥" : "💨")}
                                  <span>
                                    #{idx + 1} {isLive ? "LIVE" : "BLANK"}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ROTATING 7-CHAMBER EYE VIEW DESIGN */}
                    <div className="relative flex flex-col items-center justify-center pt-8 pb-4 px-6 select-none">
                      {/* GOLDEN FIRING NEEDLE POINT */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
                        <span className="text-[9px] font-bold text-amber-500 tracking-wider uppercase font-cinzel whitespace-nowrap mb-1">
                          Firing Lock
                        </span>
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-500 animate-bounce" />
                      </div>

                      {/* Chamber Rotating Cylinder Dial */}
                      {(() => {
                        const currentTopSlotIndex = 7 - gunDeck.length;

                        return (
                          <div 
                            className="w-44 h-44 rounded-full bg-[#11131c] border-4 border-[#21232c] shadow-[inset_0_0_30px_rgba(0,0,0,0.8),0_0_15px_rgba(197,48,48,0.1)] relative flex items-center justify-center"
                            style={{
                              transform: `rotate(${cylinderRotationAngle}deg)`,
                              transition: revolving 
                                ? "transform 1100ms cubic-bezier(0.15, 0.82, 0.35, 1)" 
                                : "transform 500ms ease-out"
                            }}
                          >
                            {/* Center Pin Indicator */}
                            <div className="w-12 h-12 rounded-full bg-[#07080a] border-4 border-[#21232c] z-15 flex items-center justify-center font-cinzel text-[10px] text-red-500 font-bold">
                              7C
                            </div>

                            {/* Render 7 Slots */}
                            {Array.from({ length: 7 }).map((_, idx) => {
                              const angle = getChamberAngle(idx);
                              // Translate coordinates around 50% center
                              const rad = (angle - 90) * (Math.PI / 180);
                              const radiusOffset = 52; // distance from center
                              const x = radiusOffset * Math.cos(rad);
                              const y = radiusOffset * Math.sin(rad);

                              const exists = idx >= currentTopSlotIndex;
                              const bulletIndexInDeck = exists ? idx - currentTopSlotIndex : -1;
                              const bulletType = exists ? gunDeck[bulletIndexInDeck] : null;

                              // Highlight current top active bullet
                              const isNext = idx === currentTopSlotIndex;
                              const isInspected = exists && bulletIndexInDeck === inspectedIndex;

                              return (
                                <div
                                  key={idx}
                                  className={`absolute w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold font-mono transition-all z-10 ${
                                    isNext 
                                      ? (handsawActive 
                                          ? "bg-red-950/45 border-red-500 ring-2 ring-red-500/30 scale-115 shadow-[0_0_12px_rgba(239,68,68,0.65)]" 
                                          : "bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.5)]")
                                      : isInspected
                                      ? "bg-blue-950/40 border-blue-400 ring-2 ring-blue-500/40 text-blue-300 scale-105 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                      : exists 
                                      ? "bg-[#0b0c10] border-gray-700 text-gray-500" 
                                      : "bg-black/60 border-gray-900 opacity-20 text-gray-700"
                                  }`}
                                  style={{
                                    transform: `translate(${x}px, ${y}px) rotate(${-cylinderRotationAngle}deg)`,
                                    transition: revolving 
                                      ? "transform 1100ms cubic-bezier(0.15, 0.82, 0.35, 1)" 
                                      : "transform 350ms ease-out, background-color 300ms, border-color 300ms"
                                  }}
                                >
                                  {isNext ? (
                                    handsawActive ? (
                                      <span className="animate-pulse text-red-500 font-extrabold text-xs">🪓</span>
                                    ) : (
                                      <span className="animate-pulse text-[#cca025]">⚡</span>
                                    )
                                  ) : exists ? (
                                    <span className={`text-[9px] ${isInspected ? "text-blue-300 font-bold" : "text-gray-500"}`}>#{bulletIndexInDeck + 1}</span>
                                  ) : (
                                    "💀"
                                  )}

                                  {/* Hover Tooltip/Tooltip info if peeked */}
                                  {isNext && peekingTopCard && (
                                    <div className="absolute -bottom-8 bg-neutral-900 border border-amber-600 rounded px-1.5 py-0.5 text-[8px] tracking-tighter text-amber-400 uppercase z-40 whitespace-nowrap">
                                      Peek: {peekingTopCard}
                                    </div>
                                  )}
                                  
                                  {/* Highlight inspected bullet from phone */}
                                  {isInspected && burnerPhoneMessage && (
                                    <div className="absolute -bottom-8 bg-neutral-900 border border-blue-500 rounded px-1.5 py-0.5 text-[8px] tracking-tighter text-blue-400 uppercase z-40 font-semibold whitespace-nowrap">
                                      Inspected: {bulletType}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                  {/* PEeking Overlay Alerts */}
                  {peekingTopCard && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-yellow-950/20 border border-yellow-700/60 p-4 rounded-xl flex justify-between items-center text-xs"
                    >
                      <div className="flex items-center gap-3 text-yellow-300">
                        <span className="text-xl">🔍</span>
                        <div>
                          <strong>Spyglass Peeking:</strong> The cylinder has a{" "}
                          <span className="font-bold underline uppercase text-orange-400">{peekingTopCard}</span> bullet locked at top row position.
                        </div>
                      </div>
                      <button
                        onClick={() => setPeekingTopCard(null)}
                        className="text-[10px] bg-yellow-800 text-white px-2.5 py-1 rounded"
                      >
                        Hide Shroud
                      </button>
                    </motion.div>
                  )}

                  {burnerPhoneMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-950/20 border border-blue-800 p-4 rounded-xl flex justify-between items-center text-xs text-blue-300"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📱</span>
                        <div><strong>Receiver Line:</strong> {burnerPhoneMessage}</div>
                      </div>
                      <button
                        onClick={() => {
                          setBurnerPhoneMessage(null);
                          setInspectedIndex(null);
                        }}
                        className="text-[10px] bg-blue-800 text-white px-2.5 py-1 rounded cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </motion.div>
                  )}

                  {/* SPEECH BOX BUBBLE */}
                  {botCaterDialogue && (
                    <div className="bg-[#12141d] border border-red-500/30 p-4 rounded-xl flex justify-between items-center text-xs text-gray-300">
                      <div>
                        <strong className="text-[#cca025]">{botCaterDialogue.name} is speaking:</strong> &quot;{botCaterDialogue.dialog}&quot;
                      </div>
                      <button onClick={() => setBotCaterDialogue(null)} className="text-gray-500 hover:text-white">✕</button>
                    </div>
                  )}

                  {/* HEART MONITOR CARDS - HIGH FIDELITY VITALS (THE TARGET PORTION OF USER REQUEST) */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-cinzel text-xs uppercase tracking-wider text-gray-400 font-bold">Player Monitors (Adrenaline Vitals)</h4>
                      <span className="text-[10px] text-gray-500 tracking-wider">EKG Pulse indicates active cardiac health</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      {simPlayers.map((player) => {
                        const isActive = player.id === turnIndex;
                        const isUser = player.id === localPlayerId;

                        // Determine EKG color and speed based on HP
                        let pulseColor = "text-emerald-500";
                        let pulseSpeed = "duration-1000";
                        let pulsePath = "M0 10 h40 l4-5 l4 11 l3-8 h49";
                        let vitalStatusStr = "Vessel Stable";

                        if (player.bp <= 2) {
                          pulseColor = "text-red-500 animate-pulse";
                          pulseSpeed = "duration-300";
                          pulsePath = "M0 10 h15 l3-8 l3 16 l2-14 l2 10 h10 l3-8 l3 16 l2-14 l2 10 h15 l3-8 l3 16 l2-14 l2 10 h15";
                          vitalStatusStr = "Vulnerable";
                        } else if (player.bp <= 4) {
                          pulseColor = "text-yellow-500";
                          pulsePath = "M0 10 h25 l4-7 l4 14 l3-11 l3 7 h25 l4-7 l4 14 l3-11 l3 7 h20";
                          vitalStatusStr = "Fatigued";
                        }

                        if (player.isDead) {
                          pulseColor = "text-neutral-800";
                          vitalStatusStr = "Flatlined";
                        }

                        return (
                          <div
                            key={player.id}
                            className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-300 relative ${
                              player.isDead 
                                ? "bg-black/60 border-neutral-900 opacity-40 text-neutral-600" 
                                : isActive 
                                ? "bg-[#161011] border-red-700 shadow-[0_0_15px_rgba(197,48,48,0.25)] scale-[1.02]" 
                                : "bg-[#0c1015] border-[#21232c] hover:border-gray-700"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <span className={`font-cinzel text-xs font-bold truncate max-w-[80%] ${isActive && !player.isDead ? "text-[#cca025]" : "text-white"}`}>
                                  {player.name}
                                </span>
                                {player.skipNext && (
                                  <span className="text-[9px] bg-red-950 text-red-400 border border-red-900 px-1.5 rounded animate-pulse">LOCK</span>
                                )}
                              </div>

                              {/* ECG HEART WAVE VITAL FEEDBACK */}
                              <div className="border bg-black/40 border-gray-900 rounded p-1 h-10 flex flex-col justify-center overflow-hidden">
                                {player.isDead ? (
                                  <svg viewBox="0 0 100 20" className="w-full h-8 stroke-current text-red-950/40">
                                    <line x1="0" y1="10" x2="100" y2="10" strokeWidth="1.5" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 100 20" className={`w-full h-8 stroke-current ${pulseColor}`}>
                                    <motion.path
                                      d={pulsePath}
                                      fill="none"
                                      strokeWidth="1.5"
                                      strokeDasharray="100"
                                      initial={{ strokeDashoffset: 100 }}
                                      animate={{ strokeDashoffset: 0 }}
                                      transition={{ repeat: Infinity, duration: player.bp <= 2 ? 0.7 : 1.5, ease: "linear" }}
                                    />
                                  </svg>
                                )}
                              </div>

                              {/* BP Hearts display */}
                              <div className="flex gap-1 items-center">
                                <span className="text-[10px] font-mono font-bold text-gray-500">BP:</span>
                                <div className="flex gap-0.5 text-[10px]">
                                  {Array.from({ length: 6 }).map((_, hIdx) => (
                                    <span key={hIdx}>
                                      {hIdx < player.bp ? "🩸" : "🖤"}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex justify-between items-center text-[9px] font-mono pt-1 text-gray-500">
                                <span>{vitalStatusStr}</span>
                                {player.id === localPlayerId ? (
                                  <span className={player.role === "devil" ? "text-red-500 font-bold uppercase tracking-tighter" : "text-[#cca025] font-bold uppercase tracking-tighter"}>
                                    Role: {player.role.toUpperCase()}
                                  </span>
                                ) : (
                                  player.isExposed && (
                                    <span className={player.role === "devil" ? "text-red-500 font-bold uppercase tracking-tighter font-serif" : "text-emerald-500 font-bold uppercase tracking-tighter font-serif"}>
                                      Exposed {player.role.toUpperCase()}
                                    </span>
                                  )
                                )}
                              </div>

                            </div>

                            {/* ITEM INVENTORY ROW FOR PLAYERS */}
                            {!player.isDead && (
                              <div className="mt-3 pt-2.5 border-t border-gray-900 flex flex-wrap gap-1">
                                {player.items.length === 0 ? (
                                  <span className="text-[8px] text-gray-600 italic">No Items</span>
                                ) : (
                                  player.items.map((item, id) => {
                                    const details = GAME_ITEMS.find(i => i.id === item);
                                    return (
                                      <span
                                        key={id}
                                        title={details?.name}
                                        className="w-5 h-5 rounded-full bg-black border border-gray-800 flex items-center justify-center text-[10px] hover:border-amber-500 transition-colors cursor-help"
                                      >
                                        {details?.icon}
                                      </span>
                                    );
                                  })
                                )}
                              </div>
                            )}

                            {/* Action overlay dot */}
                            {isActive && !player.isDead && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-600 border border-black animate-ping" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* USER MANUAL INTERFACES AND PLAYER ACTIONS */}
                  {gameState === "phase1" && turnIndex === 0 && (
                    <div className="bg-[#cca025]/5 p-6 rounded-2xl border border-[#cca025]/30 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="text-center md:text-left">
                        <h4 className="font-bold text-[#cca025] font-cinzel text-sm uppercase tracking-wider">Draw Phase Secured!</h4>
                        <p className="text-xs text-gray-400">Survival supplies have been dealt onto the floor. Prepare to target.</p>
                      </div>
                      <button
                        onClick={startFiringPhase}
                        className="bg-[#cca025] text-black hover:bg-[#e4be42] font-extrabold font-cinzel text-xs px-6 py-3.5 rounded-xl tracking-wider uppercase transition-all shadow-md cursor-pointer"
                      >
                        Roll barrel into chambers
                      </button>
                    </div>
                  )}

                  {gameState === "phase2" && turnIndex === localPlayerId && (
                    simPlayers[localPlayerId].skipNext ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-neutral-950/90 border border-amber-950/20 p-8 rounded-2xl flex flex-col items-center justify-center space-y-4 text-center shadow-2xl relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-900/10 to-transparent animate-pulse pointer-events-none" />
                        <div className="w-16 h-16 rounded-full bg-amber-950 text-amber-500 border border-amber-800 flex items-center justify-center text-3xl shadow-lg relative">
                          🔗
                          <div className="absolute -inset-1 border border-dashed border-amber-600 rounded-full animate-spin duration-10000" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-cinzel text-sm uppercase tracking-widest text-[#cca025] font-extrabold">
                            🔒 You Are Handcuffed!
                          </h3>
                          <p className="text-xs text-amber-100/70 max-w-sm">
                            Your hands are chained by constraint mechanics. Your turn is bypassed this cycle.
                          </p>
                        </div>
                        <div className="text-[10px] font-mono text-amber-600 uppercase tracking-widest animate-pulse">
                          🔗 Turn skipped
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#11131c] border border-red-950 p-6 rounded-2xl space-y-4 shadow-xl"
                      >
                      <div className="flex justify-between items-center pb-2.5 border-b border-gray-800">
                        <h3 className="font-cinzel text-xs uppercase tracking-widest text-[#cca025] font-black flex items-center gap-1">
                          <Swords size={12} /> Make Your Moves
                        </h3>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Your Firing Sequence:</span>
                      </div>

                      {/* Interactive Handcuffs Overlay */}
                      {userHandcuffsPending && (
                        <div className="p-4 bg-yellow-950/20 border border-yellow-700/50 rounded-xl space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-cinzel text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1.5">
                              🔗 Select Opponent to Handcuff
                            </span>
                            <button 
                              onClick={() => setUserHandcuffsPending(false)}
                              className="text-[10px] bg-yellow-905 text-yellow-300 hover:bg-neutral-800 px-2.5 py-1 rounded transition-colors cursor-pointer border border-yellow-600/30"
                            >
                              Cancel Selection
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            Select which opponent to handcuff. This skips their very next turn action sequence completely.
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {simPlayers.filter(p => p.id !== 0 && !p.isDead).map(opponent => (
                              <button
                                key={opponent.id}
                                disabled={opponent.skipNext}
                                onClick={() => executeItemOnSimulator(0, "handcuffs", opponent.id)}
                                className={`text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all ${
                                  opponent.skipNext 
                                    ? "bg-gray-950/20 border border-gray-900 text-gray-600 cursor-not-allowed opacity-50"
                                    : "bg-[#0b0c10] border border-gray-800 hover:border-yellow-500 hover:bg-black text-gray-200 cursor-pointer"
                                }`}
                              >
                                🔗 Handcuff {opponent.name} {opponent.role === "devil" && opponent.isExposed && "(DEVIL)"} {opponent.skipNext && "(Already Handcuffed)"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Adrenaline Selection Overlay */}
                      {userAdrenalinePending !== null && (
                        <div className="p-4 bg-red-950/20 border border-red-950 rounded-xl space-y-3">
                          <div className="flex justify-between items-center border-b border-red-950 pb-2">
                            <span className="font-cinzel text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                              💉 Adrenaline Surge Setup
                            </span>
                            <button 
                              onClick={() => setUserAdrenalinePending(null)}
                              className="text-[10px] bg-red-905 text-red-300 hover:bg-neutral-800 px-2.5 py-1 rounded transition-colors cursor-pointer border border-red-600/30"
                            >
                              Cancel Selection
                            </button>
                          </div>

                          {userAdrenalinePending.step === "select-player" && (
                            <div className="space-y-2">
                              <p className="text-[11px] text-gray-400">
                                Choose an opponent from whom you will extract a supply item:
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {simPlayers.filter(p => p.id !== 0 && !p.isDead && p.items.some(it => it !== "adrenaline")).map(opponent => (
                                  <button
                                    key={opponent.id}
                                    onClick={() => setUserAdrenalinePending({ step: "select-item", targetId: opponent.id })}
                                    className="bg-[#0b0c10] border border-gray-800 hover:border-red-500 hover:bg-black text-xs font-bold text-white py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                  >
                                    👤 {opponent.name} ({opponent.items.filter(it => it !== "adrenaline").length} items)
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {userAdrenalinePending.step === "select-item" && userAdrenalinePending.targetId !== null && (() => {
                            const victim = simPlayers.find(p => p.id === userAdrenalinePending.targetId);
                            if (!victim) return null;
                            const stealableItems = victim.items.filter(item => item !== "adrenaline");
                            return (
                              <div className="space-y-3">
                                <p className="text-[11px] text-gray-400">
                                  Choose which item to steal from <strong className="text-white">{victim.name}</strong> and play immediately:
                                </p>
                                {stealableItems.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic">No stealable items left on this opponent.</p>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {stealableItems.map((item, idx) => {
                                      const ref = GAME_ITEMS.find(i => i.id === item)!;
                                      return (
                                        <button
                                          key={idx}
                                          // eslint-disable-next-line react-hooks/refs
                                          onClick={() => executeUserAdrenalineSteal(victim.id, item)}
                                          className="p-3 border border-[#21232c] hover:border-red-500 bg-[#07080b] hover:bg-black text-left rounded-xl transition-all flex items-center gap-2 group cursor-pointer"
                                        >
                                          <span className="text-lg group-hover:scale-120 transition-transform">{ref.icon}</span>
                                          <div>
                                            <div className="font-bold text-white leading-tight text-[11px] group-hover:text-red-400">{ref.name}</div>
                                            <span className="text-[9px] text-gray-500 truncate block">{ref.desc}</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="pt-2">
                                  <button 
                                    onClick={() => setUserAdrenalinePending({ step: "select-player", targetId: null })}
                                    className="text-[10px] text-gray-400 hover:text-white underline flex items-center gap-1 cursor-pointer"
                                  >
                                    ← Back to Opponent Selection
                                  </button>
                               </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Items Row */}
                      {!userHandcuffsPending && userAdrenalinePending === null && (
                        <div className="space-y-3">
                          <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Your Tray Drawers (2x4 Action Deck):</label>
                          
                          <div className="grid grid-cols-4 gap-3 bg-[#050608]/90 border border-neutral-900 rounded-2xl p-4 shadow-inner max-w-sm sm:max-w-md mx-auto md:mx-0">
                            {Array.from({ length: 8 }).map((_, idx) => {
                              const item = simPlayers[localPlayerId].items[idx];
                              if (item) {
                                const ref = GAME_ITEMS.find(i => i.id === item)!;
                                return (
                                  <button
                                    key={idx}
                                    disabled={revolving}
                                    onMouseEnter={() => setHoveredItemDescriptor({ name: ref.name, desc: ref.desc, rule: ref.rule })}
                                    onMouseLeave={() => setHoveredItemDescriptor(null)}
                                    onClick={() => {
                                      setHoveredItemDescriptor(null);
                                      dispatchGameAction("use_item", { itemId: item });
                                    }}
                                    className="aspect-square bg-gradient-to-b from-[#0e0f14] to-[#040507] hover:from-[#171923] hover:to-[#080b12] border-2 border-neutral-850 hover:border-amber-500 rounded-2xl relative flex flex-col items-center justify-center p-2 transition-all duration-300 group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] active:scale-95"
                                  >
                                    <span className="text-3xl md:text-4xl translate-y-[-10px] group-hover:scale-120 group-hover:rotate-6 transition-all duration-300 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
                                      {ref.icon}
                                    </span>
                                    <div className="absolute bottom-2 left-0 right-0 px-1 text-center w-full">
                                      <span className="font-extrabold text-[9px] md:text-[10px] text-neutral-300 group-hover:text-amber-400 tracking-wider uppercase leading-none block truncate max-w-full">
                                        {ref.name}
                                      </span>
                                    </div>
                                  </button>
                                );
                              } else {
                                return (
                                  <div 
                                    key={idx}
                                    className="aspect-square rounded-2xl border-2 border-dashed border-neutral-900/60 bg-[#030406]/60 flex flex-col items-center justify-center relative select-none"
                                  >
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-850">
                                      Empty
                                    </span>
                                    <span className="absolute text-neutral-900 text-[10px] font-mono font-bold bottom-1.5 right-2">
                                      0{idx + 1}
                                    </span>
                                  </div>
                                );
                              }
                            })}
                          </div>

                          {/* Tactical Item Spec Scanner Ticker */}
                          <div className="h-[56px] bg-[#040507] border border-neutral-900 rounded-xl px-4 py-1.5 flex flex-col items-center justify-center text-center max-w-sm sm:max-w-md mx-auto md:mx-0 overflow-hidden shadow-inner">
                            {hoveredItemDescriptor ? (
                              <div className="animate-fade-in space-y-0.5">
                                <div className="text-[10px] md:text-[11px] font-bold text-amber-500 uppercase tracking-widest font-mono">
                                  🚨 {hoveredItemDescriptor.name}: <span className="text-gray-300 font-normal normal-case font-sans">{hoveredItemDescriptor.desc}</span>
                                </div>
                                <div className="text-[9px] text-zinc-500 uppercase tracking-wide font-mono">
                                  Spec: {hoveredItemDescriptor.rule}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[9px] text-neutral-600 uppercase font-mono tracking-widest animate-pulse">
                                Hover over slot to scan item mechanics
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Shoot Targets */}
                      <div className="space-y-2 pt-3 border-t border-gray-800/60">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Targeting Matrix (Pull Trigger on Target):</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={revolving}
                            onClick={() => dispatchGameAction("shoot", { targetId: localPlayerId })}
                            className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                          >
                            <span>👤</span> Shoot Self (Blank preserves turn!)
                          </button>
                          
                          {simPlayers.filter(p => p.id !== localPlayerId && !p.isDead).map((opponent) => (
                            <button
                              key={opponent.id}
                              disabled={revolving}
                              onClick={() => dispatchGameAction("shoot", { targetId: opponent.id })}
                              className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                            >
                              <span>🔫</span> Aim at {opponent.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* GAME ENDED PANEL */}
                  {gameState === "ended" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`relative rounded-3xl border p-8 md:p-12 text-center overflow-hidden shadow-2xl transition-colors ${
                        winnerFaction === "survivors"
                          ? "bg-gradient-to-b from-amber-950/20 via-[#0c1015] to-black border-amber-500/50 shadow-amber-500/10"
                          : "bg-gradient-to-b from-red-950/20 via-[#0c1015] to-black border-red-500/40 shadow-red-500/10"
                      }`}
                    >
                      {/* Ambient background glow ring */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10 overflow-hidden">
                        <motion.div
                          animate={{
                            rotate: [0, 360],
                            scale: [1, 1.05, 1],
                          }}
                          transition={{
                            duration: winnerFaction === "survivors" ? 25 : 15,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className={`w-96 h-96 rounded-full border border-dashed opacity-25 ${
                            winnerFaction === "survivors"
                              ? "border-amber-400"
                              : "border-red-500"
                          }`}
                        />
                      </div>

                      {/* Header Badge */}
                      <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-black border border-gray-800 text-gray-400 mb-6 font-cinzel"
                      >
                        {winnerFaction === "survivors" ? (
                          <>
                            <Shield size={12} className="text-amber-500" />
                            <span className="text-amber-400">Purge Accomplished</span>
                          </>
                        ) : (
                          <>
                            <Skull size={12} className="text-red-500" />
                            <span className="text-red-400">Vessel Overrun</span>
                          </>
                        )}
                      </motion.div>

                      {/* Animated Main Title */}
                      <div className="space-y-3">
                        <motion.h3
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className={`font-cinzel text-2xl md:text-3xl font-black tracking-widest uppercase ${
                            winnerFaction === "survivors"
                              ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-250 to-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)]"
                              : "text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-350 to-red-600 drop-shadow-[0_2px_8px_rgba(239,68,68,0.3)]"
                          }`}
                        >
                          {winnerFaction === "survivors"
                            ? "HUMANS PREVAIL"
                            : "DEVILS DOMINATE"}
                        </motion.h3>

                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="text-gray-400 text-xs max-w-md mx-auto leading-relaxed"
                        >
                          {winnerFaction === "survivors"
                            ? "All lurking demonic infiltrators have been successfully identified and permanently banished from the chamber."
                            : "The human faction could not sustain the onslaught. The dining table belongs entirely to the underworld."}
                        </motion.p>
                      </div>

                      {/* Animated Faction Table Standings */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="my-8 max-w-lg mx-auto bg-black/40 border border-[#21232c]/50 rounded-2xl p-4 text-left space-y-3 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-gray-500 border-b border-gray-800/80 pb-2 font-mono">
                          <span>Final Standing Roster</span>
                          <span>Condition</span>
                        </div>

                        <div className="space-y-2">
                          {simPlayers.map((player) => {
                            const isWinner =
                              (winnerFaction === "survivors" && player.role === "human") ||
                              (winnerFaction === "devils" && player.role === "devil");

                            return (
                              <motion.div
                                key={player.id}
                                whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.02)" }}
                                className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                  player.isDead
                                    ? "opacity-40 bg-transparent border border-transparent"
                                    : isWinner
                                    ? "bg-emerald-950/20 border border-emerald-920/40 text-emerald-200"
                                    : "bg-red-950/20 border border-red-920/40 text-red-200"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {player.isDead ? "💀" : player.role === "human" ? "🛡️" : "😈"}
                                  </span>
                                  <div>
                                    <span className="font-bold">{player.name}</span>
                                    <span className="text-[9px] text-gray-500 ml-2 uppercase font-mono">
                                      {player.role}
                                    </span>
                                  </div>
                                </div>
                                <div className="font-mono text-right flex items-center gap-2 text-[11px]">
                                  {player.isDead ? (
                                    <span className="text-gray-600 line-through">ELIMINATED</span>
                                  ) : (
                                    <>
                                      <span className="text-orange-500 font-semibold">❤️ {player.bp} BP</span>
                                      {isWinner ? (
                                        <span className="text-emerald-400 font-bold font-sans text-[10px]">🏆 CLEANSED</span>
                                      ) : (
                                        <span className="text-red-400 font-bold font-sans text-[10px]">❌ OVERRUN</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>

                      {/* CTAs */}
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <button
                          onClick={resetAllSimulator}
                          className={`relative group inline-flex items-center gap-2 py-3 px-6 rounded-xl font-cinzel font-extrabold text-xs tracking-widest text-black shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer ${
                            winnerFaction === "survivors"
                              ? "bg-amber-500 hover:bg-amber-400 shadow-amber-500/20 hover:shadow-amber-500/40"
                              : "bg-red-500 hover:bg-red-400 shadow-red-500/20 hover:shadow-red-500/40"
                          }`}
                        >
                          <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                          <span>Forge New Run</span>
                        </button>
                      </motion.div>
                    </motion.div>
                  )}

                </div>

                {/* Right Pane (4 Columns) */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Oracle Advice Panel */}
                  <div className="rounded-2xl border border-amber-500/20 bg-[#0d0f17] p-5 shadow-lg relative overflow-hidden">
                    <h3 className="font-cinzel text-xs text-[#cca025] font-bold tracking-widest uppercase mb-1 flex items-center gap-1">
                      <Sparkles size={11} /> Strategy Advisor
                    </h3>
                    <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                      Consult the whispering shadow grimoire to calculate card values and analyze hand mechanics.
                    </p>
                    <button
                      onClick={askAboutGameState}
                      className="w-full py-2 bg-[#cca025]/10 hover:bg-[#cca025]/20 border border-[#cca025]/50 text-[#cca025] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-cinzel"
                    >
                      🔮 Consult Oracle for move
                    </button>
                  </div>

                  {/* IMMERSIVE FEED CHRONICLE */}
                  <div className="rounded-2xl border border-[#21232c] bg-[#0c0d12] p-5 shadow-lg flex flex-col h-[390px]">
                    <div className="pb-3 border-b border-gray-800/80 mb-3 flex justify-between items-center">
                      <span className="font-cinzel text-xs uppercase tracking-widest text-gray-400 font-bold">Chamber Chronicles</span>
                      <span className="text-[9px] text-red-500 font-mono tracking-widest uppercase animate-pulse">Live feed</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                      {simLogs.length === 0 ? (
                        <div className="text-xs text-gray-600 italic">Silent echoes...</div>
                      ) : (
                        simLogs.map((log, id) => (
                          <div key={id} className="text-[11px] leading-relaxed text-gray-300 border-l-2 border-red-900/60 pl-2.5 py-0.5">
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* =========================================================================
            TAB 2: PHYSICAL PLAY COMPANION & TRACKER
            ========================================================================= */}
        {activeTab === "companion" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            
            <div className="rounded-2xl border border-[#21232c] bg-[#0c1015] p-6 shadow-xl space-y-4">
              <h3 className="font-cinzel text-lg text-[#cca025] font-bold tracking-wider">🛠️ Gothic Tabletop Tracker (5 Players Companion)</h3>
              <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                Replace your pencils. Log blood points, monitor constraints, track handcuffs, and note golden shells. Auto-intelligence handles Adrenaline Trigger calculations immediately.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-4">
                {compPlayers.map((player, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border relative transition-all ${
                      player.dead 
                        ? "border-black bg-black/40 opacity-45" 
                        : "border-gray-800 bg-[#11131c]"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <input
                        type="text"
                        value={player.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCompPlayers(prev => prev.map((p, i) => i === idx ? { ...p, name: val } : p));
                        }}
                        className="bg-transparent border-b border-transparent focus:border-[#cca025] text-xs font-bold text-white max-w-[80%] focus:outline-none focus:border-b-amber-500"
                      />
                      <button
                        onClick={() => {
                          setCompPlayers(prev => prev.map((p, i) => i === idx ? { ...p, isDevil: !p.isDevil } : p));
                        }}
                        title="Toggle known secret alignment"
                        className="text-xs grayscale hover:grayscale-0"
                      >
                        {player.isDevil ? "😈" : "👤"}
                      </button>
                    </div>

                    <div className="flex justify-between items-center gap-1.5 mb-3.5">
                      <span className="text-[9px] text-gray-500 uppercase font-mono">Vitals:</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 6 }).map((_, h) => (
                          <span key={h} className="text-xs">
                            {h < player.bp ? "🩸" : "🖤"}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-1 justify-between mb-3.5">
                      <button
                        onClick={() => updateCompHealth(idx, -1)}
                        className="bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-[10px] py-1 px-2 rounded-lg flex-1 cursor-pointer"
                      >
                        -1 BP
                      </button>
                      <button
                        onClick={() => updateCompHealth(idx, 1)}
                        className="bg-green-950/60 hover:bg-green-100 border border-green-805 text-green-300 text-[10px] py-1 px-2 rounded-lg flex-1 cursor-pointer"
                      >
                        +1 BP
                      </button>
                    </div>

                    <div className="flex justify-between items-center gap-1">
                      {player.spiked && (
                        <span className="text-[9px] text-red-400 font-bold bg-red-950 px-1.5 py-0.5 rounded border border-red-900 animate-pulse">
                          🩸 SPIKED
                        </span>
                      )}
                      
                      <button
                        onClick={() => {
                          setCompPlayers(prev => prev.map((p, i) => i === idx ? { ...p, handcuffed: !p.handcuffed } : p));
                        }}
                        className={`px-2 py-0.5 rounded border text-[9px] flex-1 text-center font-semibold cursor-pointer ${
                          player.handcuffed 
                            ? "bg-yellow-950 border-yellow-700 text-yellow-500" 
                            : "bg-black/30 border-gray-800 text-gray-500 hover:text-white"
                        }`}
                      >
                        Constraints
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LIVE DIGITAL SHROUD BARREL FEEDBACK */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              <div className="md:col-span-8 rounded-2xl border border-[#21232c] bg-[#0c1015] p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center pb-2.5 border-b border-gray-800">
                  <h4 className="font-cinzel text-xs text-[#cca025] uppercase tracking-widest font-bold">Physical Barrel Shroud (Digital Matrix)</h4>
                  <span className="text-[10px] text-gray-500 font-mono">Load Reference: #{compRoundNum}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5 py-2">
                  {compCurrentDeck.map((val, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-black/40 rounded-xl border border-gray-900 flex flex-col justify-between items-center text-center h-[95px] relative"
                    >
                      <span className="text-[9px] text-gray-500 font-mono block">Chamber {idx + 1}</span>
                      
                      <div className="text-xs font-bold font-cinzel my-1.5">
                        {val === "live" && <span className="text-[#cca025] block">🟡 LIVE</span>}
                        {val === "blank" && <span className="text-[#9ea6bb] block">⚪ BLANK</span>}
                        {val === "unknown" && <span className="text-neutral-700 block">❓ OPEN</span>}
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => markCompBullet(idx, "live")}
                          className="text-[9px] bg-amber-950 text-[#cca025] hover:bg-amber-900 px-1.5 rounded font-mono font-bold cursor-pointer"
                          title="Mark as Live"
                        >
                          L
                        </button>
                        <button
                          onClick={() => markCompBullet(idx, "blank")}
                          className="text-[9px] bg-slate-900 text-gray-400 hover:bg-gray-800 px-1.5 rounded font-mono font-bold cursor-pointer"
                          title="Mark as Blank"
                        >
                          B
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => handleCompBulletShot("live")}
                    className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-xs px-4 py-2 font-bold rounded-lg transition-all cursor-pointer"
                  >
                    💥 Log Live Hit
                  </button>
                  <button
                    onClick={() => handleCompBulletShot("blank")}
                    className="bg-slate-800/80 hover:bg-slate-700 border border-slate-650 text-slate-300 text-xs px-4 py-2 font-bold rounded-lg transition-all cursor-pointer"
                  >
                    💨 Log Blank dry
                  </button>
                  <button
                    onClick={() => {
                      setCompCurrentDeck(["unknown","unknown","unknown","unknown","unknown","unknown","unknown"]);
                      setCompRoundNum(prev => prev + 1);
                      addCompLog(`🔄 Clockwise rotation load triggered.`);
                      triggerAudio("reload");
                    }}
                    className="bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800 text-amber-300 text-xs px-4 py-2 font-bold rounded-lg transition-all ml-auto cursor-pointer"
                  >
                    🔄 Clear and advance deck loaders
                  </button>
                </div>
              </div>

              {/* Logs */}
              <div className="md:col-span-4 rounded-2xl border border-[#21232c] bg-[#0c0d12] p-5 shadow-lg h-[340px] flex flex-col">
                <span className="font-cinzel text-xs uppercase tracking-widest text-gray-400 font-bold block pb-2 border-b border-gray-800">Companion Logs</span>
                <div className="flex-1 overflow-y-auto space-y-2 mt-2 scrollbar-thin">
                  {compLogs.map((log, idx) => (
                    <div key={idx} className="text-xs text-gray-400 border-l-2 border-yellow-850 pl-2 leading-relaxed">
                      {log}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: DIGITAL SMART RULEBOOK & ODDS ORACLE
            ========================================================================= */}
        {activeTab === "rulebook" && (
          <div className="space-y-8 max-w-4xl mx-auto font-sans">
            
            {/* CALCULATIVE GRAPHICAL INTERACTION VIEW */}
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#12141a] to-[#0c0d12] p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <TrendingUp size={160} />
              </div>
              
              <h3 className="font-cinzel text-lg text-[#cca025] font-bold flex items-center gap-2 mb-2">
                <Zap className="text-[#cca025] animate-pulse" size={18} /> Graphical Math Odds Oracle
              </h3>
              <p className="text-xs text-gray-450 max-w-xl mb-6 leading-relaxed">
                Enter remaining bullet categories inside the tabletop gun. This math matrix computes precise bullet statistics immediately.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Live Shells (Remaining):</label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={calcLive}
                      onChange={(e) => setCalcLive(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-black border border-gray-800 focus:border-[#cca025] text-sm text-yellow-500 font-bold p-2.5 px-3 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Blank Bladed (Remaining):</label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={calcBlank}
                      onChange={(e) => setCalcBlank(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-black border border-gray-800 focus:border-[#cca025] text-sm text-slate-350 font-bold p-2.5 px-3 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 bg-black/60 rounded-xl p-5 border border-gray-900 shadow-inner flex flex-col justify-center text-center space-y-4 relative">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Live Ignition Probability:</span>
                    <div className="text-4xl font-extrabold text-[#c53030] tracking-tight">{liveProbability.toFixed(1)}%</div>
                  </div>

                  <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden flex">
                    <div style={{ width: `${liveProbability}%` }} className="bg-red-700 h-full transition-all duration-500" />
                    <div style={{ width: `${blankProbability}%` }} className="bg-amber-600 h-full transition-all duration-500" />
                  </div>

                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[#c53030] font-bold">💥 {calcLive} LIVE ROUNDS</span>
                    <span className="text-[#cca025] font-bold">💨 {calcBlank} BLANKS SILVER</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Document Codex */}
            <div className="space-y-6">
              <h3 className="font-cinzel text-lg text-white font-bold border-b border-gray-800 pb-2">📜 The Chamber Codex Rulesheet</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                <div className="p-5 bg-[#090b0e] border border-gray-900 rounded-xl space-y-3">
                  <h4 className="font-cinzel font-bold text-xs uppercase tracking-widest text-[#cca025] flex items-center gap-2">🛡️ Human Survivors (3 Seats)</h4>
                  <p className="text-xs text-gray-400">
                    Survivors have no passive triggers. They must leverage Magnifying Glasses and Burner Phones to secure bullet positioning. Their win condition is absolute: completely eliminate all Devils from the dining table.
                  </p>
                  <h4 className="font-cinzel font-bold text-xs uppercase tracking-widest text-[#c53030] flex items-center gap-2 pt-2">😈 Infiltrating Devils (2 Seats)</h4>
                  <p className="text-xs text-gray-400">
                    Devils seek to manipulate the table count. Their win condition requires the complete elimination of all human Survivors. The game only ends when one entire faction is fully wiped out.
                  </p>
                </div>

                <div className="p-5 bg-[#090b0e] border border-gray-900 rounded-xl space-y-3 relative overflow-hidden">
                  <h4 className="font-cinzel font-bold text-xs uppercase tracking-widest text-red-500">🩸 Devil&apos;s Adrenaline Spike & Draw Rules</h4>
                  <p className="text-xs text-gray-405 leading-relaxed">
                    Triggers immediately when a Devil player hits exactly 1 BP or 0 BP, instantly granting +2 Blood Points and exposing them. 
                  </p>
                  <p className="text-[11px] text-gray-500">
                    <strong>Item Selection:</strong> To prevent over-saturation, rare tactical items like 💉 <em>Adrenaline</em> have a significantly reduced draw probability (~4% rate), making every steal extremely valuable.
                  </p>
                  <span className="text-[10px] text-[#cca025] block font-semibold border-t border-gray-900 pt-2 font-mono">Adrenaline Spike triggers only once per match.</span>
                </div>
              </div>

              {/* Items directory info cards */}
              <div className="space-y-4">
                <h4 className="font-cinzel text-xs text-gray-450 uppercase tracking-widest font-bold">Item Database Directory</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {GAME_ITEMS.map((item) => (
                    <div key={item.id} className="p-4 bg-[#090b0e] border border-gray-900 rounded-xl space-y-2 group hover:border-[#cca025] transition-colors leading-relaxed">
                      <div className="flex gap-2.5 items-center">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <h5 className="font-bold text-xs text-white uppercase font-cinzel leading-none">{item.name}</h5>
                          <span className="text-[9px] text-[#cca025]">{item.rule}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: Whispering Oracle (AI ASSISTANT CHAT)
            ========================================================================= */}
        {activeTab === "oracle" && (
          <div className="max-w-3xl mx-auto space-y-6">
            
            <div className="rounded-2xl border border-amber-500/20 bg-[#0d0f17] p-6 shadow-xl text-center space-y-2 relative overflow-hidden">
              <span className="text-4xl animate-pulse block">🔮</span>
              <h3 className="font-cinzel text-lg text-[#cca025] font-bold tracking-wider">The Whispering Oracle Grimoire</h3>
              <p className="text-xs text-gray-400 max-w-xl mx-auto leading-relaxed">
                Connect directly with the AI Master. It understands item combinations, guides mathematical odds, suggests bluffs, and advises on your active simulator state!
              </p>
            </div>

            {/* Chat Pane */}
            <div className="rounded-2xl border border-[#21232c] bg-[#0c0d12] shadow-2xl p-6 flex flex-col h-[480px]">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                {oracleHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 max-w-[85%] ${
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black/80 border border-gray-850 flex items-center justify-center text-sm">
                      {msg.role === "user" ? "👤" : "🔮"}
                    </div>
                    <div
                      className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-red-950/20 border-red-900/40 text-gray-200"
                          : "bg-black/40 border-gray-800/80 text-gray-300"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {isOracleLoading && (
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black/60 border border-gray-800 flex items-center justify-center text-sm animate-pulse">
                      🔮
                    </div>
                    <div className="p-4 rounded-xl border border-gray-800/60 bg-black/30 text-xs text-gray-500 italic flex items-center gap-2 animate-pulse">
                      <span>The shadows are whispering calculated secrets...</span>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleWhisperingOracleConsult} className="mt-4 flex gap-2 pt-4 border-t border-gray-805">
                <input
                  type="text"
                  value={oracleInput}
                  onChange={(e) => setOracleInput(e.target.value)}
                  placeholder="Ask for rules or live moves (e.g., 'What items should I chain with Handsaw?')"
                  className="flex-1 bg-black border border-[#21232c] focus:border-[#cca025] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isOracleLoading || !oracleInput.trim()}
                  className="bg-red-900 hover:bg-red-800 border-t border-t-red-500 disabled:bg-gray-800 disabled:border-gray-900 disabled:text-gray-500 text-white text-xs font-bold font-cinzel uppercase px-6 py-3 rounded-xl tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  Whisper
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Explain the Devil's Adrenaline Spike rule.",
                "What items are disabled during Sudden Death?",
                "Which item is good if the next bullet is unknown?",
                "How does the Adrenaline item work?"
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => { triggerAudio("click"); setOracleInput(q); }}
                  className="bg-[#0c1015]/40 hover:bg-neutral-900 border border-gray-850 px-3 py-1.5 rounded-full text-[10px] text-gray-400 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

          </div>
        )}

      </main>

      {/* --- FOOTER CARD --- */}
      <footer className="border-t border-[#13141a] py-8 text-center text-xs text-gray-650 bg-black/40 mt-12">
        <div className="container mx-auto px-4 space-y-2">
          <p className="font-cinzel text-[10px] tracking-widest text-[#cca025]">THE CHAMBER OF DEVIL — RECREATIONAL REPLICA</p>
          <p>© 2026 Tabletop Companion. Built beautifully and securely.</p>
        </div>
      </footer>

    </div>
  );
}
