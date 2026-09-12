/**
 * Content Strategy Mock
 * ----------------------
 * Offline deterministic generator used to test CONTENT STRATEGY, not just
 * the API pipeline. It produces exactly 30 pieces with:
 *   - 10 core curiosity questions reused across the 3 platforms
 *   - a different explanation angle for each platform/view
 *   - natural Hindi voice-over copy
 *   - platform-specific presentation
 *   - contextual website mentions on roughly 2/3 of pieces
 */

import { PLATFORMS, PIECES_PER_PLATFORM, type ContentBatch, type ContentPiece, type Platform } from "./content-schema";

const WEBSITE_MENTIONS = [
  (topic: string) => `${topic} ka पूरा breakdown rojgardwaar.in पर मिलेगा, अगर detail mein समझना हो.`,
  (topic: string) => `अगर इस concept को chapter-wise समझना है, तो rojgardwaar.in पर इसका आसान explanation मिल जाएगा.`,
  (topic: string) => `Revision के लिए rojgardwaar.in पर इसी topic को थोड़ा और detail में देख सकते हो.`,
] as const;

function pickWebsiteMention(topic: string, pieceIndex: number): string | null {
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
  visual: string;
  takeaway: string;
  opener: string;
}

interface StrategyAngle {
  hook: string;
  angle: string;
  perPlatform: Record<Platform, PlatformView>;
}

const PLATFORM_ANGLES: Record<Platform, string[]> = {
  instagram_reel: [
    "surprise reveal", "visual reveal", "myth flip", "key-term reveal", "cause-and-effect", "real-life analogy", "quick payoff", "mystery reveal", "equation decode", "big-picture reveal",
  ],
  facebook_post: [
    "concept unpacking", "why it matters", "detail behind the fact", "term in context", "step-by-step cause", "everyday analogy", "exam connection", "process explanation", "logic breakdown", "discussion angle",
  ],
  youtube_short: [
    "fast reveal", "3-second setup", "myth-busting payoff", "keyword reveal", "because-to-result", "one-example payoff", "exam recall", "hidden-process reveal", "equation shortcut", "ecosystem payoff",
  ],
};

function photosynthesisAngles(): StrategyAngle[] {
  const hooks = [
    "🌱 पौधे खाते कुछ नहीं… फिर उनका खाना बनता कैसे है?",
    "☀️ पौधे के लिए सूरज की रोशनी सिर्फ रोशनी है… या कुछ और भी?",
    "😮 पत्ती हरी ही क्यों दिखाई देती है—इसके पीछे कोई secret है?",
    "🤯 Chlorophyll आखिर करता क्या है कि पूरी process चल पड़ती है?",
    "🌬️ पौधा CO₂ लेता है… लेकिन आखिर उसे इसकी जरूरत क्यों पड़ती है?",
    "💧 जड़ों से आया पानी Photosynthesis में आखिर जाता कहाँ है?",
    "🧪 Glucose बन गया… अब पौधा इसका करता क्या है?",
    "🌍 Photosynthesis में निकलने वाली Oxygen आती कहाँ से है?",
    "🧠 Photosynthesis की equation रटने के बजाय उसका logic कैसे समझें?",
    "🚨 अगर Photosynthesis रुक जाए, तो क्या सिर्फ पौधों पर असर पड़ेगा?",
  ];

  const data: Array<{
    angle: string;
    reel: PlatformView;
    facebook: PlatformView;
    short: PlatformView;
  }> = [
    {
      angle: "food factory reveal",
      reel: { opener: "सोचो—बिना खाए भी food बन रहा है!", explanation: "पौधे sunlight की energy, carbon dioxide और water की मदद से glucose बनाते हैं। यानी पत्ती plant की food-making factory की तरह काम करती है।", visual: "Sunlight + CO₂ + water → leaf → glucose animation.", takeaway: "Photosynthesis = plant का food-making process." },
      facebook: { opener: "ये सवाल थोड़ा अजीब लगता है, लेकिन यहीं से concept खुलता है।", explanation: "पौधा बाहर से बना हुआ food नहीं खाता। Chlorophyll sunlight की energy पकड़ने में मदद करता है, और उसी energy से carbon dioxide तथा water से glucose बनाने की प्रक्रिया चलती है।", visual: "एक labelled leaf में sunlight, CO₂ और water के arrows दिखाओ।", takeaway: "Plant food को बाहर से लेने के बजाय Photosynthesis में बनाता है।" },
      short: { opener: "3 सेकंड में सोचो—खाना आता कहाँ से है?", explanation: "Answer: sunlight, CO₂ और water से glucose बनता है। यही Photosynthesis का core idea है।", visual: "On-screen: Sun + CO₂ + Water → ? → Glucose.", takeaway: "Food factory = leaf." },
    },
    {
      angle: "energy reveal",
      reel: { opener: "सूरज सिर्फ पौधे को रोशन नहीं करता!", explanation: "Sunlight Photosynthesis को जरूरी energy देती है। पौधा इस light energy का इस्तेमाल glucose बनाने की प्रक्रिया में करता है।", visual: "Sun beam → chloroplast → energy arrows.", takeaway: "Sunlight यहाँ energy source है, सिर्फ light नहीं।" },
      facebook: { opener: "अब सवाल है—sunlight की जरूरत आखिर क्यों है?", explanation: "Photosynthesis में chemical changes चलाने के लिए energy चाहिए। पौधे sunlight से यह energy लेते हैं और उसे food बनाने की प्रक्रिया में इस्तेमाल करते हैं।", visual: "Light energy को process के input के रूप में अलग box में दिखाओ।", takeaway: "Sunlight को Photosynthesis का energy input समझो।" },
      short: { opener: "Sunlight गायब? Process की energy कहाँ से आएगी?", explanation: "Photosynthesis को light energy चाहिए। इसी energy से plant food बनाने की process चलती है।", visual: "☀️ OFF → Photosynthesis slows/stops cue.", takeaway: "Light = energy input." },
    },
    {
      angle: "green-leaf mystery",
      reel: { opener: "पत्ती green है—और ये सिर्फ colour choice नहीं है!", explanation: "पत्ती का हरा रंग मुख्यतः Chlorophyll pigment की वजह से होता है, जो Photosynthesis में light capture करने में महत्वपूर्ण है।", visual: "Leaf zoom → green pigment → light arrows.", takeaway: "Green leaf में Chlorophyll का clue छिपा है।" },
      facebook: { opener: "अगर पत्ती का colour सिर्फ सुंदरता होता, तो Photosynthesis का क्या connection बनता?", explanation: "Chlorophyll एक pigment है जो plant cells में light energy capture करने में मदद करता है। इसलिए green leaf का colour Photosynthesis से सीधे जुड़ा है।", visual: "Leaf → chloroplast → chlorophyll का simple hierarchy diagram.", takeaway: "Green colour को Chlorophyll और Photosynthesis से connect करो।" },
      short: { opener: "Green क्यों? Answer सिर्फ 'सुंदर' नहीं है!", explanation: "Chlorophyll light capture करने में मदद करता है, और इसी वजह से Photosynthesis में इसका बड़ा role है।", visual: "GREEN LEAF → CHLOROPHYLL → LIGHT.", takeaway: "Green = Chlorophyll clue." },
    },
    {
      angle: "key pigment",
      reel: { opener: "एक छोटा pigment पूरी process का important player है!", explanation: "Chlorophyll chloroplasts में मौजूद key pigment है और sunlight की energy capture करने में मदद करता है।", visual: "Chloroplast close-up → Chlorophyll highlight.", takeaway: "Chlorophyll = light capture का key pigment." },
      facebook: { opener: "Chlorophyll को सिर्फ 'हरा रंग' कहना अधूरी समझ है।", explanation: "Chlorophyll का महत्व इसलिए है क्योंकि यह light energy capture करने में मदद करता है। इसी वजह से इसे Photosynthesis के concept में central role से जोड़कर पढ़ना चाहिए।", visual: "दो cards: 'green pigment' और 'light capture role'.", takeaway: "Term याद करने के साथ उसका function भी याद रखो।" },
      short: { opener: "Chlorophyll का असली काम क्या है?", explanation: "Short answer: light energy capture करने में मदद करना। इसी clue से पूरा concept याद रखो।", visual: "CHLOROPHYLL → LIGHT CAPTURE.", takeaway: "Function याद = term याद." },
    },
    {
      angle: "CO₂ role",
      reel: { opener: "Plant CO₂ लेता है—और यही gas food बनाने में काम आती है!", explanation: "Carbon dioxide glucose बनाने के लिए carbon source देती है। इसलिए CO₂ Photosynthesis का जरूरी raw material है।", visual: "CO₂ molecules enter leaf → glucose carbon skeleton cue.", takeaway: "CO₂ = glucose formation के लिए carbon source." },
      facebook: { opener: "CO₂ को सिर्फ 'plant की ली हुई gas' मत समझो।", explanation: "Photosynthesis में CO₂ से मिलने वाला carbon glucose के निर्माण में जाता है। इसलिए equation पढ़ते समय CO₂ को raw material की तरह पहचानना useful है।", visual: "CO₂ → carbon contribution → glucose diagram.", takeaway: "Equation में CO₂ का role = carbon input." },
      short: { opener: "CO₂ अंदर क्यों?", explanation: "क्योंकि glucose बनाने के लिए carbon चाहिए, और Photosynthesis में उसका source CO₂ है।", visual: "CO₂ → C → GLUCOSE.", takeaway: "CO₂ gives carbon." },
    },
    {
      angle: "water role",
      reel: { opener: "जड़ों से आया पानी सिर्फ plant को hydrated रखने नहीं आया!", explanation: "Water Photosynthesis का जरूरी reactant है। Roots इसे absorb करती हैं और plant tissues तक पहुँचाती हैं।", visual: "Roots → water arrows → leaf.", takeaway: "Water Photosynthesis का जरूरी input है।" },
      facebook: { opener: "अब equation का दूसरा raw material देखो—water।", explanation: "Roots soil से water absorb करती हैं। यह plant के अंदर ऊपर जाता है और Photosynthesis में reactant के रूप में शामिल होता है।", visual: "Soil → roots → xylem/upward flow → leaf.", takeaway: "Water को equation में reactant के रूप में पहचानो।" },
      short: { opener: "Water leaf तक क्यों पहुँचता है?", explanation: "क्योंकि Photosynthesis में water जरूरी reactant है। Roots इसे absorb करके ऊपर पहुँचाती हैं।", visual: "ROOTS ↑ WATER ↑ LEAF.", takeaway: "Water = required reactant." },
    },
    {
      angle: "glucose payoff",
      reel: { opener: "Food बन गया… अब plant इसे फेंकता तो नहीं!", explanation: "Photosynthesis से बना glucose plant के लिए food और energy source है। जरूरत के हिसाब से इसे starch के रूप में store भी किया जा सकता है।", visual: "Glucose → energy → starch storage.", takeaway: "Glucose = plant का usable food/energy source." },
      facebook: { opener: "Photosynthesis का result सिर्फ 'glucose बन गया' कहकर खत्म मत करो।", explanation: "Glucose plant के metabolism में उपयोग हो सकता है और अतिरिक्त carbohydrate starch के रूप में store किया जा सकता है। इससे product का actual purpose समझ आता है।", visual: "Glucose branching into energy use and starch storage.", takeaway: "Product के बाद उसका use भी याद रखो।" },
      short: { opener: "Glucose बनता है—फिर क्या?", explanation: "Plant इसे energy के लिए use कर सकता है और extra food को starch में store कर सकता है।", visual: "GLUCOSE → ENERGY / STARCH.", takeaway: "Glucose = use or storage." },
    },
    {
      angle: "oxygen mystery",
      reel: { opener: "Photosynthesis में Oxygen बाहर आती है—लेकिन आती कहाँ से?", explanation: "Photosynthesis के light-dependent reactions में water splitting होती है और oxygen release होती है।", visual: "H₂O → reaction → O₂ release cue.", takeaway: "Released O₂ को water-splitting से connect करो।" },
      facebook: { opener: "Oxygen वाली line को equation से आगे समझना है?", explanation: "School-level Photosynthesis explanation में released oxygen को light reactions के दौरान water splitting से जोड़ा जाता है। इसलिए Oxygen को CO₂ का सीधा leftover मानना सही shortcut नहीं है।", visual: "Water → light reaction → oxygen release diagram.", takeaway: "O₂ source को water-splitting से connect करके याद रखो।" },
      short: { opener: "O₂ CO₂ से निकली? रुकिए!", explanation: "Photosynthesis की light reactions में water splitting से oxygen release होती है।", visual: "H₂O → O₂ + reaction cue.", takeaway: "O₂ mystery = water splitting clue." },
    },
    {
      angle: "equation logic",
      reel: { opener: "Equation को रटने की जगह इसे एक recipe की तरह देखो!", explanation: "Carbon dioxide और water, light energy की मदद से glucose और oxygen के formation से जुड़े हैं। Inputs और outputs को अलग पहचानो।", visual: "CO₂ + H₂O + Light → Glucose + O₂, one piece at a time.", takeaway: "Inputs → process → outputs." },
      facebook: { opener: "Equation याद नहीं रहती? उसका logic याद रखो।", explanation: "Equation में left side पर raw materials और energy source हैं, जबकि right side पर products दिखते हैं। इसी structure से formula recall करना आसान होता है।", visual: "Left = inputs | Arrow = process | Right = outputs.", takeaway: "Equation को तीन हिस्सों में पढ़ो: input, process, output." },
      short: { opener: "Equation का shortcut चाहिए?", explanation: "बस तीन inputs और दो outputs याद रखो: CO₂ + water + light → glucose + oxygen.", visual: "INPUTS → PROCESS → OUTPUTS.", takeaway: "Recipe logic से equation recall करो." },
    },
    {
      angle: "ecosystem impact",
      reel: { opener: "Photosynthesis रुक जाए तो problem सिर्फ पौधे की नहीं होगी!", explanation: "Plants food production और atmospheric oxygen तथा carbon cycle से जुड़े हैं। इसलिए Photosynthesis का असर पूरे ecosystem तक जाता है।", visual: "Plant → food → oxygen → animals/humans → ecosystem.", takeaway: "Photosynthesis plant से आगे ecosystem तक जुड़ा है।" },
      facebook: { opener: "एक plant process ecosystem की इतनी बड़ी बात कैसे बन जाती है?", explanation: "Plants Photosynthesis के जरिए organic food बनाते हैं और oxygen release करते हैं। Food webs और carbon cycle में उनका role होने के कारण यह process पूरे ecosystem से जुड़ जाती है।", visual: "Producer → food chain → ecosystem loop.", takeaway: "Photosynthesis को food chain और carbon cycle से जोड़कर समझो।" },
      short: { opener: "Photosynthesis बंद—फिर क्या बदलेगा?", explanation: "Food production और ecosystem-level oxygen/carbon cycling पर असर पड़ेगा। इसलिए इसका impact plant से बहुत बड़ा है।", visual: "Plant ↓ → food web ↓ → ecosystem impact.", takeaway: "Plant process, ecosystem impact." },
    },
  ];

  return hooks.map((hook, i) => ({
    hook,
    angle: data[i].angle,
    perPlatform: {
      instagram_reel: data[i].reel,
      facebook_post: data[i].facebook,
      youtube_short: data[i].short,
    },
  }));
}

function genericAngles(topic: string): StrategyAngle[] {
  const hooks = [
    `🤯 ${topic} का सबसे surprising point आखिर क्या है?`,
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
  const angles = ["surprise reveal", "what-if", "hidden detail", "challenge", "mistake bust", "real-life analogy", "exam trigger", "why-first", "diagram decoding", "one-minute summary"];

  return hooks.map((hook, i) => ({
    hook,
    angle: angles[i],
    perPlatform: {
      instagram_reel: {
        opener: ["पहले एक twist देखो.", "एक सेकंड—ये point miss मत करना.", "जो दिख रहा है, कहानी उससे थोड़ी अलग है.", "इस term का असली काम सुनो.", "यहाँ सबसे common गलती होती है.", "इसे रोजमर्रा की चीज से जोड़ो.", "Exam में यही clue काम आएगा.", "Definition बाद में—पहले reason समझो.", "Diagram को decode करते हैं.", "एक मिनट में पूरा idea समेटते हैं."][i],
        explanation: `${topic} को ${angles[i]} के तरीके से समझो: पहले viewer की सोच को challenge करो, फिर concept का clear meaning दो।`,
        visual: `${topic} के लिए एक तेज, साफ visual बनाओ जो पहले सवाल और फिर answer दिखाए।`,
        takeaway: `${topic}: पहले idea समझो, फिर definition याद करो।`,
      },
      facebook_post: {
        opener: ["इस सवाल का जवाब थोड़ा detail में समझते हैं.", "अब इसका importance step-by-step देखते हैं.", "इस छोटी detail का context समझना जरूरी है.", "खुद को 20-second challenge दो, फिर answer compare करो.", "पहले common mistake देखें, फिर सही concept.", "इसे रोजमर्रा की example से जोड़कर देखें.", "Exam point of view से इसका एक keyword पकड़ो.", "पहले 'क्यों', फिर 'कैसे' समझते हैं.", "Diagram को relationships के साथ पढ़ते हैं.", "पूरे topic को core idea में compress करते हैं."][i],
        explanation: `${topic} को ${angles[i]} से खोलते हुए एक step-by-step explanation दो, फिर बताओ कि यह concept बाकी chapter से कैसे जुड़ता है।`,
        visual: `${topic} का labelled diagram या comparison card इस्तेमाल करो।`,
        takeaway: `${topic} को अपने शब्दों में समझा पाना सबसे अच्छा revision check है।`,
      },
      youtube_short: {
        opener: ["3 सेकंड—twist सुनो.", "रुको—पहले ये सोचो.", "एक hidden detail है.", "Keyword पकड़ो.", "सबसे common mistake यही है.", "एक example से समझो.", "Exam recall के लिए एक clue.", "WHY से शुरू करते हैं.", "एक diagram, पूरा idea.", "Fast revision mode on."][i],
        explanation: `${topic} का ${angles[i]} angle लो, एक quick reveal दो और फिर एक ही core idea में answer बंद करो।`,
        visual: `पहले question, फिर 1-step reveal और अंत में एक-line takeaway दिखाओ।`,
        takeaway: `${topic} = core idea + one useful clue.`,
      },
    },
  }));
}

function getAngles(topic: string): StrategyAngle[] {
  return /photosynthesis|प्रकाश संश्लेषण/i.test(topic) ? photosynthesisAngles() : genericAngles(topic);
}

function buildPiece(platform: Platform, pieceNumber: number, topic: string, angle: StrategyAngle, platformOffset: number): ContentPiece {
  const view = angle.perPlatform[platform];
  const websiteLine = pickWebsiteMention(topic, pieceNumber + platformOffset);
  const ctaVariants: Record<Platform, string[]> = {
    instagram_reel: [
      "Save करो और अगली revision में इसे फिर देख लेना.",
      "अगर ये twist useful लगा, तो ऐसे concepts के लिए follow करो.",
      "इसे save कर लो—exam से पहले काम आएगा.",
      "ऐसे एक और concept के लिए follow कर लेना.",
      "Concept clear हुआ? Save करके रख लो.",
      "Revision list में इसे भी add कर लो.",
      "अगला concept भी इसी तरह समझेंगे—follow कर लो.",
      "एक बार save, फिर exam time पर quick revision.",
      "अगर नया angle पसंद आया, तो ऐसे explainers के लिए follow करो.",
      "इस सवाल को याद रखो—यही concept खोलता है.",
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
      "अगर 20-second explanation useful लगी, तो subscribe कर लो.",
      "Exam से पहले इसे फिर देखना हो तो save कर लो.",
      "ऐसे fast concept breakdowns के लिए subscribe करो.",
      "एक और concept ऐसे ही decode करेंगे—subscribe कर लो.",
      "इस one-line takeaway को save कर लो.",
      "अगर answer clear हुआ, तो इसे revision list में रख लो.",
      "Quick revision पसंद है? ऐसे explainers के लिए subscribe करो.",
      "बस यही clue याद रखो और आगे बढ़ो—save कर लेना.",
    ],
  };
  const platformClose = ctaVariants[platform][pieceNumber - 1];

  const bodyParts = [
    `🔥 Hook: ${angle.hook}`,
    `🎙️ Hindi Voice-over: ${view.opener} ${view.explanation}`,
    `👀 Visual/Presentation: ${view.visual}`,
    `🧠 Takeaway: ${view.takeaway}`,
    websiteLine ? `🌐 ${websiteLine}` : null,
    `👉 CTA: ${platformClose}`,
  ].filter(Boolean);

  return {
    platform,
    piece_number: pieceNumber,
    title: angle.hook,
    body: bodyParts.join("\n\n"),
    hashtags: [
      "#Education",
      "#ConceptClarity",
      /photosynthesis|प्रकाश संश्लेषण/i.test(topic) ? "#Photosynthesis" : "#StudyConcepts",
      platform === "instagram_reel" ? "#ReelsEducation" : platform === "facebook_post" ? "#StudyDiscussion" : "#ShortsEducation",
    ],
    cta: platformClose,
    core_question_id: pieceNumber,
    explanation_angle: PLATFORM_ANGLES[platform][pieceNumber - 1],
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
