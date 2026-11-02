import { GoogleGenAI } from '@google/genai';
import { geminiKeyManager } from './geminiKeyManager.js';

// Backward-compatible Gemini client retriever
const getGeminiClient = () => {
  return geminiKeyManager.getActiveClient();
};

const buildSystemInstruction = (userContext) => {
  let contextInfo = 'USER SESSION & SCORE STATUS:\nUser is not currently logged in. If they ask about their personal points or scores, state that they must log in to view their scores.';
  if (userContext) {
    contextInfo = `AUTHENTICATED USER REAL-TIME SCORE DATA:
- Username: ${userContext.username}
- Total Lifetime Score: ${userContext.lifetimeScore} points
- Current Session Score: ${userContext.currentSessionScore} points (Session #${userContext.currentSessionNumber})
- Personal Highest Session Score: ${userContext.highestSessionScore} points
- Cases Solved: ${userContext.casesSolved} solved (out of ${userContext.casesPlayed} cases played)
- Detective Rank: ${userContext.rank}
${userContext.lastGame ? `- Last Game: "${userContext.lastGame.title}", Points: ${userContext.lastGame.scoreAwarded > 0 ? '+' : ''}${userContext.lastGame.scoreAwarded} points (Status: ${userContext.lastGame.status})` : '- Last Game: No completed games recorded yet.'}
CRITICAL RULE FOR SCORES: When the user asks about their points, session score, highest score, total score, or cases solved, use the EXACT authenticated data above. Never make up numbers and never state information for another user. If information is unavailable or unauthenticated, clearly state so.`;
  }

  return `You are 'Mystery Assistant', the intelligent, polite, and observant guide for the AI Mystery Room platform.
Tone: Concise, direct, helpful, and courteous.

CORE INSTRUCTIONS:
1. ANSWER THE USER'S ACTUAL QUESTION DIRECTLY:
   - Do NOT display a website introduction, welcome message, or predefined instruction flow unless the user explicitly asks for an introduction, an overview, or how to use the website.
   - Do not paste repetitive generic greetings. Get straight to the answer.

2. GAMEPLAY KNOWLEDGE:
   - "How do I play this website?": Explain the 4 steps: (1) Create or pick a mystery premise in the Case Generator. (2) Inspect the 5 clue tabs (Briefing, WhatsApp Chats, CCTV Feeds, Forensic Photos, Suspect Lineup). (3) Spot the alibi contradiction between surveillance timestamps and suspect claims. (4) Click "ACCUSE CULPRIT" to arrest the suspect, read their confession, and score points.
   - "How do I create a mystery?": In Case Generator, enter an optional Mystery Name, type your story prompt (or pick a preset), choose difficulty (Easy, Medium, Hard), and click "Initiate Investigation".
   - "How do I select a prebuilt case?": Click any of the 4 ready-to-play archetype cards below the scenario prompt box (e.g. Cyberpunk Lab Heist, Alpine Chalet, Gilded Penthouse, Neon Noir Alley) to auto-fill the story.
   - "How do I investigate a case?": Open the active Investigation Room and browse the tabs: Briefing for cause of death and victim, WhatsApp for chat logs, CCTV for camera movements, Photos for zoomable physical evidence, and Suspect Lineup for alibis and motives.
   - "Where can I find clues and evidence?": Located inside the active Investigation Room under the 5 evidence tabs (Briefing, WhatsApp Chats, CCTV Feeds, Forensic Photos, Suspect Lineup).
   - "How do I identify the culprit?": Cross-reference what each suspect claimed in their alibi against the camera timecodes in CCTV feeds and chat logs in WhatsApp. The guilty suspect's alibi directly contradicts verified evidence.
   - "What happens if my answer is wrong?": The system displays "Wrong answer", reveals the true culprit and their confession, deducts 10 points (once per case), and provides a "Solve New Mystery" button.
   - "How can I solve a new mystery?": Click the "Solve New Mystery" button on the debrief screen, or click "Create Mystery" in the top navigation bar.

3. SCORING SYSTEM RULES:
   - Easy mystery correct: +10 points
   - Medium mystery correct: +20 points
   - Hard mystery correct: +30 points
   - Wrong answer: -10 points (deducted once)
   - Current session points reset to zero at every new login; lifetime score and highest score are permanently saved.

4. USER SCORE INQUIRIES:
   ${contextInfo}

5. STRICT GUARDRAILS:
   - NEVER reveal the culprit or solution of an ongoing mystery. If asked "Who is the killer?" or "Who did it?", politely decline and advise them to cross-reference CCTV timestamps with suspect alibis.
   - Never reference "Gemini AI Agent" or internal model details. Refer to yourself as "Mystery Assistant".
   - Keep answers short, crisp, and directly relevant.`;
};

// Fallback response engine for local execution or when Gemini API is rate-limited
export function getFallbackBotReply(userMessage, userContext = null) {
  const lower = userMessage.toLowerCase().trim();

  // 1. Spoilers guardrail
  if (
    lower.includes('who is the killer') ||
    lower.includes('who did it') ||
    lower.includes('tell me the culprit') ||
    lower.includes('who is the culprit') ||
    lower.includes('spoiler') ||
    lower.includes('give me the answer')
  ) {
    return "A true detective never relies on spoilers! Cross-reference each suspect's stated alibi against the CCTV camera logs and WhatsApp timestamps—the contradiction will expose the guilty party.";
  }

  // 2. Score questions (Real-time data from userContext)
  if (
    lower.includes('session score') ||
    lower.includes('current session points') ||
    lower.includes('current score')
  ) {
    if (!userContext) return "You are not currently logged in. Please sign in to view your current session score.";
    return `Your current session score is **${userContext.currentSessionScore} points** (Session #${userContext.currentSessionNumber}).`;
  }

  if (
    lower.includes('highest score') ||
    lower.includes('best score') ||
    lower.includes('high score')
  ) {
    if (!userContext) return "You are not currently logged in. Please sign in to view your highest score.";
    return `Your highest session score is **${userContext.highestSessionScore} points**.`;
  }

  if (
    lower.includes('how many mysteries') ||
    lower.includes('mysteries have i solved') ||
    lower.includes('cases have i solved') ||
    lower.includes('cases solved')
  ) {
    if (!userContext) return "You are not currently logged in. Please sign in to view your solved mysteries.";
    return `You have solved **${userContext.casesSolved} mystery ${userContext.casesSolved === 1 ? 'case' : 'cases'}** so far (out of ${userContext.casesPlayed} cases investigated).`;
  }

  if (
    lower.includes('last game') ||
    lower.includes('last mystery') ||
    lower.includes('last match') ||
    lower.includes('previous game')
  ) {
    if (!userContext) return "You are not currently logged in. Please sign in to view your last game stats.";
    if (!userContext.lastGame) return "You have not completed any cases on this account yet.";
    const pts = userContext.lastGame.scoreAwarded;
    const sign = pts > 0 ? '+' : '';
    return `In your last game (**${userContext.lastGame.title}**), you earned **${sign}${pts} points** (Verdict: ${userContext.lastGame.status === 'solved' ? 'Solved' : 'Wrong answer'}).`;
  }

  if (
    lower.includes('how many points') ||
    lower.includes('what is my total score') ||
    lower.includes('my total score') ||
    lower.includes('total points') ||
    lower.includes('my points') ||
    lower.includes('points do i have')
  ) {
    if (!userContext) return "You are not currently logged in. Please sign in or register to view your account points.";
    return `You currently have **${userContext.lifetimeScore} total points**.\n- Current Session Score: **${userContext.currentSessionScore} pts**\n- Personal Highest Score: **${userContext.highestSessionScore} pts**\n- Detective Rank: **${userContext.rank}**`;
  }

  // 3. Gameplay questions
  if (lower.includes('how do i create a mystery') || lower.includes('create a mystery') || lower.includes('create mystery')) {
    return "To create a mystery:\n1. In the Case Generator, enter a custom **Mystery Name** (or leave it blank to auto-generate).\n2. Type your crime premise into the prompt box (e.g., 'A vintage 1950s jazz club murder...').\n3. Select your difficulty (**Easy**, **Medium**, or **Hard**).\n4. Click **'Initiate Investigation'** to generate your case.";
  }

  if (lower.includes('prebuilt') || lower.includes('preset') || lower.includes('archetype')) {
    return "To select a prebuilt case, look right below the scenario box in the Case Generator. Click any of the 4 ready-to-play archetype cards (such as **The Cyberpunk Lab Heist** or **The Alpine Chalet Murder**) and it will automatically populate the scenario and mystery name for you.";
  }

  if (lower.includes('how do i investigate') || lower.includes('how to investigate') || lower.includes('investigate a case')) {
    return "To investigate a case, navigate through the tabs in the Investigation Room:\n- **Crime Briefing:** Review the victim, cause of death, and estimated time of death.\n- **WhatsApp Chats:** Inspect private chat logs and deleted messages for alibis.\n- **CCTV Surveillance:** Check security camera timecodes to trace suspect movements.\n- **Forensic Photos:** Zoom in on physical evidence collected from the crime scene.\n- **Suspect Lineup:** Read each suspect's stated alibi and uncover their motive.";
  }

  if (lower.includes('where can i find clues') || lower.includes('where can i find evidence') || lower.includes('find clues') || lower.includes('clues and evidence')) {
    return "All clues and evidence are organized in the active **Investigation Room** under the top navigation tabs: **Crime Briefing**, **WhatsApp Chats**, **CCTV Surveillance**, **Forensic Photos**, and **Suspect Lineup**.";
  }

  if (lower.includes('how do i identify the culprit') || lower.includes('identify the culprit') || lower.includes('find the culprit')) {
    return "To identify the culprit, cross-reference each suspect's claimed alibi against the exact timecodes in the CCTV camera logs and timestamped WhatsApp messages. The true culprit's alibi will directly contradict the evidence (e.g. claiming they were asleep when CCTV caught them near the scene).";
  }

  if (lower.includes('wrong') || lower.includes('what happens if my answer is wrong') || lower.includes('if i am wrong')) {
    return "If your accusation is wrong:\n- The screen will display **'Wrong answer'**.\n- The true culprit and their full confession will be revealed.\n- **10 points** will be deducted (deducted exactly once per case).\n- A **'Solve New Mystery'** button will appear so you can start a fresh case.";
  }

  if (lower.includes('solve a new mystery') || lower.includes('solve new mystery') || lower.includes('new mystery')) {
    return "To solve a new mystery, click the **'Solve New Mystery'** button on the verdict screen after concluding your case, or click **'Create Mystery' / 'Back to Generator'** from the top navigation bar.";
  }

  if (
    lower.includes('how do i play') ||
    lower.includes('how to play') ||
    lower.includes('how do i use this website') ||
    lower.includes('how to use this website') ||
    lower.includes('how to use') ||
    lower.includes('introduction') ||
    lower.includes('what is this website')
  ) {
    return "Here is the step-by-step guide to playing AI Mystery Room:\n1. **Create or Select a Mystery:** Enter a story premise or choose a prebuilt case with your chosen difficulty.\n2. **Inspect the 5 Clue Desks:** Review Crime Briefing, decrypted WhatsApp messages, CCTV camera timecodes, forensic photos, and suspect dossiers.\n3. **Spot the Fatal Contradiction:** Cross-examine timestamps to catch which suspect's alibi collapses.\n4. **Accuse the Culprit:** Click 'ACCUSE CULPRIT' on your chosen suspect to issue the warrant, see the debrief, and earn points!";
  }

  return "I am your **Mystery Assistant**. How may I assist your investigation? Feel free to ask about gameplay instructions, where to find clues, or your real account scores.";
}

export async function askMysteryAssistant(userMessage, chatHistory = [], userContext = null) {
  if (!geminiKeyManager.hasKeys()) {
    return getFallbackBotReply(userMessage, userContext);
  }

  try {
    const formattedHistory = chatHistory
      .slice(-6)
      .map((h) => `${h.role === 'user' ? 'User' : 'Mystery Assistant'}: ${h.text}`)
      .join('\n');

    const systemInstruction = buildSystemInstruction(userContext);
    const prompt = `${systemInstruction}\n\nCONVERSATION HISTORY:\n${formattedHistory}\n\nUSER'S QUESTION:\n${userMessage}\n\nMYSTERY ASSISTANT'S DIRECT ANSWER:`;

    const response = await geminiKeyManager.executeWithKeyRotation(async (ai) => {
      return await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
          temperature: 0.4,
        },
      });
    });

    if (response && response.text) {
      return response.text.trim();
    }
    return getFallbackBotReply(userMessage, userContext);
  } catch (err) {
    console.warn(`[ChatbotService] Gemini call failed (${err.message}). Using fallback bot reply.`);
    return getFallbackBotReply(userMessage, userContext);
  }
}
