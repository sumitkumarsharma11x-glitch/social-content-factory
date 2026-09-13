/**
 * Content Strategy Mock
 * ----------------------
 * Offline deterministic generator used to test CONTENT STRATEGY and the
 * review pipeline. It produces exactly 30 pieces: 10 shared core questions
 * × 3 platforms, with genuinely different platform-specific explanations.
 *
 * Important boundary:
 *   StrategyAngle/PlatformView are INTERNAL generation metadata.
 *   Only title/body/hashtags/cta are persisted as user-facing content.
 *   Internal labels such as "Hook:", "Voice-over:" and "Takeaway:" must
 *   never leak into the final body.
 */

import {
  PLATFORMS,
  PIECES_PER_PLATFORM,
  type ContentBatch,
  type ContentPiece,
  type Platform,
} from "./content-schema";

const WEBSITE_MENTIONS = [
  (topic: string) => `${topic} ka पूरा breakdown rojgardwaar.in पर मिलेगा, अगर detail mein समझना हो.`,
  (topic: string) => `अगर इस concept को chapter-wise समझना है, तो rojgardwaar.in पर इसका आसान explanation मिल जाएगा.`,
  (topic: string) => `Revision के लिए rojgardwaar.in पर इसी topic को थोड़ा और detail में देख सकते हो.`,
] as const;

function pickWebsiteMention(topic: string, pieceIndex: number): string | null {
  // Exactly 20/30 pieces mention the site: two out of every three pieces.
  if (pieceIndex % 3 === 2) return null;
  return WEBSITE_MENTIONS[Math.floor(pieceIndex / 3) % WEBSITE_MENTIONS.length](topic);
}

function extractTopic(prompt: string): string {
  const match = prompt.match(/Topic\/Chapter:\s*"([^"]+)"/i);
  if (match?.[1]?.trim()) return match[1].trim();
  return prompt.trim() || "your topic";
}

interface PlatformView {
  explanation: string;
  opener: string;
}

interface StrategyAngle {
  hook: string;
  angle: string;
  perPlatform: Record<Platform, PlatformView>;
}

/**
 * Stable internal labels used for explanation_angle metadata.
 * They are never rendered into body text.
 */
const PLATFORM_ANGLES: Record<Platform, readonly string[]> = {
  instagram_reel: [
    "energy-source reveal",
    "sunlight-off consequence",
    "chlorophyll clue",
    "glucose factory analogy",
    "gas-exchange misconception",
    "leaf mini-lab",
    "exam keyword trigger",
    "why-first chain",
    "diagram-to-process decode",
    "rapid process recap",
  ],
  facebook_post: [
    "energy-to-process explanation",
    "cause-and-effect scenario",
    "pigment-function clarification",
    "food-making analogy",
    "oxygen misconception bust",
    "real-world observation",
    "exam wording translation",
    "logic-chain explanation",
    "diagram relationship reading",
    "structured revision summary",
  ],
  youtube_short: [
    "three-second energy clue",
    "immediate what-if reveal",
    "pigment mystery reveal",
    "food-making twist",
    "oxygen surprise",
    "leaf experiment reveal",
    "keyword-to-answer shortcut",
    "why-before-what reveal",
    "arrow-following diagram trick",
    "one-line exam payoff",
  ],
};

function photosynthesisAngles(): StrategyAngle[] {
  const questions = [
    "पौधे photosynthesis में sunlight का इस्तेमाल आखिर किस काम के लिए करते हैं?",
    "अगर photosynthesis में sunlight ही न मिले, तो सबसे पहले क्या बदलेगा?",
    "Photosynthesis में chlorophyll की छोटी-सी भूमिका इतनी important क्यों है?",
    "पौधा sunlight से मिली energy को glucose बनाने में कैसे इस्तेमाल करता है?",
    "Photosynthesis में oxygen बनना असल में plant का main goal है या कुछ और?",
    "एक हरे पत्ते को देखकर photosynthesis का पूरा idea कैसे समझ सकते हैं?",
    "Exam में photosynthesis का सवाल आए तो कौन-सा keyword answer की direction बताता है?",
    "Photosynthesis को समझने के लिए पहले ‘क्या’ नहीं, ‘क्यों’ पूछना क्यों useful है?",
    "Photosynthesis के diagram में arrows देखकर process को आसानी से कैसे decode करें?",
    "Photosynthesis को जल्दी revise करना हो तो सिर्फ कौन-सी तीन बातें याद रखें?",
  ];

  const views: Array<Record<Platform, PlatformView>> = [
    {
      instagram_reel: {
        opener: "पहले एक guess करो.",
        explanation: "Sunlight plant के लिए सिर्फ रोशनी नहीं है—यह energy source है. इसी energy की मदद से plant carbon dioxide और water से glucose बनाने वाला photosynthesis process चला पाता है.",
      },
      facebook_post: {
        opener: "यहाँ एक common confusion दूर करते हैं.",
        explanation: "Plant sunlight को सीधे food में नहीं बदलता. Sunlight से मिलने वाली light energy photosynthesis को चलाने के लिए इस्तेमाल होती है, जबकि glucose बनाने के लिए carbon dioxide और water भी जरूरी होते हैं. इसलिए sunlight को process का energy source समझना सबसे सही starting point है.",
      },
      youtube_short: {
        opener: "रुको—sunlight plant के लिए करती क्या है?",
        explanation: "Answer: energy देती है. यही energy photosynthesis को चलाती है, जिससे plant glucose बना पाता है. यानी sunlight = process की energy clue.",
      },
    },
    {
      instagram_reel: {
        opener: "अब imagine करो—sunlight गायब.",
        explanation: "Photosynthesis की energy supply घट जाएगी, इसलिए glucose बनाने की process प्रभावित होगी. यही कारण है कि light photosynthesis के लिए जरूरी है.",
      },
      facebook_post: {
        opener: "एक simple what-if situation सोचिए.",
        explanation: "अगर plant को पर्याप्त sunlight न मिले, तो photosynthesis की light-dependent energy supply प्रभावित होगी. इसका असर आगे glucose production पर पड़ेगा. इसलिए sunlight हटते ही सबसे पहले energy input का सवाल आता है, न कि सिर्फ ‘plant अंधेरे में है’ वाला observation.",
      },
      youtube_short: {
        opener: "अगर sunlight OFF हो जाए तो?",
        explanation: "सबसे पहले photosynthesis की energy supply प्रभावित होगी. फिर glucose बनाने की process भी प्रभावित होगी. बस यही cause-and-effect chain याद रखो.",
      },
    },
    {
      instagram_reel: {
        opener: "एक छोटा clue पूरा concept खोलता है.",
        explanation: "वह clue है chlorophyll. Leaves का यह green pigment light energy absorb करने में मदद करता है, इसलिए photosynthesis और chlorophyll का connection इतना important है.",
      },
      facebook_post: {
        opener: "Chlorophyll को सिर्फ ‘green colour’ कहकर छोड़ देना अधूरा है.",
        explanation: "Chlorophyll एक green pigment है जो light को absorb करने में महत्वपूर्ण भूमिका निभाता है. इसी वजह से इसे photosynthesis की light capture वाली कहानी से जोड़कर समझना बेहतर है. Green colour उसका दिखाई देने वाला feature है; light absorption उसका conceptual role है.",
      },
      youtube_short: {
        opener: "Leaves green क्यों हैं—और इसका photosynthesis से क्या link है?",
        explanation: "Clue है chlorophyll. यह pigment light absorb करने में मदद करता है, और वही light photosynthesis के लिए energy source बनती है. Green leaf देखकर pigment वाला connection याद करो.",
      },
    },
    {
      instagram_reel: {
        opener: "Sunlight से food तक का रास्ता देखो.",
        explanation: "Plant sunlight की energy का इस्तेमाल photosynthesis चलाने में करता है, और इस process में carbon dioxide और water से glucose बनता है. यानी sunlight energy देती है, glucose product है.",
      },
      facebook_post: {
        opener: "इसे एक छोटी factory की तरह सोचिए.",
        explanation: "Plant की leaf को एक tiny food-making system मानिए. Sunlight energy देती है, carbon dioxide और water raw materials की तरह काम करते हैं, और photosynthesis के जरिए glucose बनता है. इस analogy से inputs, energy और product का फर्क साफ रहता है.",
      },
      youtube_short: {
        opener: "Plant sunlight से food बनाता है—लेकिन बीच में क्या होता है?",
        explanation: "Sunlight energy देती है, carbon dioxide और water inputs हैं, और photosynthesis glucose बनाता है. यही पूरा food-making twist है.",
      },
    },
    {
      instagram_reel: {
        opener: "एक exam trap पकड़ो.",
        explanation: "Oxygen बनना photosynthesis का important result है, लेकिन plant का मुख्य food-making output glucose है. इसलिए ‘oxygen ही main goal है’ मान लेना सही नहीं होगा.",
      },
      facebook_post: {
        opener: "यहाँ students अक्सर result और purpose को मिला देते हैं.",
        explanation: "Photosynthesis के दौरान oxygen release होता है, लेकिन plant की food-making process का प्रमुख product glucose है. Oxygen को important by-product के रूप में समझना ज्यादा accurate है. इस distinction से objective questions में होने वाली common confusion कम होती है.",
      },
      youtube_short: {
        opener: "Photosynthesis oxygen बनाने के लिए होता है? Nope—एक twist है.",
        explanation: "Plant का food-making product glucose है; oxygen photosynthesis के दौरान release होने वाला important by-product है. Exam में यही distinction काम आएगा.",
      },
    },
    {
      instagram_reel: {
        opener: "बस एक leaf देखो और clue पकड़ो.",
        explanation: "Green leaf में chlorophyll light absorb करने में मदद करता है, और leaf के अंदर photosynthesis के लिए जरूरी raw materials पहुँचते हैं. इसलिए leaf को food-making site की तरह सोच सकते हो.",
      },
      facebook_post: {
        opener: "एक familiar observation से concept समझते हैं.",
        explanation: "जब हम एक healthy green leaf देखते हैं, तो उसमें chlorophyll की मौजूदगी photosynthesis से जुड़ा बड़ा clue देती है. Leaf को केवल ‘हरा हिस्सा’ मानने के बजाय इसे photosynthesis की मुख्य site के रूप में देखने से light, raw materials और glucose की पूरी कहानी एक साथ जुड़ती है.",
      },
      youtube_short: {
        opener: "एक green leaf—तीन clues.",
        explanation: "Green colour: chlorophyll. Sunlight: energy. Leaf: photosynthesis की main site. इन तीनों को जोड़ो और पूरा basic concept याद हो जाता है.",
      },
    },
    {
      instagram_reel: {
        opener: "Exam में wording बदल सकती है, concept नहीं.",
        explanation: "अगर question में ‘energy source’, ‘light energy’ या ‘sunlight’ जैसे words दिखें, तो photosynthesis की energy requirement याद करो. यही keyword answer की दिशा जल्दी बताता है.",
      },
      facebook_post: {
        opener: "Exam question को keyword में translate करना सीखिए.",
        explanation: "Photosynthesis के सवाल में ‘energy source’, ‘light energy’ और ‘sunlight’ अलग-अलग wording हो सकती है, लेकिन concept एक ही दिशा में जाता है: light energy photosynthesis को चलाने में जरूरी है. Exact sentence याद करने के बजाय keyword पहचानना ज्यादा reliable तरीका है.",
      },
      youtube_short: {
        opener: "Exam clue चाहिए? ‘Energy source’ दिखे तो क्या याद आएगा?",
        explanation: "Photosynthesis में sunlight की light energy. बस keyword को concept से connect करो: energy source → sunlight → photosynthesis.",
      },
    },
    {
      instagram_reel: {
        opener: "Definition से पहले एक ‘क्यों’ पूछो.",
        explanation: "Plant photosynthesis क्यों करता है? क्योंकि उसे अपने लिए food यानी glucose बनाने की जरूरत होती है. जब purpose clear हो जाता है, sunlight, carbon dioxide और water की roles भी आसानी से जुड़ जाती हैं.",
      },
      facebook_post: {
        opener: "इस बार definition रटने के बजाय reason से शुरू करते हैं.",
        explanation: "Photosynthesis को समझने का आसान रास्ता है purpose से शुरुआत करना: plant को food बनाना है. फिर पूछो—उसके लिए क्या चाहिए? Light energy, carbon dioxide और water. इस तरह facts अलग-अलग points नहीं रहते; वे एक logical chain बन जाते हैं.",
      },
      youtube_short: {
        opener: "Photosynthesis ‘क्या’ है बाद में—पहले ‘क्यों’?",
        explanation: "क्योंकि plant को food बनाना है. फिर chain याद करो: sunlight energy + carbon dioxide + water → glucose. Reason याद होगा तो process भी जल्दी recall होगा.",
      },
    },
    {
      instagram_reel: {
        opener: "Diagram में बस arrows follow करो.",
        explanation: "Sunlight को energy input की तरह देखो, carbon dioxide और water को inputs की तरह, और glucose को product की तरह. Arrows इसी flow को दिखाते हैं.",
      },
      facebook_post: {
        opener: "Photosynthesis का diagram याद करने के बजाय उसे पढ़ना सीखिए.",
        explanation: "सबसे पहले inputs पहचानिए: sunlight की energy, carbon dioxide और water. फिर process के बाद product की तरफ देखिए: glucose. Diagram के arrows को ‘कौन-सी चीज कहाँ जा रही है?’ वाले सवाल की तरह पढ़ेंगे, तो पूरी process बिना रटने के समझ में आती है.",
      },
      youtube_short: {
        opener: "Diagram trick: arrows को बस follow करो.",
        explanation: "Inputs अंदर—sunlight energy, carbon dioxide, water. Process के बाद glucose बाहर. Arrows follow करो और photosynthesis का flow तुरंत clear.",
      },
    },
    {
      instagram_reel: {
        opener: "Quick revision के लिए सिर्फ तीन anchors रखो.",
        explanation: "पहला—sunlight energy source है. दूसरा—carbon dioxide और water inputs हैं. तीसरा—photosynthesis glucose बनाता है और oxygen release होता है. बस इन तीन anchors से पूरा basic flow याद आ जाएगा.",
      },
      facebook_post: {
        opener: "Last-minute revision के लिए पूरे paragraph की जरूरत नहीं.",
        explanation: "Photosynthesis को तीन anchors में compress किया जा सकता है: light energy process को चलाती है; carbon dioxide और water inputs देते हैं; और process से glucose बनता है, साथ में oxygen release होता है. इन relationships को याद रखने से definition भूल भी जाएँ, तो concept reconstruct किया जा सकता है.",
      },
      youtube_short: {
        opener: "Photosynthesis की one-line revision चाहिए?",
        explanation: "Sunlight energy देती है, carbon dioxide और water inputs हैं, और photosynthesis glucose बनाता है while oxygen is released. यही exam-time payoff याद रखो.",
      },
    },
  ];

  return questions.map((hook, i) => ({
    hook,
    angle: PLATFORM_ANGLES.instagram_reel[i],
    perPlatform: views[i],
  }));
}

function genericAngles(topic: string): StrategyAngle[] {
  const questions = [
    `🤯 ${topic} में सबसे surprising point आखिर क्या है?`,
    `❓ अगर ${topic} अचानक गायब हो जाए, तो सबसे पहले क्या बदलेगा?`,
    `😱 ${topic} में कौन-सी छोटी detail पूरा concept बदल देती है?`,
    `🧠 क्या तुम ${topic} को बिना textbook देखे 20 seconds में समझा सकते हो?`,
    `🔍 ${topic} को समझते समय सबसे common गलती कहाँ होती है?`,
    `⚡ ${topic} को real-life example से देखें तो क्या ये आसान हो जाता है?`,
    `🎯 Exam में ${topic} का सवाल आया तो सबसे पहले क्या याद आना चाहिए?`,
    `🤔 ${topic} का “क्या” तो सब बताते हैं—लेकिन “क्यों” क्या है?`,
    `👀 सिर्फ एक diagram देखकर ${topic} को कितना समझा जा सकता है?`,
    `🔥 ${topic} का सिर्फ एक point याद रखना हो, तो कौन-सा होगा?`,
  ];
  const angles = [
    "surprise reveal",
    "what-if consequence",
    "hidden detail",
    "challenge explanation",
    "misconception bust",
    "real-life analogy",
    "exam trigger",
    "why-first logic",
    "diagram decoding",
    "rapid summary",
  ];

  const openers: Record<Platform, string[]> = {
    instagram_reel: [
      "एक सेकंड—पहले इसका answer guess करो.",
      "अब उल्टा सोचो—अगर ये रहे ही नहीं तो?",
      "यहीं एक छोटी detail पूरा picture बदल देती है.",
      "चलो 20-second challenge करते हैं.",
      "इस topic में एक common confusion बहुत आसानी से हो सकती है.",
      "इसे रोजमर्रा की एक चीज से जोड़कर देखो.",
      "Exam वाला सवाल हो तो एक clue पकड़ो.",
      "Definition छोड़ो—पहले पूछो, ऐसा क्यों होता है?",
      "एक diagram से पूरा idea पकड़ते हैं.",
      "पूरे topic को fast revision में compress करते हैं.",
    ],
    facebook_post: [
      "यह सवाल सुनते ही एक common assumption दिमाग में आता है.",
      "अब एक what-if सोचो—अगर ये न रहे तो?",
      "पूरे topic की clarity कभी-कभी एक छोटी detail से आती है.",
      "चलो देखते हैं, इसे अपने शब्दों में कैसे समझाया जा सकता है.",
      "यहाँ एक common confusion को साफ करना जरूरी है.",
      "अब इसे real life की एक familiar situation से जोड़ो.",
      "Exam में यही concept अलग wording में आ सकता है.",
      "इस बार definition से शुरुआत नहीं करेंगे.",
      "एक diagram को पढ़ने का आसान तरीका देखते हैं.",
      "पूरे topic को एक compact revision structure में रखते हैं.",
    ],
    youtube_short: [
      "रुको—पहले इसका answer guess करो.",
      "अगर ये गायब हो जाए तो? बस एक second सोचो.",
      "एक छोटी detail—और पूरा concept clear!",
      "20-second challenge—क्या तुम बता सकते हो?",
      "इसमें सबसे common confusion क्या है?",
      "इसे एक real-life example से पकड़ो.",
      "Exam clue चाहिए? ये keyword पकड़ो.",
      "क्या होगा छोड़ो—पहले पूछो, क्यों होगा?",
      "एक diagram, तीन seconds, पूरा idea!",
      "One-line revision—ready?",
    ],
  };

  return questions.map((hook, i) => ({
    hook,
    angle: angles[i],
    perPlatform: {
      instagram_reel: {
        opener: openers.instagram_reel[i],
        explanation: `${topic} को समझने का सबसे आसान रास्ता उसका role, कारण और result जोड़कर देखना है। इसी connection से concept सिर्फ याद नहीं रहता, समझ भी आता है।`,
      },
      facebook_post: {
        opener: openers.facebook_post[i],
        explanation: `${topic} को सिर्फ एक definition तक सीमित करने के बजाय उसके role, कारण, example और result के साथ देखना ज्यादा useful है। इससे chapter-level context साफ होता है और अलग wording वाले questions को भी समझना आसान होता है।`,
      },
      youtube_short: {
        opener: openers.youtube_short[i],
        explanation: `${topic} का fastest clue उसके core role और result में है। पहले यही connection पकड़ो, फिर बाकी details उसी से जोड़ना आसान हो जाता है।`,
      },
    },
  }));
}

function getAngles(topic: string): StrategyAngle[] {
  return /photosynthesis|प्रकाश संश्लेषण/i.test(topic)
    ? photosynthesisAngles()
    : genericAngles(topic);
}

const CTA_VARIANTS: Record<Platform, string[]> = {
  instagram_reel: [
    "Save कर लो—अगली revision में काम आएगा.",
    "अगर ये explanation useful लगी, तो ऐसे concepts के लिए follow कर लो.",
    "इस concept को save करके रख लो.",
    "ऐसे ही एक और concept अगले reel में समझेंगे.",
    "Concept clear हुआ? Revision list में add कर लो.",
    "इसे save कर लो—exam से पहले फिर देख लेना.",
    "अगर angle पसंद आया, तो ऐसे explainers के लिए follow कर लेना.",
    "एक बार save, फिर exam time पर quick recall.",
    "इस सवाल को याद रखो—यही concept खोलता है.",
    "Next concept भी इसी तरह decode करेंगे.",
  ],
  facebook_post: [
    "तुम्हें यह concept किस example से सबसे आसान लगा? Comment में बताओ.",
    "क्या तुम इसे अपने शब्दों में एक line में समझा सकते हो? नीचे लिखो.",
    "इस topic में तुम्हें सबसे confusing point कौन-सा लगता है? बताओ.",
    "अगर यही सवाल exam में आए, तो तुम पहला keyword क्या चुनोगे? Comment करो.",
    "किसी दोस्त को समझाना हो तो इसे कैसे समझाओगे? अपना तरीका लिखो.",
    "क्या diagram से यह concept ज्यादा clear होता है? अपना view बताओ.",
    "इस explanation में कौन-सा point सबसे useful लगा? बताओ.",
    "तुम्हारे हिसाब से इस concept की सबसे common गलती क्या है? Comment करो.",
    "क्या इस topic का कोई दूसरा आसान example तुम्हारे दिमाग में है? Share करो.",
    "अगर चाहो तो इसी chapter के अगले concept पर भी discussion कर सकते हैं.",
  ],
  youtube_short: [
    "Revision के लिए save करो और ऐसे quick explainers के लिए subscribe करो.",
    "इस shortcut को save कर लो—next revision में काम आएगा.",
    "अगर explanation useful लगी, तो subscribe कर लो.",
    "Exam से पहले इसे फिर देखना हो तो save कर लो.",
    "ऐसे fast concept breakdowns के लिए subscribe करो.",
    "एक और concept ऐसे ही decode करेंगे—subscribe कर लो.",
    "इस one-line takeaway को save कर लो.",
    "अगर answer clear हुआ, तो इसे revision list में रख लो.",
    "Quick revision पसंद है? ऐसे explainers के लिए subscribe करो.",
    "बस यही clue याद रखो और आगे बढ़ो.",
  ],
};

function buildPiece(
  platform: Platform,
  pieceNumber: number,
  topic: string,
  angle: StrategyAngle,
  platformOffset: number,
): ContentPiece {
  const view = angle.perPlatform[platform];
  const websiteLine = pickWebsiteMention(topic, pieceNumber + platformOffset);
  const platformClose = CTA_VARIANTS[platform][pieceNumber - 1];

  // Only creator-ready copy goes into body. Strategy metadata is kept separate.
  const bodyParts = [
    view.opener,
    view.explanation,
    websiteLine,
  ].filter((part): part is string => Boolean(part));

  return {
    platform,
    piece_number: pieceNumber,
    title: angle.hook,
    body: bodyParts.join("\n\n"),
    hashtags: [
      "#Education",
      pieceNumber % 2 === 0 ? "#ConceptClarity" : "#StudySmart",
      /photosynthesis|प्रकाश संश्लेषण/i.test(topic) ? "#Photosynthesis" : "#StudyConcepts",
      platform === "instagram_reel"
        ? (pieceNumber % 2 === 0 ? "#ReelLearning" : "#LearnOnReels")
        : platform === "facebook_post"
          ? (pieceNumber % 2 === 0 ? "#StudyDiscussion" : "#LearningTogether")
          : (pieceNumber % 2 === 0 ? "#ShortsLearning" : "#ExamRevision"),
    ],
    cta: platformClose,
    core_question_id: pieceNumber,
    explanation_angle: PLATFORM_ANGLES[platform][pieceNumber - 1] ?? angle.angle,
  };
}

export function generateMockContentBatch(prompt: string): ContentBatch {
  const topic = extractTopic(prompt);
  const angles = getAngles(topic);
  const pieces: ContentPiece[] = [];

  for (const platform of PLATFORMS) {
    for (let n = 1; n <= PIECES_PER_PLATFORM; n++) {
      const platformOffset = PLATFORMS.indexOf(platform) * PIECES_PER_PLATFORM;
      pieces.push(buildPiece(platform, n, topic, angles[n - 1], platformOffset));
    }
  }

  return { pieces };
}
