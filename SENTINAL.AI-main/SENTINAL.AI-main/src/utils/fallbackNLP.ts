import { AnalysisResult, EmotionType, RecommendedAction } from "../types";

// Core Dictionaries
const POSITIVE_WORDS = [
  "great", "good", "excellent", "awesome", "solid", "excited", "inspiring",
  "viable", "progress", "clean", "sustainable", "innovative", "love", "beneficial",
  "breakthrough", "promising", "positive", "solution", "efficient", "improving"
];

const NEGATIVE_WORDS = [
  "bad", "terrible", "awful", "scam", "fraud", "hoax", "fake", "bankrupt",
  "downturn", "crisis", "failure", "hate", "pathetic", "clown", "garbage",
  "disgusting", "lies", "censor", "congestion", "worse", "harmful", "toxic"
];

const ANGER_WORDS = [
  "fraud", "scam", "furious", "disgusting", "pathetic", "idiot", "clown",
  "trash", "rage", "bankrupt", "liar", "lies", "destroy", "cancel", "exposed"
];

const SADNESS_WORDS = [
  "depressing", "unfortunate", "sad", "hopeless", "grief", "loss", "pain",
  "miserable", "crying", "regret", "lonely", "disappointed"
];

const FEAR_WORDS = [
  "danger", "threat", "watch your back", "trap", "no escape", "terrified",
  "warning", "catastrophe", "collapse", "crisis", "fear", "coming for you"
];

const HARASSMENT_WORDS = [
  "delete your account", "everyone hates you", "pathetic clown", "worthless",
  "ugly", "kill", "die", "resign", "doxx", "shut up", "zero talent",
  "nobody likes you", "get offline", "loser"
];

const INSULT_WORDS = [
  "idiot", "clown", "fraud", "fool", "stupid", "moron", "loser",
  "pathetic", "liar", "coward", "hypocrite"
];

const THREAT_PHRASES = [
  "we are coming for you", "watch your back", "no escape", "make you pay",
  "hunt you down", "will create 50 more accounts", "flood every reply",
  "take you down"
];

const CYBERBULLYING_INDICATORS = [
  "keep spamming", "flood replies", "delete your account", "nobody likes you",
  "target exposed", "cancel now", "loser alert", "until you resign"
];

export function analyzePostFallback(text: string): AnalysisResult {
  const lower = text.toLowerCase();
  const tokens = lower.match(/\b[a-z0-9_-]+\b/g) || [];

  // Match positive and negative counts
  let posCount = 0;
  POSITIVE_WORDS.forEach((w) => {
    if (lower.includes(w)) posCount++;
  });

  let negCount = 0;
  NEGATIVE_WORDS.forEach((w) => {
    if (lower.includes(w)) negCount++;
  });

  // Calculate sentiment score (-1.0 to 1.0)
  const totalSentimentTokens = posCount + negCount;
  let sentimentScore = 0;
  if (totalSentimentTokens > 0) {
    sentimentScore = (posCount - negCount) / totalSentimentTokens;
  }

  let sentiment: "Positive" | "Neutral" | "Negative" = "Neutral";
  if (sentimentScore > 0.15) sentiment = "Positive";
  else if (sentimentScore < -0.15) sentiment = "Negative";

  // Match emotions
  let angerScore = 0;
  ANGER_WORDS.forEach((w) => {
    if (lower.includes(w)) angerScore++;
  });

  let sadnessScore = 0;
  SADNESS_WORDS.forEach((w) => {
    if (lower.includes(w)) sadnessScore++;
  });

  let fearScore = 0;
  FEAR_WORDS.forEach((w) => {
    if (lower.includes(w)) fearScore++;
  });

  let emotion: EmotionType = "Neutral";
  if (posCount > negCount && posCount >= 1) emotion = "Joy";
  else if (angerScore > sadnessScore && angerScore > fearScore && angerScore > 0) emotion = "Anger";
  else if (fearScore > angerScore && fearScore > 0) emotion = "Fear";
  else if (sadnessScore > 0) emotion = "Sadness";
  else if (negCount > 0) emotion = "Anger";

  // Harassment and cyberbullying scoring
  let harassmentHits = 0;
  HARASSMENT_WORDS.forEach((w) => {
    if (lower.includes(w)) harassmentHits++;
  });

  let insultHits = 0;
  INSULT_WORDS.forEach((w) => {
    if (lower.includes(w)) insultHits++;
  });

  let threatHits = 0;
  THREAT_PHRASES.forEach((w) => {
    if (lower.includes(w)) threatHits += 2;
  });

  let cyberHits = 0;
  CYBERBULLYING_INDICATORS.forEach((w) => {
    if (lower.includes(w)) cyberHits++;
  });

  // Toxicity Score (0-100)
  const toxicityRaw = (harassmentHits * 28) + (insultHits * 20) + (threatHits * 35) + (negCount * 6);
  const toxicityScore = Math.min(100, Math.max(0, Math.round(toxicityRaw)));

  // Cyberbullying Risk (0-100)
  const cyberRaw = (cyberHits * 32) + (harassmentHits * 25) + (threatHits * 30) + (insultHits * 15);
  const cyberbullyingRisk = Math.min(100, Math.max(0, Math.round(cyberRaw)));

  // Threat indicators list
  const threatIndicators: string[] = [];
  if (threatHits > 0) threatIndicators.push("Direct personal intimidation / threat of physical harm or harassment");
  if (cyberbullyingRisk > 60) threatIndicators.push("Targeted cyberbullying / repeated personal attack patterns");
  if (harassmentHits > 0) threatIndicators.push("Harassment cues demanding account deletion or deplatforming");
  if (insultHits >= 2) threatIndicators.push("Multiple explicit derogatory insults directed at target");
  if (lower.includes("http") || lower.includes("bit.ly")) threatIndicators.push("External URL redirection / potential link obfuscation");
  if (threatIndicators.length === 0) {
    if (negCount > 2) threatIndicators.push("Elevated adversarial sentiment detected");
    else threatIndicators.push("No severe safety red flags detected");
  }

  // Topics and Entities
  const topics: string[] = [];
  if (lower.includes("solar") || lower.includes("energy") || lower.includes("climate") || lower.includes("clean")) topics.push("Clean Energy & Climate");
  if (lower.includes("ai") || lower.includes("model") || lower.includes("tech") || lower.includes("code")) topics.push("AI & Technology");
  if (lower.includes("transit") || lower.includes("city") || lower.includes("traffic")) topics.push("Urban Infrastructure");
  if (lower.includes("fraud") || lower.includes("scam") || lower.includes("dossier") || lower.includes("hoax")) topics.push("Disinformation / Accusations");
  if (lower.includes("sih") || lower.includes("hackathon") || lower.includes("engineer")) topics.push("Hackathons & Engineering");
  if (lower.includes("@") || lower.includes("you") || cyberbullyingRisk > 50) topics.push("Individual User Interaction");
  if (topics.length === 0) topics.push("General Social Discourse");

  // Intent
  let intent = "Constructive Discussion";
  if (cyberbullyingRisk >= 75 || threatHits > 0) intent = "Malicious Intimidation / Harassment";
  else if (cyberbullyingRisk >= 40) intent = "Adversarial Hostility";
  else if (lower.includes("scam") || lower.includes("hoax") || lower.includes("bit.ly")) intent = "Disinformation / Astroturfing";
  else if (posCount > 1) intent = "Advocacy & Knowledge Sharing";

  // Recommended Action
  let recommendedAction: RecommendedAction = "NO ACTION";
  if (cyberbullyingRisk >= 80 || toxicityScore >= 85 || threatHits > 0) {
    recommendedAction = "ESCALATE";
  } else if (cyberbullyingRisk >= 60 || toxicityScore >= 60) {
    recommendedAction = "FLAG FOR REVIEW";
  } else if (cyberbullyingRisk >= 30 || toxicityScore >= 35) {
    recommendedAction = "MONITOR";
  }

  // Plain-English Explanation
  let explanation = "";
  if (cyberbullyingRisk >= 70) {
    explanation = `High risk detected. The text displays direct aggressive swarming language, insults, and targeted harassment against an individual user, necessitating immediate moderator intervention.`;
  } else if (lower.includes("scam") || lower.includes("hoax")) {
    explanation = `Adversarial sentiment and speculative fraud claims detected. The post appears aimed at shaping negative public perception around energy topics.`;
  } else if (sentiment === "Positive") {
    explanation = `Positive community engagement observed. The post communicates constructive commentary with low toxicity markers.`;
  } else {
    explanation = `Standard public discourse. The post exhibits neutral or moderate sentiment without threatening or malicious signals.`;
  }

  // Confidence calculation
  const confidence = Math.min(96, Math.max(72, 70 + (tokens.length > 5 ? 15 : 5) + (posCount + negCount + harassmentHits) * 3));

  return {
    sentiment,
    sentimentScore: parseFloat(sentimentScore.toFixed(2)),
    confidence,
    emotion,
    intent,
    toxicityScore,
    cyberbullyingRisk,
    threatIndicators,
    topics,
    explanation,
    recommendedAction,
    isFallback: true,
    source: "Fallback Analysis — Offline Mode"
  };
}
