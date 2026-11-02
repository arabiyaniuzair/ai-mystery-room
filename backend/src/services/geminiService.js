import { GoogleGenAI, Type } from '@google/genai';
import { geminiKeyManager } from './geminiKeyManager.js';

// Backward-compatible Gemini client retriever
const getGeminiClient = () => {
  return geminiKeyManager.getActiveClient();
};

// Strict JSON Schema for Mystery Generation
const mysteryResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Catchy noir or modern mystery case title' },
    briefing: { type: Type.STRING, description: 'High-level detective briefing narrative setting the scene' },
    crimeDetails: {
      type: Type.OBJECT,
      properties: {
        victimName: { type: Type.STRING },
        timeOfCrime: { type: Type.STRING },
        location: { type: Type.STRING },
        causeOfDeath: { type: Type.STRING },
      },
      required: ['victimName', 'timeOfCrime', 'location', 'causeOfDeath'],
    },
    suspects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          suspectId: { type: Type.STRING },
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          avatarUrl: { type: Type.STRING },
          statedAlibi: { type: Type.STRING },
          motive: { type: Type.STRING },
          isCulprit: { type: Type.BOOLEAN },
          confession: { type: Type.STRING },
        },
        required: ['suspectId', 'name', 'role', 'statedAlibi', 'motive', 'isCulprit', 'confession'],
      },
    },
    clues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clueId: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['whatsapp', 'cctv', 'photo', 'document'] },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          isRedHerring: { type: Type.BOOLEAN },
          payload: {
            type: Type.OBJECT,
            properties: {
              messages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sender: { type: Type.STRING },
                    text: { type: Type.STRING },
                    timestamp: { type: Type.STRING },
                    isDeleted: { type: Type.BOOLEAN },
                  },
                },
              },
              cameraLogs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    camId: { type: Type.STRING },
                    location: { type: Type.STRING },
                    timestamp: { type: Type.STRING },
                    detectedSubject: { type: Type.STRING },
                    actionDescription: { type: Type.STRING },
                    imageUrl: { type: Type.STRING },
                  },
                },
              },
              imageUrl: { type: Type.STRING },
              documentText: { type: Type.STRING },
            },
          },
        },
        required: ['clueId', 'type', 'title', 'description', 'payload'],
      },
    },
    solutionExplanation: {
      type: Type.STRING,
      description: 'Step-by-step breakdown of how the clues prove the culprit guilty and exonerate others',
    },
  },
  required: ['title', 'briefing', 'crimeDetails', 'suspects', 'clues', 'solutionExplanation'],
};

/**
 * Procedural Dynamic Fallback Mystery Generator
 * Generates rich, logically sound cases if Gemini API Key is not set or network fails
 */
function generateProceduralMystery(scenarioPrompt, difficulty = 'medium') {
  const promptLower = scenarioPrompt.toLowerCase();
  
  // Choose thematic archetype based on scenario keywords
  let theme = 'mansion';
  if (promptLower.includes('cyber') || promptLower.includes('tech') || promptLower.includes('ai') || promptLower.includes('lab') || promptLower.includes('hack')) {
    theme = 'cyberpunk';
  } else if (promptLower.includes('space') || promptLower.includes('ship') || promptLower.includes('mars') || promptLower.includes('station')) {
    theme = 'scifi';
  } else if (promptLower.includes('chalet') || promptLower.includes('snow') || promptLower.includes('mountain') || promptLower.includes('ski')) {
    theme = 'chalet';
  } else if (promptLower.includes('museum') || promptLower.includes('art') || promptLower.includes('gallery')) {
    theme = 'museum';
  }

  const themes = {
    cyberpunk: {
      title: 'Neon Requiem: The Quantum Protocol Murder',
      victim: 'Dr. Akira Vance (Lead Quantum Cryptographer)',
      location: 'Apex Dynamics R&D Sky-Tower, Level 88, Neo-District',
      time: '11:42 PM',
      cause: 'Neuro-toxin injection masquerading as cybernetic cyber-implant overload',
      briefing: `The late-night rainfall beats against the neon glass of Apex Dynamics. At 11:42 PM, the life-support telemetry of Chief Scientist Dr. Akira Vance flatlined. His private biometric terminal had been accessed, his quantum decryption keys copied, and a syringe of lethal paralytic neurotoxin was retrieved from his jacket. Three prime suspects were present inside the high-security sector.`,
      suspects: [
        {
          suspectId: 'suspect_1',
          name: 'Elena Rostova',
          role: 'Senior Vice President of Operations',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
          statedAlibi: 'Claims she was attending an encrypted board teleconference from her private suite on Level 92 between 11:20 PM and 12:15 AM.',
          motive: 'Akira planned to blow the whistle on Elena’s illicit sale of quantum prototypes to foreign syndicates.',
          isCulprit: true,
          confession: 'Akira was naive. He thought his moral compass was worth billions in market cap! I bypassed the executive elevator, slipped down the emergency vent shaft, and spiked his stim-drink with synthetic neurotoxin before wiping the server log. I never thought anyone would match the timestamp on the emergency door breach with my smart-watch telemetry!'
        },
        {
          suspectId: 'suspect_2',
          name: 'Jax "Ghost" Mercer',
          role: 'Lead AI Systems Engineer & Hacker',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
          statedAlibi: 'Claims he was in Server Vault 3 debugging a firewall breach during the entire timeframe.',
          motive: 'Bitter resentment over Akira taking sole credit for the autonomous neural network Jax built.',
          isCulprit: false,
          confession: ''
        },
        {
          suspectId: 'suspect_3',
          name: 'Maya Lin',
          role: 'Biomedical Cybernetics Specialist & Lab Assistant',
          avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
          statedAlibi: 'Claims she was preparing chemical reagent stocks in the Sub-Level 2 chemistry storage until 11:50 PM.',
          motive: 'In a secret romantic liaison with Akira that had turned into a bitter custody dispute over proprietary research patents.',
          isCulprit: false,
          confession: ''
        }
      ],
      whatsappMessages: [
        { sender: 'Elena Rostova', text: 'Akira, we need to speak before the audit tomorrow morning. Don’t do anything reckless.', timestamp: '10:45 PM', isDeleted: false },
        { sender: 'Dr. Akira Vance', text: 'The documents are already sealed. I’m submitting the whistleblowing dossier to regulatory authorities at midnight.', timestamp: '10:52 PM', isDeleted: false },
        { sender: 'Elena Rostova', text: 'This message was deleted by sender.', timestamp: '11:15 PM', isDeleted: true },
        { sender: 'Jax "Ghost" Mercer', text: 'Doc, Server Vault 3 is throwing abnormal packet loss. Did you authorize a manual terminal bypass?', timestamp: '11:38 PM', isDeleted: false },
        { sender: 'Dr. Akira Vance', text: 'No, looking into it now...', timestamp: '11:40 PM', isDeleted: false }
      ],
      cctvLogs: [
        {
          camId: 'CAM-88-HALL',
          location: 'Executive Laboratory Corridor',
          timestamp: '11:32 PM',
          detectedSubject: 'Unidentified figure in hooded Apex security jacket',
          actionDescription: 'Figure swipes emergency maintenance keycard into Dr. Vance’s private chamber.',
          imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80'
        },
        {
          camId: 'CAM-92-ROOF',
          location: 'Sky-Suite Private Balcony (Elena’s Office)',
          timestamp: '11:28 PM',
          detectedSubject: 'Elena Rostova',
          actionDescription: 'Elena steps away from teleconference terminal and enters emergency service stairwell.',
          imageUrl: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800&auto=format&fit=crop&q=80'
        },
        {
          camId: 'CAM-VAULT-3',
          location: 'Core Quantum Server Room',
          timestamp: '11:35 PM - 11:55 PM',
          detectedSubject: 'Jax Mercer',
          actionDescription: 'Continuous terminal typing verified; Jax remains seated at terminal 3 console.',
          imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80'
        }
      ],
      photos: [
        {
          title: 'Encrypted Emergency Service Door Log',
          description: 'Access log shows emergency door from Level 92 to Level 88 unlocked at 11:30 PM with Master Executive Keycard #002.',
          imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80'
        },
        {
          title: 'Recovered Cyber-Syringe',
          description: 'Syringe found in the bio-waste chute. Residue of high-grade neurotoxin; microscopic gold cufflink fiber recovered near the plunger.',
          imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80'
        }
      ],
      solutionExplanation: `Elena Rostova claimed she was locked in an encrypted video conference in her suite on Level 92 from 11:20 PM to 12:15 AM. However, CCTV CAM-92 shows her leaving her desk and stepping into the emergency stairwell at 11:28 PM. The emergency door log confirms Master Keycard #002 (registered to Elena) opened the Level 88 lab corridor at 11:30 PM. Meanwhile, Jax Mercer was continuously logged into Server Vault 3, and Maya Lin’s biometric card showed her stuck in the basement. Elena deleted a threatening text at 11:15 PM and murdered Akira to prevent his whistleblowing report.`
    },
    chalet: {
      title: 'Blood on the Powder: The Silverhorn Chalet Mystery',
      victim: 'Lord Alistair Sterling (Aviation Tycoon)',
      location: 'Silverhorn Luxury Ski Lodge, Aspen Ridge',
      time: '10:15 PM',
      cause: 'Single blunt-force blow to the temple with a heavy antique bronze ski trophy',
      briefing: `A violent blizzard has sealed all roads leading to the isolated Silverhorn Lodge. At 10:15 PM, gunshots were presumed heard, but Lord Sterling was found dead by the hearth, struck from behind. The trophy was cleaned with turpentine, and footprints outside lead nowhere due to the raging storm. Three guests and staff were inside the locked lodge.`,
      suspects: [
        {
          suspectId: 'suspect_1',
          name: 'Julian Sterling',
          role: 'Estranged Son & Heir',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
          statedAlibi: 'Claims he was asleep in the west guest wing after heavy drinking from 9:30 PM onwards.',
          motive: 'Alistair informed Julian during dinner that he was disinheriting him in favor of a wildlife trust.',
          isCulprit: true,
          confession: 'He treated me like dirt my whole life! He was going to sign the amended will tomorrow morning with his lawyers. I had to act. I slipped into the library through the conservatory pantry, took the bronze trophy, and ended it. I washed it in the basement sink, but I dropped my lighter in the woodbox!'
        },
        {
          suspectId: 'suspect_2',
          name: 'Beatrice Fontaine',
          role: 'Personal Financial Advisor',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
          statedAlibi: 'Reviewing tax filings in the second-floor study; heard a loud thud around 10:15 PM.',
          motive: 'Suspected of siphoning millions from the Sterling trust fund.',
          isCulprit: false,
          confession: ''
        },
        {
          suspectId: 'suspect_3',
          name: 'Klaus Webber',
          role: 'Chalet Caretaker & Former Ski Instructor',
          avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
          statedAlibi: 'Checking the generator sheds on the south perimeter due to blizzard power drops.',
          motive: 'Had a bitter dispute over unpaid wages and eviction threats.',
          isCulprit: false,
          confession: ''
        }
      ],
      whatsappMessages: [
        { sender: 'Lord Alistair', text: 'Julian, bring your passport and paperwork to the library tomorrow. We are finalizing the severance.', timestamp: '08:45 PM', isDeleted: false },
        { sender: 'Julian Sterling', text: 'Father, please. Let us discuss this like civilized adults.', timestamp: '08:50 PM', isDeleted: false },
        { sender: 'Julian Sterling', text: 'You will regret this if you cut me out.', timestamp: '09:12 PM', isDeleted: false },
        { sender: 'Beatrice Fontaine', text: 'Alistair, the revised trust agreement is ready on your study desk.', timestamp: '09:40 PM', isDeleted: false },
        { sender: 'Julian Sterling', text: 'This message was deleted by sender.', timestamp: '10:05 PM', isDeleted: true }
      ],
      cctvLogs: [
        {
          camId: 'CAM-HALLWAY-WEST',
          location: 'West Wing Corridor (Outside Julian’s room)',
          timestamp: '10:02 PM',
          detectedSubject: 'Julian Sterling',
          actionDescription: 'Julian leaves his bedroom dressed in dark thermal clothes, heading toward the kitchen pantry.',
          imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80'
        },
        {
          camId: 'CAM-STUDY-LOBBY',
          location: 'Second Floor Study Entry',
          timestamp: '10:14 PM',
          detectedSubject: 'Beatrice Fontaine',
          actionDescription: 'Beatrice is visible sitting at the study table working under a green desk lamp.',
          imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80'
        },
        {
          camId: 'CAM-GENERATOR-SHED',
          location: 'South Perimeter Generator Room',
          timestamp: '10:10 PM - 10:25 PM',
          detectedSubject: 'Klaus Webber',
          actionDescription: 'Klaus seen refueling emergency generator with high-vis snow suit.',
          imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80'
        }
      ],
      photos: [
        {
          title: 'Engraved Silver Lighter in Woodbox',
          description: 'A custom sterling-silver lighter engraved with the initials "J.S." found hidden beneath pine logs in the library fireplace.',
          imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80'
        },
        {
          title: 'Disputed Last Will & Testament',
          description: 'Draft will disinheriting Julian Sterling lying soaked in spilled port wine on the library bureau.',
          imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80'
        }
      ],
      solutionExplanation: `Julian claimed he was asleep in the west guest wing from 9:30 PM onwards. However, CCTV CAM-HALLWAY-WEST caught him walking toward the library at 10:02 PM. His monogrammed lighter ('J.S.') was found directly at the crime scene in the library woodbox. Beatrice Fontaine was recorded on CCTV at her desk at 10:14 PM, and Klaus was confirmed refueling the generator. Julian murdered his father to stop the will from being altered.`
    },
    mansion: {
      title: 'Shadows at Blackwood Manor',
      victim: 'Arthur Pendelton (Antiquities Collector)',
      location: 'The Blackwood Manor Conservatory & Study',
      time: '09:30 PM',
      cause: 'Poisoning via rare aconite alkaloids in vintage Scotch whiskey',
      briefing: `During an exclusive stormy evening gathering at Blackwood Manor, Arthur Pendelton collapsed after toasting his guests with a 50-year-old single malt. The decanter was pristine, but the crystal tumbler on his desk tested positive for lethal wolfsbane poison. Only three people had access to the private bar.`,
      suspects: [
        {
          suspectId: 'suspect_1',
          name: 'Vincent Drake',
          role: 'Art Dealer & Business Partner',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
          statedAlibi: 'Smoking a cigar on the covered veranda between 9:15 PM and 9:45 PM.',
          motive: 'Arthur discovered Vincent was selling forged Renaissance tapestries through their joint gallery.',
          isCulprit: true,
          confession: 'Arthur was going to ruin me. Decades of reputation, gone! I coated the rim of his favorite tumbler with aconite paste before dinner. When he poured his evening drink, the alcohol dissolved the toxin. He never knew what hit him!'
        },
        {
          suspectId: 'suspect_2',
          name: 'Clara Oswald',
          role: 'Manor Archivist & Botanist',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
          statedAlibi: 'Cataloging rare herb specimens in the greenhouse laboratory.',
          motive: 'Angered by Arthur’s reckless exploitation of endangered botanical reserves.',
          isCulprit: false,
          confession: ''
        },
        {
          suspectId: 'suspect_3',
          name: 'Harrison Reed',
          role: 'Head Butler & Estate Steward',
          avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
          statedAlibi: 'Polishing silver in the main butler’s pantry adjacent to the kitchen.',
          motive: 'Arthur cut his pension plan last month without notice.',
          isCulprit: false,
          confession: ''
        }
      ],
      whatsappMessages: [
        { sender: 'Vincent Drake', text: 'Arthur, let’s keep the police out of the Florentine sale. We can settle this financially.', timestamp: '08:15 PM', isDeleted: false },
        { sender: 'Arthur Pendelton', text: 'The provenance was forged, Vincent. My reputation will not be dragged into your fraudulent schemes.', timestamp: '08:24 PM', isDeleted: false },
        { sender: 'Vincent Drake', text: 'Let us have a drink at 9:30 PM and discuss terms calmly.', timestamp: '08:55 PM', isDeleted: false },
        { sender: 'Clara Oswald', text: 'Mr. Pendelton, the greenhouse specimens must not be exposed to the fumigation tonight.', timestamp: '09:05 PM', isDeleted: false }
      ],
      cctvLogs: [
        {
          camId: 'CAM-CONSERVATORY-BAR',
          location: 'Private Study Bar Cart',
          timestamp: '09:12 PM',
          detectedSubject: 'Vincent Drake',
          actionDescription: 'Vincent approaches the bar cart with gloved hands and manipulates Arthur’s crystal tumbler.',
          imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80'
        },
        {
          camId: 'CAM-VERANDA-EAST',
          location: 'Covered Veranda',
          timestamp: '09:35 PM',
          detectedSubject: 'Vincent Drake',
          actionDescription: 'Vincent seen extinguishing cigar and looking anxiously toward the study windows.',
          imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&auto=format&fit=crop&q=80'
        },
        {
          camId: 'CAM-GREENHOUSE-NORTH',
          location: 'Botanical Greenhouse',
          timestamp: '09:10 PM - 09:40 PM',
          detectedSubject: 'Clara Oswald',
          actionDescription: 'Clara is continuously visible watering orchids and filing index cards.',
          imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop&q=80'
        }
      ],
      photos: [
        {
          title: 'Poison Swab from Crystal Tumbler',
          description: 'Ultraviolet forensic illumination highlights chemical residue concentrated solely on the mouth-rim of the victim’s whiskey glass.',
          imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop&q=80'
        },
        {
          title: 'Leather Glove Recovered in Library Wastebasket',
          description: 'A brown calfskin leather glove bearing matching traces of aconite alkaloids and Vincent Drake’s custom cologne.',
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
        }
      ],
      solutionExplanation: `Vincent Drake claimed he was peacefully on the veranda from 9:15 PM onwards. However, CAM-CONSERVATORY-BAR caught him wearing gloves at 9:12 PM tampering with Arthur’s personal crystal glass. The discarded leather glove found in the study bore Vincent’s scent and the exact aconite poison that killed Arthur. Vincent committed the murder to silence Arthur before his art forgery scandal went public.`
    }
  };

  const selected = themes[theme] || themes.mansion;

  // Adapt case to user's custom prompt title if provided
  return {
    title: `${selected.title} (${scenarioPrompt.slice(0, 30)}...)`,
    briefing: `[Investigation based on your scenario: "${scenarioPrompt}"]\n\n${selected.briefing}`,
    crimeDetails: {
      victimName: selected.victim,
      timeOfCrime: selected.time,
      location: selected.location,
      causeOfDeath: selected.cause,
    },
    suspects: selected.suspects,
    clues: [
      {
        clueId: 'clue_whatsapp_1',
        type: 'whatsapp',
        title: 'Recovered WhatsApp Chat Transcripts',
        description: 'Decrypted communications from the victim’s mobile device found near the scene.',
        isRedHerring: false,
        payload: {
          messages: selected.whatsappMessages,
        },
      },
      {
        clueId: 'clue_cctv_1',
        type: 'cctv',
        title: 'Surveillance Camera (CCTV) Timestamp Feeds',
        description: 'Chronological security log retrieved from the primary security mainframe.',
        isRedHerring: false,
        payload: {
          cameraLogs: selected.cctvLogs,
        },
      },
      ...selected.photos.map((p, idx) => ({
        clueId: `clue_photo_${idx + 1}`,
        type: 'photo',
        title: p.title,
        description: p.description,
        isRedHerring: false,
        payload: {
          imageUrl: p.imageUrl,
          documentText: p.description,
        },
      })),
    ],
    solutionExplanation: selected.solutionExplanation,
  };
}

/**
 * Main Service Method: Generate Mystery using Gemini API with intelligent fallback and key rotation
 */
export async function generateMysteryFromAI(scenarioPrompt, difficulty = 'medium') {
  if (!geminiKeyManager.hasKeys()) {
    console.info('[GeminiService] No Gemini API keys detected or mock mode active. Generating procedural mystery case.');
    return generateProceduralMystery(scenarioPrompt, difficulty);
  }

  try {
    const prompt = `
Create a complete, solvable detective mystery room game based on this scenario:
"${scenarioPrompt}"
Difficulty level: ${difficulty}.

REQUIREMENTS:
1. Exactly ONE suspect must have isCulprit: true. The other suspects must have isCulprit: false.
2. The culprit's confession must be detailed and dramatic.
3. Provide realistic clues:
   - At least 1 'whatsapp' clue with a sequence of timestamped messages, including subtle hints, a deleted message, and contradictions.
   - At least 1 'cctv' clue with multiple camera logs, locations, timestamps, and observed actions that contradict the culprit's stated alibi.
   - At least 1 or 2 'photo' clues with clear titles, descriptions of physical evidence, and forensic notes.
4. The case must be 100% logically solvable through timeline analysis and cross-referencing clues.
5. Provide a clear solutionExplanation detailing how the evidence proves the culprit guilty.
`;

    const response = await geminiKeyManager.executeWithKeyRotation(async (ai) => {
      return await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: mysteryResponseSchema,
          temperature: 0.7,
        },
      });
    });

    if (response && response.text) {
      const generated = JSON.parse(response.text);
      console.log(`[GeminiService] Successfully generated mystery via Gemini API: "${generated.title}"`);
      return generated;
    }

    throw new Error('Empty response from Gemini API');
  } catch (err) {
    console.warn(`[GeminiService] Gemini API call failed (${err.message}). Falling back to procedural engine.`);
    return generateProceduralMystery(scenarioPrompt, difficulty);
  }
}
