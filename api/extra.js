// Vercel 서버 함수: 무지개다리 편지, 달력 한 줄 문구
const clip = (v, n) => String(v || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
const KINDS = ["고양이", "강아지", "토끼", "햄스터", "새", "기타"];
const TONES = {
  "기본": "순수하고 솔직한 초등학생 그림일기 말투",
  "시크": "무심한 척하는 츤데레 말투, 짧게 끊어 말하기",
  "애교": "집사를 너무 좋아하는 달달한 말투, '~했어용', '헤헤'",
  "허세": "자기가 이 집의 왕인 척하는 거만하고 웃긴 말투, '이 몸', '감히'",
};

function letterPrompt(b) {
  const name = clip(b.name, 12) || "우리 애";
  const kind = KINDS.includes(b.kind) ? b.kind : "반려동물";
  return `너는 무지개다리를 건넌 ${kind} "${name}"(이)야. 남겨진 가족에게 보내는 편지를 써 줘.
가족을 부르는 호칭: ${clip(b.call, 10) || "집사"}
함께한 시간: ${clip(b.period, 30) || "알려 주지 않음"}
좋아하던 것: ${clip(b.likes, 120) || "알려 주지 않음"}
기억나는 순간: ${clip(b.memories, 300) || "알려 주지 않음"}
${b.image ? "첨부한 사진은 함께 지내던 때의 너야. 사진 속 모습(털 색, 표정, 자리)을 한 번 자연스럽게 떠올려." : ""}

반드시 지킬 것:
- ${name}의 1인칭으로, 위의 호칭으로 가족을 불러. 반말, 따뜻하고 다정하게.
- 자연스러운 한국어로 써. 번역투나 어색한 표현 금지. 자기 이름을 3인칭으로 부르지 말고 "나"라고 해 (첫 인사에서 "나 ○○야" 한 번은 괜찮아).
- 어미를 한 가지로 반복하지 마. 애교 말투라도 "~용"은 두세 번까지만.
- 가족이 알려 준 내용만 구체적으로 써. 알려 주지 않은 사건이나 장소, 병명은 절대 지어내지 마.
- 아프지 않다는 것, 무섭지 않다는 것, 가족 잘못이 아니라는 것, 함께해서 정말 행복했다는 것을 꼭 담아.
- 마지막 순간이나 죽음의 장면을 묘사하지 마. 슬픔을 키우는 신파보다 고마움과 위로가 중심이야.
- 특정 종교 표현은 쓰지 마. 무지개다리, 햇볕 잘 드는 곳, 구름 같은 부드러운 비유는 괜찮아.
- 가족이 울어도 괜찮고, 천천히 괜찮아져도 된다고 말해 줘.
- 본문은 8~12문장, 공백 포함 550자 이내. 이모지 쓰지 마.

다른 말 없이 JSON 하나로만 답해:
{"title":"편지 제목 18자 이내","letter":"편지 본문 (문단은 \\n으로 나눠)","closing":"맺음말 한 줄(예: 무지개다리 너머에서, ${name}가)","ps":"추신 한 줄(가볍고 따뜻하게)"}`;
}

function thanksPrompt(b) {
  const name = clip(b.name, 12) || "우리 애";
  const kind = KINDS.includes(b.kind) ? b.kind : "반려동물";
  const tone = Object.prototype.hasOwnProperty.call(TONES, b.tone) ? b.tone : "기본";
  return `너는 ${kind} "${name}"(이)야. 오늘은 "${clip(b.occasion, 20) || "특별한 날"}"이라서 가족에게 편지를 써.
가족을 부르는 호칭: ${clip(b.call, 10) || "집사"}
함께한 시간: ${clip(b.period, 30) || "알려 주지 않음"}
기억나는 순간: ${clip(b.memories, 300) || "알려 주지 않음"}
말투: ${tone} (${TONES[tone]})
${b.image ? "첨부한 사진은 지금의 너야. 사진 속 모습을 한 번 자연스럽게 언급해." : ""}
규칙:
- ${name}의 1인칭, 위의 호칭으로 가족을 불러. 말투를 처음부터 끝까지 살려.
- 자연스러운 한국어로 써. 번역투나 어색한 표현 금지. 자기 이름을 3인칭으로 부르지 말고 "나"라고 해 (첫 인사에서 "나 ○○야" 한 번은 괜찮아).
- 어미를 한 가지로 반복하지 마. 애교 말투라도 "~용"은 두세 번까지만.
- "처음 데려온 날 기억나?"처럼 함께한 시간을 돌아보고, 고마움과 앞으로도 잘 부탁한다는 마음을 담아. 웃긴 부탁(간식 더 줘 등) 하나는 꼭 넣어.
- 가족이 알려 준 내용만 구체적으로 쓰고, 없는 사건은 지어내지 마.
- 본문 8~12문장, 공백 포함 500자 이내. 이모지 쓰지 마.
다른 말 없이 JSON 하나로만 답해:
{"title":"편지 제목 18자 이내","letter":"편지 본문 (문단은 \\n으로 나눠)","closing":"맺음말 한 줄, 20자 이내(예: ${name}가)","ps":"추신 한 줄, 40자 이내(웃기게)"}`;
}

function siblingsPrompt(b) {
  const A = b.a || {}, B = b.b || {};
  const an = clip(A.name, 12) || "첫째", bn = clip(B.name, 12) || "둘째";
  const ak = KINDS.includes(A.kind) ? A.kind : "반려동물", bk = KINDS.includes(B.kind) ? B.kind : "반려동물";
  return `한 집에 사는 두 반려동물의 대화와 일기를 써 줘.
A: ${an} (${ak}), 성격: ${clip(A.persona, 60) || "알려 주지 않음"}, ${bn}를 부르는 호칭: ${clip(A.call, 8) || bn}
B: ${bn} (${bk}), 성격: ${clip(B.persona, 60) || "알려 주지 않음"}, ${an}를 부르는 호칭: ${clip(B.call, 8) || an}
최근 있었던 일: ${clip(b.today, 200) || "알려 주지 않음"}
${b.image ? "첨부한 사진에 두 아이가 있어. 사진 속 자리, 자세, 표정을 대화에 자연스럽게 녹여." : ""}
규칙:
- 티격태격하지만 결국 서로 좋아하는 형제 케미. 반말, 짧고 웃기게. "또 내 자리 뺏었다" 같은 일상 다툼이 좋아.
- 각자 성격이 말투에 드러나게. 알려 주지 않은 사건은 지어내지 마.
- 자연스러운 한국어 구어체로. 번역투 금지. 자기 이름을 3인칭으로 부르지 마.
- 대화 8~12줄, 한 줄 35자 이내. 이모지 쓰지 마.
- 마지막엔 각자 상대에 대해 쓴 짧은 일기(2~3문장, 120자 이내). 겉으론 투덜대도 속마음이 살짝 드러나게.
다른 말 없이 JSON 하나로만 답해:
{"title":"대화 제목 16자 이내","chat":[{"who":"A","text":"..."},{"who":"B","text":"..."}],"diaryA":"${an}의 일기","diaryB":"${bn}의 일기"}`;
}

function calendarPrompt(b) {
  const name = clip(b.name, 12) || "우리 애";
  const kind = KINDS.includes(b.kind) ? b.kind : "반려동물";
  const tone = Object.prototype.hasOwnProperty.call(TONES, b.tone) ? b.tone : "기본";
  return `너는 ${kind} "${name}"(이)야. 집사 책상에 놓일 달력의 1월~12월 각 달에 들어갈 한 줄 문구를 ${name} 시점으로 써 줘.
말투: ${tone} (${TONES[tone]})
성격: ${clip(b.persona, 60) || "알려 주지 않음"}
규칙: 각 달의 계절감(눈, 벚꽃, 장마, 더위, 단풍, 연말 등)을 살려서 귀엽고 웃기게. 각 25자 이내. 이모지 쓰지 마. 특정 연도 숫자는 쓰지 마.
다른 말 없이 JSON 하나로만 답해: {"months":["1월 문구","2월 문구", ... 12개]}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "잘못된 요청이에요." });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "서버에 API 키가 설정되지 않았어요." });
  const b = req.body || {};
  let prompt;
  if (b.mode === "letter") prompt = letterPrompt(b);
  else if (b.mode === "calendar") prompt = calendarPrompt(b);
  else if (b.mode === "thanks") prompt = thanksPrompt(b);
  else if (b.mode === "siblings") prompt = siblingsPrompt(b);
  else return res.status(400).json({ error: "잘못된 요청이에요." });

  let content = prompt;
  if (["letter", "thanks", "siblings"].includes(b.mode) && typeof b.image === "string" && b.image) {
    if (b.image.length > 3_500_000) return res.status(400).json({ error: "사진이 너무 커요. 다른 사진을 골라 주세요." });
    content = [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.image } }, { type: "text", text: prompt }];
  }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001", max_tokens: 1200, messages: [{ role: "user", content }] }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Anthropic error", r.status, JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: r.status === 429 ? "지금 사람이 많아요. 잠시 후 다시 해 주세요." : "잠깐 문제가 생겼어요. 다시 눌러 주세요." });
    }
    const text = (data.content || []).filter(x => x.type === "text").map(x => x.text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    const out = m ? JSON.parse(m[0]) : null;
    if (!out) throw new Error("bad json");
    if (b.mode === "calendar") {
      const months = Array.isArray(out.months) ? out.months.slice(0, 12).map(x => clip(x, 40)) : [];
      while (months.length < 12) months.push("");
      return res.status(200).json({ months });
    }
    if (b.mode === "siblings") {
      const chat = (Array.isArray(out.chat) ? out.chat : []).slice(0, 14)
        .filter(x => x && (x.who === "A" || x.who === "B") && x.text)
        .map(x => ({ who: x.who, text: clip(x.text, 60) }));
      if (!chat.length) throw new Error("no chat");
      return res.status(200).json({ title: clip(out.title, 30), chat, diaryA: clip(out.diaryA, 200), diaryB: clip(out.diaryB, 200) });
    }
    return res.status(200).json({
      title: clip(out.title, 30), letter: String(out.letter || "").trim().slice(0, 800),
      closing: clip(out.closing, 40), ps: clip(out.ps, 80),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "잠깐 문제가 생겼어요. 다시 눌러 주세요." });
  }
};
