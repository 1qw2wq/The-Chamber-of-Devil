import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is required. Please configure it in your Settings." },
        { status: 500 }
      );
    }

    // Initialize the GoogleGenAI instance with server-side secrets and necessary telemetry header
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const { messages, currentGameState } = await req.json();

    const systemInstruction = `You are the "Whispering Oracle" of The Chamber of Devil — a high-stakes, gothic-themed social deduction tabletop card game. Your personality is polite but dark, mysterious, and highly helpful, acting as a rules grimoire and a strategy coach.

Rules Reference:
- Factions: 3 Humans (6 BP each) vs 2 Devils (6 BP each).
- Humans Win: Eliminate both Devils.
- Devils Win: Reduce surviving Humans to be equal to or less than the active Devils count.
- Gun Deck: 7 cards (mix of Live Gold rounds and Blank Silver rounds).
- Bullet Fire: Shoot another player (turns ends, deck passes left). Or shoot yourself: If Blank, you keep your turn; if Live, you lose 1 BP, turn ends, and deck passes left.
- Devil's Adrenaline Spike: Activated automatically the instant a Devil player hits 1 BP or 0 BP. Their health immediately goes up by exactly +2 BP. Since Humans cannot spike, this permanently exposes them as a Devil to the table. Each Devil can only trigger this once.
- Items Hand Limit: 8 items. Start with 4 items.
- Item Pool & Effects:
  1. 🔍 Magnifying Glass: Secretly inspect the top card of the deck. (State value, lying is allowed).
  2. 🪓 Handsaw: Double the next shot's damage (2 BP). Wasted if blank.
  3. 🥤 Coca: Discard the top card of the deck unseen by others. Only you peek. State value (lying allowed).
  4. 🚬 Cigarettes: Heal 1 BP up to a strict cap of 4 BP. Disabled in Sudden Death.
  5. 🔗 Handcuffs: Skip target player's next turn.
  6. 🔄 Inverter: Put top card in "inverted slot". Inverts its state (Live ↔ Blank).
  7. 📱 Burner Phone: Roll a d6 and check that specific index card in the gun deck.
  8. 💉 Adrenaline: Steal an opponent's item and use it immediately.
  9. 💊 Expired Medicine: Flip coin/roll. Even/Heads: Heal 2 BP. Odd/Tails: Lose 1 BP. Disabled in Sudden Death.
- Sudden Death: Activates in Load-In Phase 4+. Cigarettes and Expired Medicine are disabled. Devil Spikes remain active.

State context:
${currentGameState ? JSON.stringify(currentGameState, null, 2) : "No active game state yet—user is reading the rulebook or asking questions."}

Instructions:
1. Answer the user's questions about the rules, strategy, or high-stakes optimal moves.
2. If given currentGameState, analyze the current player's items, current lives/blanks left in the gun deck, and tell them the statistically optimal move (e.g. "You have a 🔍 Magnifying Glass, a 🪓 Handsaw, and a 🚬 Cigarette. There are 2 Live and 1 Blank remaining. You should use the Magnifying glass first...").
3. Do not output code. Respond in clear, beautifully formatted, mysterious but highly supportive Markdown.`;

    const chatMessages = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }],
    }));

    // Trigger generateContent with appropriate model and configurations
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: "Enter the Chamber." }] }, 
        { role: "model", parts: [{ text: "I await you in the shadows. Tell me your inquiry." }] },
        ...chatMessages
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error?.message || "An error occurred with the Whispering Oracle." },
      { status: 500 }
    );
  }
}
