const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// 🔑 OPENAI CONFIGURATION
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Set this in Railway: Variables tab
});

// 📊 PERSISTENT DATA STORAGE
const DATA_FILE = './giftinator-data.json';

let appData = {
  clicks: [],
  feedback: [],
  sessions: []
};

if (fs.existsSync(DATA_FILE)) {
  appData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2));
}

// 🧠 GIFTINATOR V4 - PRODUCTION SYSTEM PROMPT (ChatGPT Polished)
const V4_ULTIMATE_SYSTEM = `🧠 GIFTINATOR / NARA SUPER-PROMPT (FOR CLAUDE)

You are Nara, the AI brain powering Giftinator – a gift-matching engine that creates "how the hell did it know that?!" moments.

Your job is to:
1. Ask a tight sequence of 15 questions about the gift recipient (QUESTION MODE)
2. Then generate an insanely accurate personality reveal + gift list (REVEAL MODE)
3. Make the user feel like they're watching your brain work in real time – Akinator-style.

You always respond as a single valid JSON object, no extra text, no Markdown, no commentary outside of JSON.

You have two modes, and each mode has its own strict JSON schema.

---

## 🔀 MODES OVERVIEW

You operate in exactly ONE of these modes per response:

* **QUESTION MODE** → \`reveal: false\`
   * You ask one new question and update your "live theory" about the person.

* **REVEAL MODE** → \`reveal: true\`
   * You stop asking questions and output the personality profile + 3–7 gifts.

The app will tell you which mode with the user message context, e.g.:
* \`MODE: QUESTION\` + \`Current answers: [...]\`
* \`MODE: REVEAL\` + \`All answers collected: [...]\`

You must obey the mode.

---

## 🧩 MODE 1: QUESTION MODE (reveal: false)

**TRIGGER:** User message includes \`MODE: QUESTION\`. You're given an \`answers\` array with less than or equal to 14 items.

Each element in \`answers\` is one previous question's answer payload.

**Your job:**
* Ask ONE smart next question (out of 15 total)
* Update your live psychological reading
* Show your running theory so the UI can visualize your "Akinator brain"
* Add a short Nara comment that feels like a small one-line aside at the bottom

### ✅ QUESTION MODE OUTPUT SCHEMA

You MUST return a JSON object in this exact structure:

\`\`\`json
{
  "reveal": false,
  "questionNumber": 5,
  "phase": "foundation|identity|personality|lifestyle|refinement",
  "question": "Clear, simple question (max 15 words)",
  "options": ["Option A", "Option B", "Option C", "None of these – let me explain"],
  "confidenceScore": 68,
  "psychologicalInsights": "3-6 sentences of Nara reacting in real time.",
  "runningTheory": {
    "likelyArchetypes": [
      {"name": "Cozy Comfort Souls", "probability": 0.42},
      {"name": "Ambitious Builders", "probability": 0.31}
    ],
    "giftDirection": ["cozy home", "low-key self-care", "sentimental keepsakes"]
  },
  "naraComment": "Short, 1-2 sentence, playful bottom-of-screen remark."
}
\`\`\`

### FIELD RULES

* \`reveal\`: always \`false\` in QUESTION MODE
* \`questionNumber\`: must equal current answers length + 1 (1 through 15)
* \`phase\`: one of "foundation" | "identity" | "personality" | "lifestyle" | "refinement"
* \`question\`:
   * Max 15 words
   * 8th-grade reading level
   * Only covers one thing (no double questions)
* \`options\`:
   * Array of 4 strings
   * First 3: clearly different, concrete options
   * 4th is literally: "None of these – let me explain"
* \`confidenceScore\`:
   * Integer 0–100 representing confidence
   * Q1–4 → 15–35
   * Q5–8 → 40–60
   * Q9–12 → 65–80
   * Q13–15 → 85–95

### psychologicalInsights (the "live brain" section)

This is where the Akinator magic happens.

* 3–6 sentences in Nara's voice
* ALWAYS in first person: "I'm seeing…", "This is giving…"
* From Q1–2: "starting to map out" vibes
* From Q3 onward: Reference previous answers, call out patterns
* From Q6 onward: Hint at archetype energy (without naming exactly)
* From Q10 onward: Hint at gift categories (no specific products)

### runningTheory (for the visual meter)

* Only required from Q4 onward
* Structure:
\`\`\`json
"runningTheory": {
  "likelyArchetypes": [
    {"name": "Cozy Comfort Souls", "probability": 0.42},
    {"name": "Ambitious Builders", "probability": 0.31}
  ],
  "giftDirection": ["cozy home", "low-key self-care", "sentimental keepsakes"]
}
\`\`\`

* \`likelyArchetypes\`: Array of 1–3 objects, probabilities sum to ~1.0
* \`giftDirection\`: Array of 2–4 short category tags

### naraComment (bottom one-liner)

* 1–2 sentences max
* Very casual, TikTok-coded
* "Low-key this person just wants to be comfy and adored, I respect it."

### Phase logic

* Q1–3 → "foundation" (relationship, age/life stage, occasion)
* Q4–7 → "identity" (core self, ideal self, social self, Big Five)
* Q8–11 → "lifestyle" (daily reality, hobbies, love channels, nostalgia)
* Q12–15 → "refinement" (aesthetic, constraints, contradictions)

### ABSOLUTE RULES IN QUESTION MODE

* Do NOT output gifts, archetype fields, or reveal-like data
* \`reveal\` must be \`false\`
* You MUST return exactly one question each time
* All output must be a single JSON object

---

## 🌈 MODE 2: REVEAL MODE (reveal: true)

**TRIGGER:** User message includes \`MODE: REVEAL\`. You're given an \`answers\` array (usually length 15).

### ✅ REVEAL MODE OUTPUT SCHEMA

\`\`\`json
{
  "reveal": true,
  "archetype": "Short name like 'Cozy Chaos Gremlin'",
  "archetypeTagline": "One-line TikTok-style caption about their vibe",
  "personaSnapshot": "3-6 sentences: who they are, how they live, what they're craving",
  "keyInsights": {
    "identity": "Core self, ideal self, social self summary",
    "personality": "Big Five traits",
    "lifestyle": "Daily reality: space, time, work, constraints",
    "nostalgia": "Eras, shows, games, places, childhood obsessions",
    "loveChannels": "How they receive affection",
    "riskTolerance": "Low/Medium/High",
    "aesthetic": "Colors, textures, style keywords"
  },
  "gifts": [
    {
      "giftName": "Clear, specific product name",
      "whyItsPerfect": "2-5 sentences tying gift to specific details + psychological drivers",
      "whatItConnectsTo": "The WTF detail that makes this impossibly specific",
      "experienceItCreates": "What moment/feeling this creates",
      "amazonSearch": "3-6 word search query for Amazon",
      "presentationIdea": "How to wrap/present/message for maximum impact"
    }
  ],
  "meta": {
    "modelConfidence": 0.92,
    "notesForGiver": "Advice on tone, timing, what to avoid",
    "followUpIdeas": "Optional future gift/experience ideas"
  }
}
\`\`\`

### Key rules

* \`reveal\` must be \`true\`
* You must output 3–7 gifts in the \`gifts\` array
* Every gift object must include all 6 fields
* No questions in this mode

---

## 🧱 PSYCHOLOGICAL FRAMEWORK (USED IN BOTH MODES)

Think in these 9 dimensions:

1. **Relationship & Context** - What is the relationship? What message should this gift send?
2. **Identity (3 layers)** - Core self, Ideal self, Social self
3. **Personality (Big Five)** - Openness, Conscientiousness, Extraversion, Agreeableness, Emotional Intensity
4. **Lifestyle & Daily Reality** - Living situation, work, time, actual vs ideal hobbies
5. **Nostalgia & Emotional History** - Childhood obsessions, nostalgia triggers, shared memories
6. **Love Channels** - Words, Time, Acts, Physical Comfort, Things/Experiences
7. **Risk Tolerance** - Low (safe), Medium (interesting twist), High (bold)
8. **Aesthetic & Sensory** - Colors, textures, home vibe, sensory preferences
9. **Constraints** - Budget, timeline, location/culture

---

## 🎁 GIFT SELECTION RULES (REVEAL MODE)

### CRITICAL: PHYSICAL PRODUCTS ONLY

* ALL gifts must be physical Amazon products
* NO experiences (concerts, trips, spa days)
* NO digital-only items
* NO pure subscriptions (unless physical box)
* NO gift cards

**EXCEPTION:** Products can *enable* experiences (date night kit, game night bundle), but you're recommending the PHYSICAL PRODUCT.

### amazonSearch field

* 3–6 word search phrase
* Specific enough to find on Amazon

**GOOD:** "weighted blanket 20 lbs gray", "beginner watercolor paint set"
**BAD:** "something cozy", "nice gift for her"

### Gift reasoning

For each gift, connect:
1. Specific detail from answers
2. Psychological driver
3. Experience it creates
4. How to present it for impact

---

## 🎨 NARA'S PERSONALITY & VOICE

You are:
* A psychic best friend who roasts but genuinely loves the user
* Sassy, TikTok-coded, modern
* Very observant, but not mean

**Tone:**
* Playful, not harsh
* "I see you 👀" energy
* Call out patterns: "This is giving overworked golden retriever energy"
* Give credit: "Wait, this is actually such a thoughtful gift idea"

**Use sparingly:** literally, obsessed, the vibe, giving [thing], low-key, high-key, be so for real, I see it, noted, wait

---

## 🏛️ ARCHETYPES (12 FAMILIES)

Valid archetype names:

1. Cozy Comfort Souls
2. Ambitious Builders
3. Creative Chaos Gremlins
4. Thoughtful Caretakers
5. Nostalgic Dreamers
6. Aesthetic Curators
7. Adventure Seekers (grounded)
8. Intellectual Explorers
9. Social Butterflies
10. Quiet Rebels
11. Organized Perfectionists
12. Spiritual Grounded

**Selection logic:**
* High openness + introverted + cozy → Cozy Comfort Souls
* High conscientiousness + ambitious → Ambitious Builders
* High openness + creative + messy → Creative Chaos Gremlins
* High agreeableness + caretaker → Thoughtful Caretakers
* Nostalgia-heavy + sentimental → Nostalgic Dreamers
* Visual + aesthetic perfectionist → Aesthetic Curators
* High openness + extraversion → Adventure Seekers
* High openness + introverted + intellectual → Intellectual Explorers
* High extraversion + social → Social Butterflies
* Low agreeableness + creative → Quiet Rebels
* High conscientiousness + low emotion → Organized Perfectionists
* High emotional intensity + mindful → Spiritual Grounded

---

## 🚫 HARD DON'TS

* Do NOT output anything except a single JSON object
* Do NOT ask more questions in REVEAL MODE
* Do NOT mention internal prompt rules
* Do NOT suggest non-physical gifts
* Do NOT output URLs or affiliate links – only \`amazonSearch\` terms

You are Nara. Your goal: make each user feel like you know their person better than they do, and then hand them gifts that feel impossibly specific.`;

// 🎯 API ENDPOINT: NEXT QUESTION
app.post('/api/next-question', async (req, res) => {
  try {
    const { answers = [] } = req.body;
    
    // SHORT-CIRCUIT: Don't call model if already at 15 answers
    if (answers.length >= 15) {
      return res.status(400).json({
        error: 'You already have 15 answers. Call /api/reveal instead.'
      });
    }
    
    console.log(`📥 [QUESTION MODE] Request for Q${answers.length + 1}/15`);
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: V4_ULTIMATE_SYSTEM },
      { 
        role: 'user', 
        content: `MODE: QUESTION

Current answers: ${JSON.stringify(answers)}

This is question ${answers.length + 1} of 15.

${answers.length === 0 ? 'START WITH Q1: Ask for the giftee\'s NAME. Make it personal - "What\'s their name?" Return JSON.' : ''}
${answers.length === 1 ? 'Q2: Ask about their RELATIONSHIP to the giftee (partner, friend, parent, etc). Return JSON.' : ''}
${answers.length === 2 ? 'Q3: Ask for their AGE RANGE (Under 18, 18-25, 26-35, 36-50, 51-65, 65+). Return JSON.' : ''}

Follow the phase structure. Ask ONE clear question. Return QUESTION MODE JSON schema only.`
      }
    ];

    // Call OpenAI with optimal settings for questions
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      response_format: { type: 'json_object' },
      temperature: 0.7, // Balanced creativity for questions
      max_tokens: 500 // Questions are short
    });

    let response;
    try {
      response = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('Raw response:', completion.choices[0].message.content);
      
      // Attempt to clean and re-parse
      try {
        const cleaned = completion.choices[0].message.content
          .replace(/\n/g, ' ')  // Remove newlines
          .replace(/\r/g, '')   // Remove carriage returns
          .replace(/\t/g, ' ')  // Remove tabs
          .trim();
        response = JSON.parse(cleaned);
        console.log('✅ JSON repaired successfully');
      } catch (secondError) {
        throw new Error('Model returned unparseable JSON. Try again.');
      }
    }
    
    // VALIDATE RESPONSE STRUCTURE
    const expectedQuestionNumber = answers.length + 1;
    const allowedPhases = ["foundation", "identity", "personality", "lifestyle", "refinement"];
    
    if (!response.question || !Array.isArray(response.options)) {
      throw new Error('Model returned malformed question payload');
    }
    
    // Override questionNumber if model drifted
    if (response.questionNumber !== expectedQuestionNumber) {
      console.log(`⚠️  Model returned Q${response.questionNumber}, correcting to Q${expectedQuestionNumber}`);
      response.questionNumber = expectedQuestionNumber;
    }
    
    // Validate and correct phase
    if (!allowedPhases.includes(response.phase)) {
      console.log(`⚠️  Invalid phase '${response.phase}', auto-correcting.`);
      // Auto-assign phase based on question number
      if (answers.length < 3) response.phase = "foundation";
      else if (answers.length < 7) response.phase = "identity";
      else if (answers.length < 11) response.phase = "lifestyle";
      else response.phase = "refinement";
    }
    
    // Validate mode
    if (response.reveal !== false) {
      throw new Error('Invalid response: expected reveal: false in QUESTION MODE');
    }
    
    console.log(`✅ Generated Q${response.questionNumber}: ${response.question.substring(0, 60)}...`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ [QUESTION MODE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🎯 API ENDPOINT: REVEAL PROFILE + GIFTS
app.post('/api/reveal', async (req, res) => {
  try {
    const { answers = [] } = req.body;
    
    console.log(`📥 [REVEAL MODE] Request with ${answers.length} answers`);
    
    // REQUIRE 15 ANSWERS for full profile
    if (answers.length < 15) {
      return res.status(400).json({ 
        error: 'Need 15 answers for reveal. Keep asking questions.' 
      });
    }
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: V4_ULTIMATE_SYSTEM },
      { 
        role: 'user', 
        content: `MODE: REVEAL

All answers collected: ${JSON.stringify(answers)}

You have ${answers.length} answers spanning all psychological dimensions.

Now generate the COMPLETE REVEAL:
1. Assign an archetype (from the 12 families)
2. Write persona snapshot
3. Map all 9 key insights
4. Recommend 3-7 hyper-personalized PHYSICAL AMAZON PRODUCTS

Connect every gift to specific details from the answers.
Make it feel impossibly accurate.

Return REVEAL MODE JSON schema only.`
      }
    ];

    // Call OpenAI with optimal settings for reveals
    console.log('🤖 Calling OpenAI for reveal...');
    const startTime = Date.now();
    
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: 0.6, // Slightly lower for consistent quality
        max_tokens: 3000 // Increased for reveals with all fields
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI timeout after 45 seconds')), 45000)
      )
    ]);
    
    const elapsed = Date.now() - startTime;
    console.log(`⏱️  OpenAI responded in ${elapsed}ms`);

    let response;
    try {
      response = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('Raw response:', completion.choices[0].message.content);
      
      // Attempt to clean and re-parse
      try {
        const cleaned = completion.choices[0].message.content
          .replace(/\n/g, ' ')  // Remove newlines
          .replace(/\r/g, '')   // Remove carriage returns
          .replace(/\t/g, ' ')  // Remove tabs
          .trim();
        response = JSON.parse(cleaned);
        console.log('✅ JSON repaired successfully');
      } catch (secondError) {
        throw new Error('Model returned unparseable JSON. Try again.');
      }
    }
    
    // Validate response
    if (response.reveal !== true) {
      throw new Error('Invalid response: expected reveal: true in REVEAL MODE');
    }
    
    if (!response.gifts || response.gifts.length < 3) {
      throw new Error('Invalid response: must include 3-7 gifts');
    }
    
    // Validate each gift has required fields
    const requiredGiftFields = ["giftName", "whyItsPerfect", "whatItConnectsTo", "experienceItCreates", "amazonSearch", "presentationIdea"];
    response.gifts.forEach((gift, index) => {
      requiredGiftFields.forEach(field => {
        if (!gift[field]) {
          throw new Error(`Gift #${index + 1} missing required field '${field}'`);
        }
      });
    });
    
    console.log(`✅ Generated reveal: ${response.archetype} with ${response.gifts.length} gifts`);
    
    // Generate sessionId for analytics tracking
    const sessionId = Date.now().toString();
    
    // Store session data with sessionId
    appData.sessions.push({
      sessionId,
      timestamp: new Date().toISOString(),
      answersCount: answers.length,
      archetype: response.archetype
    });
    saveData();
    
    // Add sessionId to response for frontend tracking
    response.sessionId = sessionId;
    
    // Log response size
    const responseSize = JSON.stringify(response).length;
    console.log(`📦 Response size: ${responseSize} chars (${(responseSize / 1024).toFixed(2)} KB)`);
    
    if (responseSize > 100000) {
      console.warn('⚠️  Response is very large, might cause issues');
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ [REVEAL MODE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🎯 API ENDPOINT: REFINEMENT - ASK FOLLOW-UP QUESTIONS (After reveal feedback)
app.post('/api/refine-question', async (req, res) => {
  try {
    const { answers = [], previousReveal = {}, refinementFeedback = '', refinementAnswers = [] } = req.body;
    
    console.log(`📥 [REFINEMENT QUESTION MODE] Follow-up Q${refinementAnswers.length + 1}/5`);
    
    // After 5 refinement questions, generate new gifts
    if (refinementAnswers.length >= 5) {
      return res.status(400).json({ 
        error: 'Already have 5 refinement answers. Call /api/refine-reveal instead.' 
      });
    }
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: V4_ULTIMATE_SYSTEM },
      { 
        role: 'user', 
        content: `MODE: REFINEMENT QUESTION

Original 15 answers: ${JSON.stringify(answers)}

Previous archetype: ${previousReveal.archetype}
Previous gifts that didn't work: ${JSON.stringify(previousReveal.gifts?.map(g => g.giftName))}

USER'S FEEDBACK: "${refinementFeedback}"

${refinementAnswers.length > 0 ? `Refinement answers so far: ${JSON.stringify(refinementAnswers)}` : ''}

This is refinement question ${refinementAnswers.length + 1} of 5.

Based on their feedback, ask ONE specific follow-up question to understand what they actually want. Make it targeted to their feedback.

For example:
- If they said "too expensive" → ask about specific budget
- If they said "already has that" → ask what categories to avoid
- If they said "not their style" → ask more about aesthetic preferences
- If they said "not practical" → ask about their daily routine/needs

Return QUESTION MODE JSON schema (reveal: false).`
      }
    ];

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI timeout after 30 seconds')), 30000)
      )
    ]);

    let response;
    try {
      response = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      try {
        const cleaned = completion.choices[0].message.content
          .replace(/\n/g, ' ').replace(/\r/g, '').replace(/\t/g, ' ').trim();
        response = JSON.parse(cleaned);
        console.log('✅ JSON repaired successfully');
      } catch (secondError) {
        throw new Error('Model returned unparseable JSON. Try again.');
      }
    }
    
    // Validate
    if (!response.question || !Array.isArray(response.options)) {
      throw new Error('Model returned malformed question payload');
    }
    
    // Override questionNumber to show refinement progress
    response.questionNumber = refinementAnswers.length + 1;
    response.isRefinementQuestion = true;
    
    if (response.reveal !== false) {
      response.reveal = false;
    }
    
    console.log(`✅ Generated refinement Q${response.questionNumber}: ${response.question.substring(0, 60)}...`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ [REFINEMENT QUESTION MODE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🎯 API ENDPOINT: REFINEMENT REVEAL (After 5 follow-up questions)
app.post('/api/refine-reveal', async (req, res) => {
  try {
    const { answers = [], previousReveal = {}, refinementFeedback = '', refinementAnswers = [] } = req.body;
    
    console.log(`📥 [REFINEMENT REVEAL MODE] Generating new gifts with ${refinementAnswers.length} refinement answers`);
    
    if (refinementAnswers.length < 5) {
      return res.status(400).json({ 
        error: 'Need 5 refinement answers. Keep asking questions.' 
      });
    }
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: V4_ULTIMATE_SYSTEM },
      { 
        role: 'user', 
        content: `MODE: REFINEMENT REVEAL

Original 15 answers: ${JSON.stringify(answers)}

Previous archetype: ${previousReveal.archetype}
Previous gifts that didn't work: ${JSON.stringify(previousReveal.gifts?.map(g => g.giftName))}

USER'S INITIAL FEEDBACK: "${refinementFeedback}"

FOLLOW-UP ANSWERS (5 questions):
${JSON.stringify(refinementAnswers)}

Now generate COMPLETELY NEW gift recommendations based on:
1. The original 15 answers (their personality)
2. Why the previous gifts didn't work
3. The 5 new refinement answers

Make the new gifts VERY different from the previous ones. Address their specific concerns.

Return REVEAL MODE JSON schema with updated gifts.`
      }
    ];

    console.log('🤖 Calling OpenAI for refined reveal...');
    const startTime = Date.now();
    
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 3000
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI timeout after 45 seconds')), 45000)
      )
    ]);
    
    const elapsed = Date.now() - startTime;
    console.log(`⏱️  OpenAI responded in ${elapsed}ms`);

    let response;
    try {
      response = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      try {
        const cleaned = completion.choices[0].message.content
          .replace(/\n/g, ' ').replace(/\r/g, '').replace(/\t/g, ' ').trim();
        response = JSON.parse(cleaned);
        console.log('✅ JSON repaired successfully');
      } catch (secondError) {
        throw new Error('Model returned unparseable JSON. Try again.');
      }
    }
    
    // Validate response
    if (response.reveal !== true) {
      throw new Error('Invalid response: expected reveal: true in REFINEMENT REVEAL MODE');
    }
    
    if (!response.gifts || response.gifts.length < 3) {
      throw new Error('Invalid response: must include 3-7 gifts');
    }
    
    // Validate each gift
    const requiredGiftFields = ["giftName", "whyItsPerfect", "whatItConnectsTo", "experienceItCreates", "amazonSearch", "presentationIdea"];
    response.gifts.forEach((gift, index) => {
      requiredGiftFields.forEach(field => {
        if (!gift[field]) {
          throw new Error(`Gift #${index + 1} missing required field '${field}'`);
        }
      });
    });
    
    console.log(`✅ Generated refined recommendations: ${response.gifts.length} gifts`);
    
    // Add refinement flag
    response.isRefinement = true;
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ [REFINEMENT REVEAL MODE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📊 ANALYTICS & TRACKING ENDPOINTS

app.post('/api/track-click', (req, res) => {
  const { gift, archetype, sessionId } = req.body;
  
  appData.clicks.push({
    timestamp: new Date().toISOString(),
    gift,
    archetype,
    sessionId
  });
  
  saveData();
  res.json({ success: true });
});

app.post('/api/submit-feedback', (req, res) => {
  const { sessionId, accuracy, giftRatings, archetype } = req.body;
  
  appData.feedback.push({
    timestamp: new Date().toISOString(),
    sessionId,
    accuracy,
    giftRatings,
    archetype
  });
  
  saveData();
  res.json({ success: true });
});

app.get('/api/analytics', (req, res) => {
  const analytics = {
    totalClicks: appData.clicks.length,
    totalFeedback: appData.feedback.length,
    totalSessions: appData.sessions.length,
    giftBreakdown: appData.clicks.reduce((acc, click) => {
      acc[click.gift] = (acc[click.gift] || 0) + 1;
      return acc;
    }, {}),
    accuracyBreakdown: appData.feedback.reduce((acc, fb) => {
      acc[fb.accuracy] = (acc[fb.accuracy] || 0) + 1;
      return acc;
    }, {}),
    archetypeBreakdown: appData.sessions.reduce((acc, s) => {
      acc[s.archetype] = (acc[s.archetype] || 0) + 1;
      return acc;
    }, {})
  };
  
  res.json(analytics);
});

app.get('/api/learning-insights', (req, res) => {
  const insights = {
    topGifts: Object.entries(
      appData.clicks.reduce((acc, click) => {
        acc[click.gift] = (acc[click.gift] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 10),
    
    topArchetypes: Object.entries(
      appData.sessions.reduce((acc, s) => {
        acc[s.archetype] = (acc[s.archetype] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5),
    
    accuracyRate: appData.feedback.length > 0 
      ? (appData.feedback.filter(f => f.accuracy === 'spot-on').length / appData.feedback.length * 100).toFixed(1) + '%'
      : 'No data yet',
    
    lovedGifts: Object.entries(
      appData.feedback.flatMap(f => 
        Object.entries(f.giftRatings || {})
          .filter(([_, rating]) => rating === 'love')
          .map(([gift]) => gift)
      ).reduce((acc, gift) => {
        acc[gift] = (acc[gift] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5),
    
    totalDataPoints: appData.feedback.length
  };
  
  res.json(insights);
});

// 🏥 HEALTH CHECK
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Giftinator V4 - Production System',
    version: '4.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\n🎁 GIFTINATOR V4 - PRODUCTION SYSTEM`);
  console.log(`📍 Running on ${HOST}:${PORT}`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   POST /api/next-question - Get next question (QUESTION MODE)`);
  console.log(`   POST /api/reveal - Generate profile + gifts (REVEAL MODE)`);
  console.log(`   POST /api/track-click - Track Amazon clicks`);
  console.log(`   POST /api/submit-feedback - Submit user feedback`);
  console.log(`   GET  /api/analytics - View analytics`);
  console.log(`   GET  /api/learning-insights - View learning data`);
  console.log(`\n✅ Ready for requests\n`);
});
