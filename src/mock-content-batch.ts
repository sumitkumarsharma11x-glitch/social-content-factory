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

  const openers = {
    instagram_reel: [
      "एक सेकंड—पहले इसका answer guess करो.",
      "अब उल्टा सोचो—अगर ये रहे ही नहीं तो?",
      "यहीं एक छोटी detail पूरा picture बदल देती है.",
      "चलो 20-second challenge करते हैं.",
      "इस topic में एक गलती बहुत आसानी से हो सकती है.",
      "इसे रोजमर्रा की एक चीज से जोड़कर देखो.",
      "Exam वाला सवाल हो तो एक clue पकड़ो.",
      "Definition छोड़ो—पहले पूछो, ऐसा क्यों होता है?",
      "एक diagram से पूरा idea पकड़ते हैं.",
      "पूरे topic को एक minute में compress करते हैं.",
    ],
    facebook_post: [
      "यह सवाल सुनते ही एक common assumption दिमाग में आता है.",
      "अब एक what-if सोचो—अगर ये न रहे तो?",
      "पूरे topic की clarity कभी-कभी एक छोटी detail से आती है.",
      "चलो देखते हैं, तुम इसे अपने शब्दों में कैसे समझाओगे.",
      "यहाँ एक common confusion को साफ करना जरूरी है.",
      "अब इसे real life की एक familiar situation से जोड़ो.",
      "Exam में यही concept अलग wording में आ सकता है.",
      "इस बार definition से शुरुआत नहीं करेंगे.",
      "एक diagram को पढ़ने का आसान तरीका देखते हैं.",
      "पूरे topic को एक compact revision card में रखते हैं.",
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
      "One-minute नहीं—one-line revision!",
    ],
  } as const;

  return hooks.map((hook, i) => ({
    hook,
    angle: angles[i],
    perPlatform: {
      instagram_reel: {
        opener: openers.instagram_reel[i],
        explanation: [
          `${topic} को देखकर सबसे पहले उसका actual role समझो: यही role बाकी concept को जोड़ता है और बताता है कि यह क्यों जरूरी है।`,
          `अगर ${topic} मौजूद न हो, तो उससे जुड़ा process या result भी बदल जाएगा। इसी difference से इसकी importance साफ होती है।`,
          `${topic} की एक key detail बाकी information को सही context देती है। वही छोटा link समझ में आ जाए, तो पूरा concept ज्यादा clear लगता है।`,
          `${topic} को अपने शब्दों में purpose और basic working के साथ बताना ही असली test है। यही बताता है कि concept सिर्फ याद हुआ है या समझ भी आया है।`,
          `${topic} का नाम याद होना और उसका actual function समझना अलग बातें हैं। अक्सर confusion इसी छोटे difference से पैदा होता है।`,
          `${topic} को किसी familiar situation से जोड़ो, तो abstract idea एक concrete picture जैसा लगने लगता है।`,
          `${topic} वाले सवाल में key word पकड़ना answer की direction जल्दी clear कर देता है। Wording बदल सकती है, core idea नहीं।`,
          `${topic} के पीछे का reason समझ आ जाए, तो उसके facts को अलग-अलग रटने की जरूरत कम पड़ती है।`,
          `${topic} के diagram में labels से ज्यादा उनके connections important होते हैं। Relationship समझते ही picture का meaning खुल जाता है।`,
          `${topic} को core idea, दो जरूरी points और एक example में समेटो। यही structure fast revision में सबसे useful रहता है।`,
        ][i],
        visual: [
          `${topic} का नाम → उसका role → short result animation.`,
          `Normal state → ${topic} absent → changed result comparison.`,
          `Key detail पर zoom → उससे जुड़े concept का wider view.`,
          `3-second countdown → viewer prompt → compact answer card.`,
          `❌ Common confusion → correction → ✅ clear concept.`,
          `Everyday situation → ${topic} से visual connection.`,
          `Sample exam question → keyword highlight → answer clue.`,
          `WHY → HOW → RESULT का short flow.`,
          `${topic} का clean diagram → arrows → final relationship highlight.`,
          `1 core idea + 2 key points + 1 example summary card.`,
        ][i],
        takeaway: [
          `${topic} को definition से पहले उसका role समझकर याद रखो.`,
          `Importance का shortcut: सोचो, ${topic} के बिना क्या बदलेगा.`,
          `Key detail को context से जोड़ना concept clarity बढ़ाता है.`,
          `अपने शब्दों में explain कर पाना real understanding का अच्छा test है.`,
          `Definition और function को एक ही चीज मत समझो.`,
          `Example concept को याद रखने का bridge बन सकता है.`,
          `Exam में keyword → concept → answer की chain याद रखो.`,
          `“क्यों” समझ आ जाए तो “क्या” याद रखना आसान हो जाता है.`,
          `Diagram को picture नहीं, concept का map समझो.`,
          `Fast revision: core idea → key points → example.`,
        ][i],
      },
      facebook_post: {
        opener: openers.facebook_post[i],
        explanation: [
          `${topic} को सिर्फ textbook definition तक सीमित करने के बजाय उसके role और बाकी concepts से connection के साथ देखना ज्यादा useful है। इससे यह समझ आता है कि topic practical या chapter-level context में क्यों important है।`,
          `अगर ${topic} अचानक हट जाए, तो उससे जुड़ी प्रक्रिया का outcome बदल जाएगा। यह hypothetical situation हमें इसके function और importance दोनों को समझने का आसान रास्ता देती है।`,
          `${topic} के भीतर मौजूद key detail को बाकी information से जोड़कर देखना जरूरी है। Context मिलने पर वही detail एक isolated fact नहीं रहती, बल्कि पूरे concept का हिस्सा बन जाती है।`,
          `${topic} को अपने शब्दों में समझाने के लिए purpose, basic working और result का क्रम बहुत natural रहता है। इस तरह definition याद करने के बजाय concept की पूरी chain समझ आती है।`,
          `${topic} में common confusion अक्सर definition और function को मिला देने से होती है। दोनों को अलग करके देखने पर सही concept और गलत assumption का फर्क साफ हो जाता है।`,
          `${topic} को real-life situation से जोड़ने पर उसका abstract हिस्सा ज्यादा concrete हो जाता है। Familiar example पहले से known picture देता है, और वही picture concept को recall करने में मदद करती है।`,
          `${topic} का exam question wording बदलकर भी आ सकता है। इसलिए exact sentence याद करने के बजाय key word और उसके पीछे का concept पहचानना ज्यादा मजबूत strategy है।`,
          `${topic} को समझने का एक मजबूत तरीका है पहले उसका reason देखना, फिर working और आखिर में result जोड़ना। यह sequence अलग-अलग facts को एक logical chain में बदल देता है।`,
          `${topic} के diagram में हर label को अलग fact मानने के बजाय arrows और relationships पढ़ना ज्यादा useful है। इससे diagram का overall meaning एक साथ समझ आता है।`,
          `${topic} की compact revision में core idea, दो supporting points और एक relatable example काफी strong structure देते हैं। इससे last-minute recall के समय पूरा topic जल्दी reconstruct हो सकता है।`,
        ][i],
        visual: [
          `${topic} का concept map: role → related ideas → result.`,
          `Before/after comparison में ${topic} present और absent cases.`,
          `Key detail → related idea → overall concept का zoom-out.`,
          `Purpose → Working → Result की three-part card.`,
          `Common confusion और correct understanding के दो cards.`,
          `Everyday example → ${topic} concept का visual bridge.`,
          `एक concept पर दो exam-style questions और common keyword highlight.`,
          `WHY → HOW → RESULT connected cards.`,
          `${topic} का labelled diagram, arrows के साथ relationship highlights.`,
          `Core idea + 2 supporting points + example वाला revision card.`,
        ][i],
        takeaway: [
          `Concept को definition + role + connection के साथ समझो.`,
          `Importance समझने के लिए “इसके बिना क्या होगा?” पूछो.`,
          `Key detail को context से जोड़ना concept clarity बढ़ाता है.`,
          `अपनी भाषा में explain कर पाना real understanding का अच्छा संकेत है.`,
          `Definition और function को अलग-अलग पहचानो.`,
          `Example concept को याद रखने का bridge बन सकता है.`,
          `Question की wording नहीं, core keyword और concept पहचानो.`,
          `Reason से result तक की chain concept को मजबूत बनाती है.`,
          `Diagram में labels से ज्यादा relationships पर ध्यान दो.`,
          `Revision structure: core idea → support → example.`,
        ][i],
      },
      youtube_short: {
        opener: openers.youtube_short[i],
        explanation: [
          `असल clue ${topic} के role में छिपा है। इसका काम समझते ही बाकी concept connect होने लगता है।`,
          `अगर ${topic} न हो, तो उससे जुड़ा result बदल जाएगा। यही इसकी importance का fastest clue है।`,
          `${topic} की key detail बाकी information को context देती है। वही missing link पकड़ो और concept clear हो जाता है।`,
          `${topic} को अपने words में purpose और working के साथ बताना ही real test है।`,
          `${topic} का नाम और उसका function एक चीज नहीं हैं। यही छोटा difference common confusion बनता है।`,
          `${topic} को familiar example से जोड़ते ही abstract idea ज्यादा concrete लगने लगता है।`,
          `${topic} के सवाल में keyword answer की direction बताता है। Wording बदले, concept नहीं।`,
          `${topic} का reason समझो, फिर उसका result याद रखना आसान हो जाएगा।`,
          `${topic} के parts से ज्यादा उनके बीच का connection देखो। वही diagram का core message है।`,
          `${topic} को पहले core idea में compress करो; बाकी points उसी से जोड़ दो।`,
        ][i],
        visual: [
          `Question → role reveal → result.`,
          `${topic} ON → normal result; ${topic} OFF → changed result.`,
          `Key detail zoom → concept unlock.`,
          `3…2…1 → answer reveal.`,
          `❌ Confusion → ⚡ correction → ✅ concept.`,
          `Real-life example → ${topic} concept.`,
          `Question → keyword highlight → answer clue.`,
          `WHY → HOW → RESULT, three fast beats.`,
          `One diagram → arrows flash → final connection.`,
          `Core idea card → two supporting clues.`,
        ][i],
        takeaway: [
          `${topic} = नाम नहीं, उसका role याद रखो.`,
          `Without it क्या बदलेगा—यही importance clue है.`,
          `Key detail = concept का missing link.`,
          `Own words में explain = concept clear.`,
          `Name नहीं, function याद रखो.`,
          `Example याद = concept recall आसान.`,
          `Keyword → concept → answer.`,
          `Why समझो, फिर what याद रहेगा.`,
          `Diagram = relationships का map.`,
          `Core idea पकड़ो, बाकी points जुड़ जाएंगे.`,
        ][i],
      },
    },
  }));
}


const PLATFORM_ANGLES: Record<Platform, readonly string[]> = {
  instagram_reel: [
    "role-first reveal", "what-if visual contrast", "hidden-detail zoom", "challenge-led explanation",
    "common-mistake correction", "real-life analogy", "exam-keyword trigger", "why-before-how",
    "diagram relationship decode", "compressed revision",
  ],
  facebook_post: [
    "context-and-role breakdown", "hypothetical consequence analysis", "detail-to-context explanation", "purpose-to-result chain",
    "confusion-vs-function clarification", "everyday example walkthrough", "exam wording strategy", "reasoning chain",
    "diagram relationship walkthrough", "revision-card synthesis",
  ],
  youtube_short: [
    "instant role clue", "fast consequence reveal", "missing-link reveal", "countdown challenge",
    "confusion snap-correction", "familiar-example shortcut", "keyword-to-answer shortcut", "reason-first shortcut",
    "relationship-first diagram flash", "one-line compression",
  ],
};

function photosynthesisAngles(topic: string): StrategyAngle[] {
  const questions = [
    `🌿 पौधे photosynthesis में sunlight का इस्तेमाल आखिर किस काम के लिए करते हैं?`,
    `☀️ अगर photosynthesis में sunlight ही न मिले, तो सबसे पहले क्या बदलेगा?`,
    `🔬 Photosynthesis में chlorophyll की छोटी-सी detail इतनी important क्यों है?`,
    `🧠 क्या तुम photosynthesis की basic process को 20 seconds में समझा सकते हो?`,
    `❌ Photosynthesis में सबसे common confusion—food बनता कहाँ है और oxygen आती कहाँ से है?`,
    `🍃 Photosynthesis को kitchen में खाना बनाने की process जैसा क्यों समझ सकते हैं?`,
    `🎯 Exam में photosynthesis का सवाल आए तो कौन-से keywords answer की direction बताते हैं?`,
    `🤔 Photosynthesis में carbon dioxide और water की जरूरत आखिर क्यों पड़ती है?`,
    `👀 Photosynthesis के diagram में arrows देखकर पूरा process कैसे decode करें?`,
    `🔥 Photosynthesis को सिर्फ 3 points में revise करना हो, तो क्या याद रखना चाहिए?`,
  ];

  const reelExplanations = [
    `Sunlight energy देती है, और plant उसी energy की मदद से photosynthesis की process चलाता है। यानी sunlight सिर्फ रोशनी नहीं—process के लिए energy source है।`,
    `Sunlight हटते ही photosynthesis की energy supply रुक जाती है। इसलिए food बनाने वाली process प्रभावित होती है और यही सबसे सीधा consequence है।`,
    `Chlorophyll light energy को capture करने में मदद करता है। इसी वजह से leaf का यह pigment photosynthesis की पूरी story में central role रखता है।`,
    `Photosynthesis को simple chain की तरह बोलो: light energy + carbon dioxide + water → glucose, और oxygen release होती है।`,
    `Plant glucose बनाता है, जबकि oxygen photosynthesis के दौरान release होती है। Food और released oxygen को एक ही चीज समझना common mistake है।`,
    `Kitchen में ingredients और heat मिलकर खाना बनाते हैं; photosynthesis में raw materials और light energy मिलकर glucose बनाने की process को चलाते हैं।`,
    `Question में sunlight, chlorophyll, carbon dioxide, water, glucose या oxygen जैसे keywords दिखें, तो तुरंत photosynthesis की process वाली chain याद करो।`,
    `Carbon dioxide और water raw materials हैं। Plant इन्हें light energy की मदद से glucose बनाने वाली process में इस्तेमाल करता है।`,
    `Diagram में arrows को follow करो: inputs अंदर, process के बीच में, और glucose तथा oxygen जैसे outputs बाहर। Flow समझते ही diagram आसान हो जाता है।`,
    `तीन चीजें पकड़ो: light energy, raw materials और glucose formation. साथ में याद रखो कि oxygen release होती है—बस इतना fast revision के लिए काफी strong anchor है।`,
  ];
  const fbExplanations = [
    `Photosynthesis में sunlight का सबसे important role energy provide करना है। Plant इस light energy का उपयोग carbon dioxide और water जैसे raw materials से glucose बनाने वाली process में करता है।`,
    `अगर sunlight उपलब्ध न हो, तो photosynthesis के लिए जरूरी light energy नहीं मिलेगी। इससे glucose बनाने की process प्रभावित होगी; यही hypothetical change इस concept की importance समझाता है।`,
    `Chlorophyll leaf में light energy capture करने में मदद करता है। इसलिए इसे केवल “leaf का green pigment” याद करना अधूरा है—उसका functional role समझना ज्यादा useful है।`,
    `Photosynthesis को purpose → inputs → process → outputs की chain में समझना आसान है। Light energy के साथ carbon dioxide और water इस्तेमाल होते हैं, glucose बनता है और oxygen release होती है।`,
    `एक common confusion यह है कि glucose और oxygen दोनों को “food” समझ लिया जाए। Glucose plant का बना हुआ food है, जबकि oxygen photosynthesis में release होने वाला product है।`,
    `Kitchen analogy में sunlight को cooking energy और carbon dioxide तथा water को ingredients की तरह सोच सकते हैं। इससे abstract biochemical process को familiar picture में बदला जा सकता है।`,
    `Exam wording बदल सकती है, लेकिन keywords clues देते हैं। अगर question में chlorophyll, sunlight, CO₂, water, glucose या oxygen का relation पूछा गया है, तो process की core chain पहचानो।`,
    `Carbon dioxide carbon source देता है और water भी process का essential raw material है। Light energy इस system को चलाने में मदद करती है, जिससे glucose formation समझ में आती है।`,
    `Photosynthesis diagram को labels की list की तरह न पढ़ें। पहले arrows से inputs और outputs पहचानें, फिर बीच की process को connect करें—यही diagram का logical structure है।`,
    `Last-minute revision के लिए तीन anchors काफी हैं: light energy, CO₂ + water inputs, और glucose + oxygen outputs. इनके बीच का relation याद रहेगा तो पूरा concept reconstruct किया जा सकता है।`,
  ];
  const ytExplanations = [
    `Sunlight = energy clue. Plant इसी energy से photosynthesis की process चलाकर glucose बनाने में मदद करता है।`,
    `Sunlight हटाओ, energy source हट गया—और photosynthesis की food-making process प्रभावित हो जाएगी।`,
    `Chlorophyll का fast clue: यह light energy capture करने में मदद करता है।`,
    `20-second chain: light energy + CO₂ + water → glucose; oxygen release होती है।`,
    `Glucose = plant food. Oxygen = released product. दोनों को mix मत करना।`,
    `Kitchen shortcut: ingredients + energy → result. Photosynthesis में result glucose है।`,
    `Exam clue: sunlight, chlorophyll, CO₂, water, glucose, oxygen—इनका relation दिखे तो photosynthesis पकड़ो।`,
    `CO₂ + water raw materials हैं; light energy process को drive करती है और glucose formation होती है।`,
    `Diagram shortcut: arrows follow करो—inputs → process → outputs.`,
    `One-line recall: light energy + raw materials → glucose, with oxygen release.`,
  ];
  const reelVisuals = [
    `Sun icon → leaf → energy arrows → glucose card.`,
    `Sun OFF → energy meter drops → glucose-making process slows/stops visual.`,
    `Leaf zoom → chlorophyll highlight → light rays captured.`,
    `20-second timer → CO₂ + H₂O + light → glucose + O₂ animation.`,
    `Glucose card vs oxygen card → labels corrected with a quick X/✓.`,
    `Kitchen ingredients + heat → cut to leaf with inputs + light.`,
    `Exam question → keyword flash → photosynthesis chain reveal.`,
    `CO₂ + H₂O cards → light beam → glucose output.`,
    `Simple leaf diagram → arrows animate from inputs to outputs.`,
    `3-anchor card: light → inputs → glucose/O₂.`,
  ];
  const fbVisuals = [
    `Concept map: sunlight energy → photosynthesis → glucose formation.`,
    `Two-panel before/after: sunlight available vs unavailable.`,
    `Leaf cross-section → chlorophyll label → light capture explanation.`,
    `Four cards: purpose → inputs → process → outputs.`,
    `Common confusion card: glucose vs oxygen, followed by correction card.`,
    `Kitchen scene → ingredients/energy labels → photosynthesis parallel.`,
    `Two exam-style wordings → shared keywords highlighted.`,
    `CO₂ + water + light connected to glucose formation with arrows.`,
    `Labelled photosynthesis diagram with arrows and input/output grouping.`,
    `Revision card: light energy + inputs + outputs.`,
  ];
  const ytVisuals = [
    `Sun → leaf → glucose, in three fast beats.`,
    `Sun ON/OFF split screen → immediate consequence reveal.`,
    `Chlorophyll zoom → light ray capture flash.`,
    `3…2…1 → equation-style answer reveal.`,
    `Glucose ≠ oxygen → instant correction flash.`,
    `Kitchen heat + ingredients → leaf process cut.`,
    `Keyword flash → answer direction → reveal.`,
    `CO₂ + H₂O → light → glucose, rapid flow.`,
    `One diagram → arrows flash → outputs highlighted.`,
    `Three words on screen: light → inputs → glucose/O₂.`,
  ];
  const reelTakeaways = [
    `Sunlight का role = photosynthesis के लिए energy source.`,
    `Sunlight हटे → photosynthesis की energy supply प्रभावित.`,
    `Chlorophyll = light energy capture करने वाला key pigment.`,
    `Light + CO₂ + water → glucose; oxygen release.`,
    `Glucose food है; oxygen released product है.`,
    `Ingredients + energy वाली analogy से process याद रखो.`,
    `Keyword पकड़ो, फिर photosynthesis की core chain recall करो.`,
    `CO₂ और water raw materials हैं; light energy process को drive करती है.`,
    `Diagram में arrows = inputs और outputs का logic.`,
    `Fast recall: light → raw materials → glucose + oxygen release.`,
  ];
  const fbTakeaways = [
    `Sunlight को सिर्फ light नहीं, photosynthesis की energy source समझो.`,
    `Without sunlight, photosynthesis की energy-dependent process प्रभावित होती है.`,
    `Chlorophyll का function याद रखो: light energy capture में मदद.`,
    `Purpose → inputs → process → outputs की chain बनाओ.`,
    `Glucose और oxygen का role अलग-अलग पहचानो.`,
    `Analogy concept को concrete बनाती है, definition को replace नहीं करती.`,
    `Exam में wording नहीं, relevant keywords और उनका relation पकड़ो.`,
    `CO₂ + water inputs हैं; light energy के साथ glucose formation समझो.`,
    `Diagram को arrows और relationships से पढ़ो.`,
    `Revision anchor: light energy + inputs + outputs.`,
  ];
  const ytTakeaways = [
    `Sunlight = energy clue.`,
    `No sunlight → photosynthesis affected.`,
    `Chlorophyll = light-capture clue.`,
    `Light + CO₂ + water → glucose; O₂ release.`,
    `Glucose ≠ released oxygen.`,
    `Ingredients + energy = easy mental model.`,
    `Keyword → process → answer.`,
    `CO₂ + water + light → glucose.`,
    `Arrows बताएं: inputs → process → outputs.`,
    `Light → inputs → glucose + O₂ release.`,
  ];
  const openers = {
    instagram_reel: [
      `पहले guess करो—sunlight यहाँ क्या कर रही है?`, `एक twist: sunlight गायब हो जाए तो?`, `Leaf के अंदर एक छोटा hero है—chlorophyll.`, `20-second challenge—process बोलकर दिखाओ.`, `एक common mistake अभी clear करते हैं.`, `इसे kitchen की तरह सोचो.`, `Exam clue चाहिए? keywords पकड़ो.`, `पहले पूछो—CO₂ और water क्यों चाहिए?`, `Diagram को arrows से पढ़ते हैं.`, `तीन anchors में पूरा concept.`,
    ],
    facebook_post: [
      `Photosynthesis को समझने का सबसे आसान starting point sunlight का role है.`, `एक simple what-if इस concept को तुरंत clear करता है.`, `यहाँ chlorophyll को सिर्फ “green pigment” कहना अधूरा है.`, `पूरी process को एक logical chain में रखते हैं.`, `पहले एक common confusion साफ कर लेते हैं.`, `अब इसे kitchen की familiar situation से जोड़ते हैं.`, `Exam में wording बदल सकती है, clues नहीं.`, `Definition से पहले inputs की जरूरत समझो.`, `Diagram में labels से ज्यादा relationships देखो.`, `Last-minute revision के लिए तीन anchors काफी हैं.`,
    ],
    youtube_short: [
      `रुको—sunlight का असली काम क्या है?`, `Sunlight हटाओ—क्या बदलेगा?`, `Chlorophyll का fast clue सुनो.`, `20 seconds. पूरी process. Ready?`, `Glucose और oxygen—same नहीं हैं!`, `Kitchen shortcut से समझो.`, `Exam keyword flash!`, `CO₂ और water क्यों?`, `Diagram का fastest shortcut.`, `Three-word revision!`,
    ],
  } as const;

  return questions.map((hook, i) => ({
    hook: hook.replace(/^\S+\s*/, ""),
    angle: ["energy role", "sunlight dependency", "chlorophyll function", "process chain", "product distinction", "analogy", "exam keywords", "raw-material role", "diagram flow", "revision anchors"][i],
    perPlatform: {
      instagram_reel: { opener: openers.instagram_reel[i], explanation: reelExplanations[i], visual: reelVisuals[i], takeaway: reelTakeaways[i] },
      facebook_post: { opener: openers.facebook_post[i], explanation: fbExplanations[i], visual: fbVisuals[i], takeaway: fbTakeaways[i] },
      youtube_short: { opener: openers.youtube_short[i], explanation: ytExplanations[i], visual: ytVisuals[i], takeaway: ytTakeaways[i] },
    },
  }));
}

function getAngles(topic: string): StrategyAngle[] {
  return /photosynthesis|प्रकाश संश्लेषण/i.test(topic) ? photosynthesisAngles(topic) : genericAngles(topic);
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
