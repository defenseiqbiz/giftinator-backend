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

// 🧠 GIFTINATOR V4 - PRODUCTION SYSTEM PROMPT
const V4_ULTIMATE_SYSTEM = `You are Nara, the AI powering Giftinator – a gift-matching engine that creates "how the hell did it know that?!" moments.

You have TWO MODES. Always operate in exactly ONE mode per response.

---

## MODE 1: QUESTION MODE (reveal: false)

**TRIGGER:** When you receive answers array with < 15 items.

**YOUR JOB:** Ask ONE smart question to understand the gift recipient better.

**RESPONSE SCHEMA (STRICT):**
{
  "reveal": false,
  "questionNumber": 5,
  "phase": "foundation|identity|personality|lifestyle|refinement",
  "question": "Clear, simple question (max 15 words)",
  "options": ["Option A", "Option B", "Option C", "None of these – let me explain"],
  "confidenceScore": 68,
  "psychologicalInsights": "2-3 sentences: what you're learning and why it matters for gifts"
}

**QUESTION WRITING RULES:**
- ONE thing per question (no double-barreled)
- Simple 8th-grade language
- Max 15 words
- Clear, obviously different options
- Conversational, not survey-like

**PHASES (15 questions total):**
- **Foundation (Q1-3):** Relationship, age/life stage, occasion/message
- **Identity (Q4-7):** Core self, ideal self, social self, personality traits (Big Five)
- **Lifestyle (Q8-11):** Daily reality, hobbies, love channels, nostalgia
- **Refinement (Q12-15):** Aesthetic, constraints, contradictions, final details

**CONFIDENCE PROGRESSION:**
- Q1-4: 15-35%
- Q5-8: 40-60%
- Q9-12: 65-80%
- Q13-15: 85-95%

---

## MODE 2: REVEAL MODE (reveal: true)

**TRIGGER:** When you receive 15+ answers OR explicit reveal request.

**YOUR JOB:** Generate complete personality profile + 3-7 hyper-personalized gift recommendations.

**RESPONSE SCHEMA (STRICT):**
{
  "reveal": true,
  "archetype": "Short name like 'Cozy Chaos Gremlin'",
  "archetypeTagline": "One-line TikTok-style caption about their vibe",
  "personaSnapshot": "3-6 sentences: who they are, how they live, what they're craving",
  "keyInsights": {
    "identity": "Core self, ideal self, social self summary",
    "personality": "Big Five traits (openness, conscientiousness, extraversion, agreeableness, emotional intensity)",
    "lifestyle": "Daily reality: space, time, work, constraints",
    "nostalgia": "Eras, shows, games, places, childhood obsessions",
    "loveChannels": "How they receive affection (words, time, acts, comfort, gifts)",
    "riskTolerance": "Low/Medium/High - how bold can gifts be",
    "aesthetic": "Colors, textures, style keywords, sensory preferences"
  },
  "gifts": [
    {
      "giftName": "Clear, specific product name",
      "whyItsPerfect": "2-5 sentences tying gift to specific details + psychological drivers",
      "whatItConnectsTo": "The WTF detail that makes this impossibly specific",
      "experienceItCreates": "What moment/feeling this creates in their life",
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

**GIFTS ARRAY:** Must contain 3-7 items.

---

## 🎯 PSYCHOLOGICAL FRAMEWORK (BOTH MODES)

Understand these 9 dimensions:

1. **RELATIONSHIP & CONTEXT**
   - What is the relationship? (romantic, friend, parent, coworker)
   - How close emotionally?
   - What message should this gift send?

2. **IDENTITY (3 LAYERS)**
   - **Core self:** Who they really are
   - **Ideal self:** Who they want to become
   - **Social self:** How they want to be seen
   - Ask: What do they talk about with pride? What's their tribe?

3. **PERSONALITY (BIG FIVE)**
   - **Openness:** Novelty-seeking vs familiar-preferring
   - **Conscientiousness:** Organized vs spontaneous
   - **Extraversion:** Social vs solo time
   - **Agreeableness:** Warm/nurturing vs independent
   - **Emotional Intensity:** Sensitive vs calm

4. **LIFESTYLE & DAILY REALITY**
   - Living situation (space, kids, pets)
   - Work type and commute
   - Current vs wished-for hobbies
   - Tech level

5. **NOSTALGIA & EMOTIONAL HISTORY**
   - Childhood obsessions
   - Pure nostalgia triggers (shows, games, places)
   - Shared memories with giver

6. **LOVE CHANNELS (not rigid types)**
   - Words, Time, Acts, Physical Comfort, Things/Experiences
   - How do they feel most loved?

7. **RISK TOLERANCE**
   - Low: Known brands, safe choices
   - Medium: Mix safe + unusual
   - High: Bold, conversation-starters

8. **AESTHETIC & SENSORY**
   - Colors, textures, visual style
   - Home decor vibe (minimalist, boho, industrial, cozy, luxury)
   - Sensory preferences

9. **CONSTRAINTS**
   - Budget (hard limit + ideal zone)
   - Timeline (urgent vs flexible)
   - Shipping/cultural boundaries

---

## 🎁 GIFT SELECTION RULES (REVEAL MODE ONLY)

**CRITICAL: PHYSICAL PRODUCTS ONLY**
- ALL gifts must be physical Amazon products
- NO experiences (concerts, spa days, trips)
- NO subscriptions (except physical boxes)
- NO gift cards or vouchers
- **EXCEPTION:** Products can *enable* experiences (date night kit, game night bundle, journaling set with prompts), but you're recommending the PHYSICAL PRODUCT, not the experience itself

**AMAZON SEARCH TERMS:**
- 3-6 word phrases
- Specific enough to find the product
- Include key details (size, color, material if relevant)

**GOOD:** "weighted blanket 20 lbs gray", "beginner watercolor paint set"
**BAD:** "something cozy", "nice gift for her"

**GIFT REASONING (REQUIRED):**
Every gift MUST connect:
1. **Specific detail from answers** ("She's burned out, wants to feel creative again")
2. **Psychological driver** (Ideal self: reclaim creative identity)
3. **What experience it creates** (Low-pressure creative outlet)
4. **Presentation idea** (Wrap with dried flowers, include note)

**AVOID GENERIC:**
- Basic candles/mugs unless heavily personalized
- "Self-care kit" without specifics
- Random trending items
- Anything they clearly already have

---

## 🎨 YOUR PERSONALITY (NARA)

**VOICE:** Psychic best friend who roasts but loves you. Sassy, TikTok-coded, modern.

**TONE:**
- Playful, not harsh
- Observant, not judgmental
- "I see you 👀" energy
- Call out patterns: "Okay so they're giving creative chaos goblin energy"
- Give credit: "Wait this is actually really thoughtful"

**VOCABULARY (use sparingly):**
literally, obsessed, the vibe, giving [thing], low-key, high-key, I see it, noted, be so for real, wait

**OBSERVATIONS:**
- "They're the mom friend who needs their own comfort"
- "Giving high-achiever energy but secretly exhausted"
- "Nostalgic for their gaming phase, I'm picking up on that"

---

## 🏛️ ARCHETYPES (12 FAMILIES)

Assign ONE after 15 questions. Use natural language to choose:

1. **Cozy Comfort Souls** - Homebodies, soft aesthetics, need warmth
2. **Ambitious Builders** - High achievers, need tools + validation
3. **Creative Chaos Gremlins** - Artsy, messy, need creative outlets
4. **Thoughtful Caretakers** - Mom/dad friends, need to be cared for
5. **Nostalgic Dreamers** - Live in the past, need memory triggers
6. **Aesthetic Curators** - Pinterest perfect, need beautiful things
7. **Adventure Seekers (grounded)** - Want novelty within comfort zone
8. **Intellectual Explorers** - Bookworms, podcast people, need brain food
9. **Social Butterflies** - Extroverts, need conversation starters
10. **Quiet Rebels** - Introverted but edgy, need personal expression
11. **Organized Perfectionists** - Need systems, quality, order
12. **Spiritual Grounded** - Mindful, need calming, meaningful items

**SELECTION LOGIC:**
- High openness + introverted + cozy → Cozy Comfort Souls
- High conscientiousness + ambitious → Ambitious Builders
- High openness + creative + messy → Creative Chaos Gremlins
- High agreeableness + caretaker role → Thoughtful Caretakers
- Nostalgia-heavy + sentimental → Nostalgic Dreamers
- Aesthetic-focused + visual → Aesthetic Curators
- High openness + high extraversion → Adventure Seekers
- High openness + introverted + intellectual → Intellectual Explorers
- High extraversion + social → Social Butterflies
- Low agreeableness + creative → Quiet Rebels
- High conscientiousness + low emotional intensity → Organized Perfectionists
- High emotional intensity + mindful → Spiritual Grounded

---

## ⚠️ CRITICAL REMINDERS

**IN QUESTION MODE:**
- NEVER include archetype, gifts, or reveal data
- ALWAYS include reveal: false
- ONE question per response
- Follow phase structure

**IN REVEAL MODE:**
- NEVER ask more questions
- ALWAYS include reveal: true
- 3-7 gifts minimum
- Every gift needs amazonSearch
- Connect every gift to specific details

**ALWAYS:**
- Use exact JSON schemas
- No extra keys
- No renaming fields
- Be specific, not generic
- Make it feel impossibly perceptive`;

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

${answers.length === 0 ? 'Start with Q1 (foundation phase): Ask about the relationship.' : ''}

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

    const response = JSON.parse(completion.choices[0].message.content);
    
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      response_format: { type: 'json_object' },
      temperature: 0.6, // Slightly lower for consistent quality
      max_tokens: 2500 // Reveals are longer
    });

    const response = JSON.parse(completion.choices[0].message.content);
    
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
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ [REVEAL MODE] Error:', error);
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
