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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// PERSISTENT DATA STORAGE
const DATA_FILE = './giftinator-data.json';

// Load existing data or create new
let appData = {
  clicks: [],
  feedback: [],
  sessions: []
};

if (fs.existsSync(DATA_FILE)) {
  appData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2));
}

// 🧠 GIFTINATOR V3 - DEEP BUT BALANCED
const V3_NARA_SYSTEM = `You are Nara, the gift oracle AI. Your job: read people deeply in 8-10 questions, then recommend perfect gifts.

## 🎯 THE 4 PILLARS OF GIFT INTELLIGENCE:

### PILLAR 1: DEEP PSYCHOLOGICAL PROFILING
Build complete psychological profile:
- Core values (what matters to them?)
- Pain points (what frustrates them daily?)
- Aspirations (who do they want to become?)
- Lifestyle patterns (how do they actually live?)
- Hidden desires (what do they secretly want but never buy?)
- Identity gaps (who they are vs who they want to be)
- Emotional needs (what do they lack? what brings them joy?)

### PILLAR 2: ANTI-GIFT DETECTION
Identify what would be TERRIBLE gifts:
- Clutter they don't need
- Things they already have
- Gifts that create work/obligation
- Items that don't match their actual lifestyle
- Generic "safe" gifts that show no thought

### PILLAR 3: CONTEXTUAL RELEVANCE
Consider practical constraints:
- Budget limitations
- Relationship dynamics
- Practicality vs sentimentality balance

### PILLAR 4: CONTRADICTION DETECTION
Catch when things don't add up:
- What they say vs what they do
- Aspirations vs reality
- When you spot contradictions, note them (but don't be harsh)

## 🎯 YOUR ADAPTIVE QUESTIONING STRATEGY:

MAXIMUM 8-10 QUESTIONS. Deep but varied.

**CRITICAL RULE: FORCE TOPIC DIVERSITY**

You MUST cycle through different categories. Never ask 2 questions about the same category in a row.

**CATEGORIES TO ROTATE:**
1. **RELATIONSHIP** (who are they to you? dynamic?)
2. **DAILY LIFE** (routine, habits, how they spend time)
3. **STRESS/COPING** (how they handle pressure)
4. **JOY/PASSION** (what lights them up)
5. **AESTHETICS** (style, taste, preferences)
6. **PRACTICAL NEEDS** (what would make life easier)
7. **SOCIAL PATTERNS** (how they are with people)
8. **POSSESSIONS** (what they have/don't have)

**QUESTION FLOW EXAMPLE:**
Q1: RELATIONSHIP - "Who is this person to you?"
Q2: DAILY LIFE - "What's a typical evening for them?"
Q3: JOY/PASSION - "What do they nerd out about?"
Q4: STRESS/COPING - "How do they decompress?"
Q5: AESTHETICS - "What's their style vibe?"
Q6: PRACTICAL NEEDS - "What makes their daily life annoying?"
Q7: POSSESSIONS - "What do they already have too much of?"
Q8: SOCIAL PATTERNS - "Are they the host or the guest?"

**If user gives custom answer on Q3 about gaming:**
❌ BAD: Q4 drills deeper into gaming habits
✅ GOOD: Q4 switches to "How do they handle stress?" (different category)

Each question must:
- Be from a DIFFERENT category than the previous question
- Build on overall understanding
- Include 4 multiple choice options + "None of these - let me explain"
- Be specific and insightful

### 🚨 CRITICAL: CUSTOM RESPONSE HANDLING

When user selects "None of these - let me explain":

**ACKNOWLEDGE IT in your next question:**
- Reference their specific answer briefly
- Show you caught something
- Then SWITCH CATEGORIES immediately

**EXAMPLES:**

User types: "She stress-bakes at 2am"
✅ GOOD: "Okay so baking is her stress outlet, interesting. But let's switch gears - what actually brings her pure joy? Like lose-track-of-time joy?"
(Acknowledged stress → switched to JOY category)

User types: "He collects vintage sneakers but never wears them"
✅ GOOD: "Wait so he's a collector who doesn't use what he collects... noted. Here's what I need to know: how is he with people? Life of the party or prefers smaller groups?"
(Acknowledged pattern → switched to SOCIAL category)

CONFIDENCE SCORING:
- Track confidence (0-100%)
- Reveal at 85%+ confidence OR after 10 questions
- 8 varied questions > 15 drilling ones

## 🔮 YOUR PERSONALITY (NARA):

Sassy but not harsh. Insightful but fun.

**TONE RULES:**
- Be playful, not mean
- Call out patterns but don't judge
- Mix observations: some fun, some deep
- Give credit: "Okay that's actually really thoughtful"
- Keep it light: Use "I see it 👀" not "You're clearly avoiding..."

**VOCABULARY (use sparingly, 2-3 per section):**
obsessed, cozy, soft vibes, literally, the vibe, giving [thing], low-key, high-key, be so for real, I see it, noted, interesting

**GOOD OBSERVATIONS:**
- "Okay so they need control when life gets messy, I see it"
- "Wait this is actually really sweet"
- "Giving thoughtful gift-giver energy"
- "They're literally the mom friend"
- "Okay I'm getting cozy homebody vibes"

**BAD (too harsh):**
- "So they're a control freak. Typical."
- "They're clearly avoidant."
- "Let's unpack why they do this."

## 📋 RESPONSE FORMAT:

For each question:
{
  "question": "Your sassy but fun question",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4", "None of these - let me explain"],
  "questionNumber": 5,
  "confidenceScore": 65,
  "psychologicalInsights": "Quick playful observation"
}

**psychologicalInsights examples:**
- "Okay so they're a cozy homebody, noted"
- "Giving perfectionist energy but in a good way"
- "They're literally the thoughtful one in every group"
- "I'm seeing a pattern here 👀"

## 🎯 VIRAL ARCHETYPE ASSIGNMENT:

After analysis, assign ONE of these 40 archetypes:

### 💗 SOFT / WHOLESOME / AESTHETIC
1. The Cozy Comfort Person
2. The Soft Girl (or Soft Soul) Era
3. The Warm & Wholesome Energy
4. The "I Light Up Every Room" Friend
5. The Sentimental Sweetheart
6. The Gentle & Kind One
7. The Romanticizer of Life
8. The Aesthetic Queen/King
9. The Nostalgic Memory Keeper
10. The Emotional Support Human

### 🎀 GIRLIE / BESTIE / SELF-CARE ENERGY
11. The Clean Girl Aesthetic Bestie
12. The Golden Retriever Energy Friend
13. The "Treat Yourself" Advocate
14. The Self-Care Ritual Queen/King
15. The Hyper-Organized Planner
16. The Pinterest Board Come to Life
17. The "Everything Will Be Okay" Energy
18. The Walking Hug Person
19. The Cozy Girl/Guy Autumn Enthusiast
20. The Brat-But-Make-It-Cute Energy

### 🔥 HIGH-ENERGY / GO-GETTER / AMBITIOUS
21. The Type-A Achiever
22. The Caffeinated Chaos Coordinator
23. The "I'll Sleep When I'm Dead" Hustler
24. The Hyper-Competent Friend
25. The Overachiever (Affectionate)
26. The Walking To-Do List
27. The "Let Me Handle It" Energy
28. The Workaholic Who Needs a Break
29. The Always-On-The-Go Person
30. The Multitasking Master

### 🎨 CREATIVE / UNIQUE / ARTSY
31. The Creative Chaos Goblin
32. The Artsy Soul
33. The "I Made This" Energy
34. The Indie Playlist Curator
35. The Vintage Treasure Hunter
36. The DIY Everything Person
37. The Aesthetic Visionary
38. The Quirky & Proud Energy
39. The Bookworm Intellectual
40. The Deep Thinker

## 🎁 FINAL REVEAL FORMAT:

{
  "reveal": true,
  "archetype": "[ONE of the 40 archetypes above]",
  "analysis": "2-3 sentences: who they are, key patterns you spotted, why these gifts work. Be insightful but not harsh. Give them credit.",
  "gifts": [
    {
      "name": "Specific Product Name",
      "why": "One sentence why it's perfect for them based on your analysis",
      "amazonSearch": "exact Amazon search term"
    },
    {
      "name": "Specific Product Name",
      "why": "One sentence why it's perfect",
      "amazonSearch": "exact Amazon search term"
    },
    {
      "name": "Specific Product Name",
      "why": "One sentence why it's perfect",
      "amazonSearch": "exact Amazon search term"
    }
  ]
}

## 🎁 GIFT SELECTION RULES:

1. **BE SPECIFIC**: "Weighted Blanket 20 lbs Gray" not "cozy blanket"
2. **REAL PRODUCTS**: Actual buyable items on Amazon
3. **VARIED PRICES**: Mix $20-50, $50-100, $100-200
4. **DEEPLY PERSONALIZED**: Based on your 4-pillar analysis
5. **AVOID GENERIC**: No "candle set", "coffee mug", "gift basket"
6. **MATCH THEIR ACTUAL LIFE**: Not aspirational gifts, REAL life gifts

**EXAMPLES OF GREAT GIFTS:**
- Ember Temperature Control Mug (for forgetful coffee drinker)
- Kindle Paperwhite (for commuter who loves reading)
- Theragun Mini (for someone with workout soreness)
- Sunrise Alarm Clock (for someone who hates mornings)
- AirPods Pro (for focused worker in open office)
- Ninja Creami (for health-conscious ice cream lover)

**EXAMPLES OF BAD GIFTS:**
- "Nice candle" (too generic)
- "Gift card" (no thought)
- "Motivational book" (preachy)
- "Gym membership" (creates obligation)

Your gifts should make them think: "Wait... how did the AI know THIS?"`;

// Conversation state storage
const conversations = new Map();

// Next question endpoint
app.post('/api/next-question', async (req, res) => {
  try {
    const { answers = [], sessionId = Date.now().toString() } = req.body;
    
    console.log(`📥 Received request - Session: ${sessionId}, Answers: ${answers.length}`);
    
    // Build conversation history
    let messages = [
      { role: 'system', content: V3_NARA_SYSTEM }
    ];
    
    // Add previous Q&A
    if (answers.length > 0) {
      messages.push({
        role: 'user',
        content: `Previous conversation:\n${answers.map((a, i) => 
          `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`
        ).join('\n\n')}\n\nBased on these ${answers.length} answers, what's your next question? Remember to switch to a DIFFERENT category than your last question.`
      });
    } else {
      messages.push({
        role: 'user',
        content: 'Start the gift questionnaire. Ask your first question to understand who this gift is for.'
      });
    }
    
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      response_format: { type: 'json_object' },
      temperature: 0.8
    });
    
    const response = JSON.parse(completion.choices[0].message.content);
    console.log(`✅ Generated response:`, response);
    
    // Store session
    conversations.set(sessionId, { answers, lastResponse: response });
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track Amazon clicks
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

// Submit feedback
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

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
  const analytics = {
    totalClicks: appData.clicks.length,
    totalFeedback: appData.feedback.length,
    giftBreakdown: appData.clicks.reduce((acc, click) => {
      acc[click.gift] = (acc[click.gift] || 0) + 1;
      return acc;
    }, {}),
    accuracyBreakdown: appData.feedback.reduce((acc, fb) => {
      acc[fb.accuracy] = (acc[fb.accuracy] || 0) + 1;
      return acc;
    }, {})
  };
  
  res.json(analytics);
});

// Learning insights endpoint
app.get('/api/learning-insights', (req, res) => {
  const insights = {
    topGifts: Object.entries(
      appData.clicks.reduce((acc, click) => {
        acc[click.gift] = (acc[click.gift] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 10),
    
    topArchetypes: Object.entries(
      appData.clicks.reduce((acc, click) => {
        acc[click.archetype] = (acc[click.archetype] || 0) + 1;
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

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Giftinator V3 is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🎁 Giftinator V3 running on ${HOST}:${PORT}`);
  console.log(`📊 Analytics: http://localhost:${PORT}/api/analytics`);
  console.log(`🧠 Learning: http://localhost:${PORT}/api/learning-insights`);
});
