/**
 * Content Strategy Mock
 * ----------------------
 * Offline deterministic generator used to test the CONTENT STRATEGY,
 * not just the API pipeline. It produces exactly 30 pieces with:
 *   - curiosity-driven questions/hooks
 *   - Hindi voice-over style copy
 *   - the same core question reused across platforms when appropriate
 *   - a different explanation angle for every piece
 *   - visual direction and a natural website approach
 *
 * The public schema is intentionally unchanged for this MVP. Rich fields
 * are embedded in `body` so existing persistence/review UI keeps working.
 */

import { PLATFORMS, PIECES_PER_PLATFORM, type ContentBatch, type ContentPiece, type Platform } from "./content-schema";

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram_reel: "Instagram Reel",
  facebook_post: "Facebook Post",
  youtube_short: "YouTube Short",
};

const WEBSITE_CTA = "ऐसे concepts को सिर्फ रटने के बजाय समझना चाहते हो? हमारी website पर chapter-wise आसान explanation और revision content देखो.";

function extractTopic(prompt: string): string {
  const match = prompt.match(/Topic\/Chapter:\s*"([^"]+)"/i);
  if (match?.[1]?.trim()) return match[1].trim();
  return prompt.trim() || "your topic";
}

interface StrategyAngle {
  hook: string;
  angle: string;
  explanation: string;
  visual: string;
  takeaway: string;
}

function genericAngles(topic: string): StrategyAngle[] {
  return [
    { hook: `🤯 ${topic} को एक ऐसे सवाल से समझो जिसका जवाब शायद तुमने कभी नहीं सोचा होगा—आखिर इसका असली काम क्या है?`, angle: "surprise reveal", explanation: `पहले common assumption पकड़ो, फिर बताओ कि ${topic} वास्तव में किस काम आता है। जवाब सीधे देने के बजाय पहले एक छोटा reveal दो।`, visual: `${topic} का simple before → after visual दिखाओ।`, takeaway: `एक line में याद रखो: ${topic} को समझने के लिए उसका purpose पहले समझो।` },
    { hook: `❓ अगर ${topic} अचानक गायब हो जाए, तो सबसे पहले क्या बदलेगा?`, angle: "what-if scenario", explanation: `एक imaginary situation से शुरुआत करो और फिर बताओ कि ${topic} की भूमिका क्यों जरूरी है।`, visual: `Normal situation → ${topic} removed → result वाला 3-step visual।`, takeaway: `किसी concept की importance समझने का आसान तरीका है पूछना—इसके बिना क्या होगा?` },
    { hook: `😱 ${topic} में ऐसी कौन-सी छोटी चीज है जो पूरा concept बदल देती है?`, angle: "hidden detail", explanation: `एक छोटा लेकिन महत्वपूर्ण term चुनो और दिखाओ कि उसे समझने से पूरा chapter कैसे clear होता है।`, visual: `Concept के diagram में उस key term को zoom करके highlight करो।`, takeaway: `छोटी detail को ignore मत करो—कई exam questions वहीं से बनते हैं।` },
    { hook: `🧠 क्या तुम ${topic} को बिना textbook देखे 20 seconds में समझा सकते हो?`, angle: "challenge", explanation: `पहले viewer को सोचने दो, फिर ideal short explanation दो जिसमें definition से ज्यादा meaning पर जोर हो।`, visual: `Countdown 3…2…1 → answer reveal।`, takeaway: `अगर concept अपने शब्दों में समझा सकते हो, तो सिर्फ याद नहीं किया—समझा है।` },
    { hook: `🔍 ${topic} को समझते समय सबसे common गलती आखिर होती कहाँ है?`, angle: "mistake bust", explanation: `पहले गलत version बताओ, फिर correct concept समझाओ और दोनों के बीच एक साफ difference दिखाओ।`, visual: `❌ Common mistake → ✅ Correct idea।`, takeaway: `Revision में सिर्फ सही answer नहीं, गलत सोच भी पहचानो।` },
    { hook: `⚡ ${topic} को एक real-life example से समझें तो क्या ये अचानक आसान हो जाता है?`, angle: "real-life analogy", explanation: `Concept को रोजमर्रा की किसी familiar situation से जोड़ो, फिर analogy को actual science/fact से connect करो।`, visual: `Everyday example → arrow → textbook concept।`, takeaway: `जब concept को life से जोड़ते हो, तो याद रखना आसान हो जाता है।` },
    { hook: `🎯 Exam में ${topic} का सवाल आया तो सबसे पहले दिमाग में क्या आना चाहिए?`, angle: "exam trigger", explanation: `एक keyword trigger दो, फिर बताओ कि उस keyword से answer की पूरी direction कैसे याद आती है।`, visual: `Exam question → keyword circle → answer path।`, takeaway: `Exam trick: पहले keyword पहचानो, फिर concept recall करो।` },
    { hook: `🤔 ${topic} का “क्या” तो सब बताते हैं—लेकिन “क्यों” कोई क्यों नहीं बताता?`, angle: "why-first explanation", explanation: `Definition से पहले कारण बताओ। फिर उसी कारण से process या concept को logically derive करो।`, visual: `WHY → HOW → RESULT flowchart।`, takeaway: `“क्यों” समझ आ गया तो “क्या” याद रखना बहुत आसान हो जाता है।` },
    { hook: `👀 सिर्फ एक diagram देखकर क्या ${topic} पूरा समझा जा सकता है?`, angle: "visual decoding", explanation: `Diagram के हर हिस्से को अलग-अलग पढ़ने के बजाय arrows और relationships के जरिए पूरा concept decode करो।`, visual: `One clean labelled diagram with animated arrows।`, takeaway: `Diagram को picture नहीं, information का map समझो।` },
    { hook: `🔥 ${topic} का सबसे important point सिर्फ एक रखना हो, तो तुम क्या चुनोगे?`, angle: "one-minute summary", explanation: `पूरे topic को एक core idea, दो supporting points और एक example में compress करके समझाओ।`, visual: `1 core idea + 2 points + 1 example card।`, takeaway: `Fast revision formula: core idea → key points → example।` },
  ];
}

function photosynthesisAngles(): StrategyAngle[] {
  const hooks = [
    "🌱 पौधे खाते कुछ नहीं… फिर उनका खाना बनता कैसे है?",
    "☀️ पौधे के लिए सूरज की रोशनी सिर्फ रोशनी है… या कुछ और भी?",
    "😮 पत्ती हरी ही क्यों दिखाई देती है—इसके पीछे कोई secret है?",
    "🤯 Chlorophyll आखिर करता क्या है कि पूरी process चल पड़ती है?",
    "🌬️ पौधा CO₂ लेता है… लेकिन आखिर उसे इसकी जरूरत क्यों पड़ती है?",
    "💧 जो पानी पौधे की जड़ों से आता है, उसका Photosynthesis में क्या काम है?",
    "🧪 Glucose बन गया… अब पौधा इसका करता क्या है?",
    "🌍 पौधे Oxygen छोड़ते हैं—लेकिन Photosynthesis में ये Oxygen आती कहाँ से है?",
    "🧠 Photosynthesis की equation देखकर डर लगता है? इसे logic से समझो, रटो मत।",
    "🚨 अगर Photosynthesis रुक जाए, तो क्या सिर्फ पौधों पर असर पड़ेगा?",
  ];
  const explanations = [
    "Photosynthesis में पौधा sunlight की energy, carbon dioxide और water की मदद से glucose बनाता है। यानी पौधे का ‘food-making system’ उसकी अपनी cells में चलता है।",
    "Sunlight Photosynthesis को energy देती है। पौधा light energy को chemical energy में बदलकर glucose बनाने की दिशा में इस्तेमाल करता है।",
    "पत्ती का हरा रंग मुख्यतः Chlorophyll pigment की वजह से होता है। यही pigment light energy को capture करने में महत्वपूर्ण भूमिका निभाता है।",
    "Chlorophyll Photosynthesis का एक key pigment है। यह chloroplasts में मौजूद होता है और light energy को capture करने में मदद करता है।",
    "Carbon dioxide पौधे को carbon देता है, जिसका उपयोग glucose बनाने में होता है। इसलिए CO₂ सिर्फ बाहर से आने वाली gas नहीं, raw material का हिस्सा है।",
    "Water roots से absorb होकर plant tissues तक पहुँचता है। Photosynthesis में water reactants में शामिल है और process के लिए जरूरी raw material देता है।",
    "Glucose Photosynthesis का मुख्य product है। पौधा इसे energy के लिए उपयोग कर सकता है और जरूरत के अनुसार starch जैसे रूप में store भी कर सकता है।",
    "Photosynthesis के दौरान oxygen release होती है। School-level explanation में इसे water-splitting reactions से जोड़कर समझाया जाता है; इसलिए equation को सिर्फ याद करने के बजाय process से जोड़ो।",
    "Photosynthesis की basic equation को words में समझो: Carbon dioxide + Water + Light energy → Glucose + Oxygen. Equation के पीछे inputs और output का logic याद रखो।",
    "Photosynthesis plants के लिए food production का आधार है और atmosphere में oxygen तथा carbon cycle से जुड़ा है। इसलिए इसका असर plant से आगे पूरे ecosystem तक जाता है।",
  ];
  const angles = ["food factory reveal", "energy reveal", "green-leaf mystery", "key pigment", "CO₂ role", "water role", "glucose payoff", "oxygen mystery", "equation logic", "ecosystem impact"];
  return hooks.map((hook, i) => ({
    hook,
    angle: angles[i],
    explanation: explanations[i],
    visual: [
      "Sunlight + CO₂ + water → leaf → glucose/oxygen animation.",
      "Sun icon → light energy → chloroplast animation.",
      "Green leaf zoom → Chlorophyll label → light arrows.",
      "Chloroplast close-up → Chlorophyll highlight → sunlight arrows.",
      "CO₂ molecules entering leaf → glucose formation visual.",
      "Roots absorb water → upward arrows → leaf.",
      "Glucose molecule → plant energy/storage visual.",
      "Water molecule → reaction visual → O₂ released.",
      "Equation appears piece-by-piece instead of all at once.",
      "Plant → food → oxygen → ecosystem chain.",
    ][i],
    takeaway: [
      "Photosynthesis = plant का food-making process.",
      "Sunlight process को energy देती है.",
      "Chlorophyll light capture में key role निभाता है.",
      "Chlorophyll को सिर्फ ‘green colour’ कहकर मत छोड़ो.",
      "CO₂ glucose formation के लिए carbon source देता है.",
      "Water Photosynthesis का जरूरी reactant है.",
      "Glucose plant के लिए usable food/energy source है.",
      "Photosynthesis oxygen release से ecosystem को भी प्रभावित करता है.",
      "Equation को inputs → process → outputs की तरह समझो.",
      "Photosynthesis को ecosystem से जोड़कर देखो, सिर्फ definition से नहीं.",
    ][i],
  }));
}

function getAngles(topic: string): StrategyAngle[] {
  return /photosynthesis|प्रकाश संश्लेषण/i.test(topic) ? photosynthesisAngles() : genericAngles(topic);
}

function buildPiece(platform: Platform, pieceNumber: number, topic: string, angle: StrategyAngle): ContentPiece {
  const platformIntro: Record<Platform, string> = {
    instagram_reel: `🎬 Reel presentation: ${angle.angle}.`,
    facebook_post: `📘 Facebook presentation: ${angle.angle} को थोड़ा detail में समझो।`,
    youtube_short: `▶️ Short presentation: ${angle.angle} को fast payoff के साथ समझो।`,
  };

  const platformClose: Record<Platform, string> = {
    instagram_reel: "वीडियो save करो और ऐसे concepts के लिए follow करो।",
    facebook_post: "तुम्हारे हिसाब से इस concept को समझने का सबसे आसान तरीका क्या है? Comment में बताओ और post save कर लो।",
    youtube_short: "ऐसे quick concept explainers के लिए subscribe करो और इसे revision के लिए save कर लो।",
  };

  return {
    platform,
    piece_number: pieceNumber,
    title: angle.hook,
    body: [
      angle.hook,
      "",
      platformIntro[platform],
      "",
      `🎙️ Hindi Voice-over: ${angle.hook.replace(/^[^A-Za-zअ-ह0-9]+/, "")} अब इसका answer ध्यान से समझो। ${angle.explanation}`,
      `\n👀 Visual/Presentation: ${angle.visual}`,
      `\n🧠 Takeaway: ${angle.takeaway}`,
      `\n🌐 Website approach: ${WEBSITE_CTA}`,
      `\n👉 CTA: ${platformClose[platform]}`,
    ].join("\n"),
    hashtags: ["#Education", "#StudyTips", "#ConceptClarity", "#HindiEducation"],
    cta: platformClose[platform],
  };
}

export function generateMockContentBatch(prompt: string): ContentBatch {
  const topic = extractTopic(prompt);
  const angles = getAngles(topic);
  const pieces: ContentPiece[] = [];

  for (const platform of PLATFORMS) {
    for (let n = 1; n <= PIECES_PER_PLATFORM; n++) {
      // Same 10 core questions across all platforms; explanation/presentation changes by platform.
      pieces.push(buildPiece(platform, n, topic, angles[n - 1]));
    }
  }

  return { pieces };
}
