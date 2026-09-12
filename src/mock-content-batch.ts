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
