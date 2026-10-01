// Vercel 서버 함수: 사주 계산 결과를 받아 Claude가 재미용 풀이를 써 줍니다.
// 사주 계산(년·월·일 간지, 오행, 궁합 점수)은 사이트 쪽 코드에서 하고, 여기서는 글만 씁니다.

const clip = (v, n) => String(v || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
const KINDS = ["고양이", "강아지", "토끼", "햄스터", "새", "기타"];

function petLine(p) {
  if (!p) return "";
  return `이름 ${clip(p.name, 12) || "우리 애"} (${KINDS.includes(p.kind) ? p.kind : "반려동물"}), 기준 날짜: ${clip(p.basis, 10)} ${clip(p.date, 12)}
사주(년·월·일): ${clip(p.pillars, 40)} / 일간(타고난 기운): ${clip(p.dayMaster, 20)} / 띠: ${clip(p.animal, 8)}
오행 개수: ${clip(p.elements, 60)}`;
}

const COMMON = `너는 반려동물 사주를 봐 주는 유쾌한 '냥멍도사'야. 아래 계산 결과를 근거로 재미로 보는 풀이를 써.
규칙:
- 친근한 존댓말(~해요). 귀엽고 웃기게, 따뜻하게.
- 근거로 오행이나 일간을 한두 번 자연스럽게 언급해.
- 겁주는 말, 질병·사고·죽음·이별 예언은 절대 금지. 건강 얘기는 "물 잘 마시게 챙겨 주기" 같은 가벼운 생활 조언만.
- 사람 사주를 단정적으로 평가하지 마. 집사는 반려동물과의 관계 위주로만 이야기해.
- 다른 말 없이 JSON 하나로만 답해.`;

function buildPrompt(b) {
  const mode = b.mode;
  if (mode === "pet") {
    return `${COMMON}

[반려동물]
${petLine(b.pet)}

JSON 형식:
{"nickname":"10자 이내 별명","summary":"한 줄 요약","personality":"타고난 성격 2~3문장","snacks":"잘 맞는 간식 1~2문장","toys":"잘 맞는 장난감·놀이 1~2문장","caution":"조심할 것 1~2문장(가볍게)","lucky":"행운의 색과 물건 한 줄"}`;
  }
  if (mode === "match") {
    return `${COMMON}

[반려동물]
${petLine(b.pet)}

[집사]
이름 ${clip(b.owner && b.owner.name, 12) || "집사"}, 생일 기준 사주(년·월·일): ${clip(b.owner && b.owner.pillars, 40)} / 일간: ${clip(b.owner && b.owner.dayMaster, 20)} / 띠: ${clip(b.owner && b.owner.animal, 8)}
오행 개수: ${clip(b.owner && b.owner.elements, 60)}

[계산된 궁합] 점수 ${Number(b.score) || 80}점 (이 점수는 바꾸지 마). 근거: ${clip(b.notes, 200)}

JSON 형식:
{"pastLife":"전생에 둘이 어떤 사이였는지 한 구절(예: 조선시대 주막 주인과 단골손님)","summary":"한 줄 요약","good":"잘 맞는 점 2~3문장","careful":"살짝 부딪히는 점 1~2문장(웃기게)","tip":"더 친해지는 팁 1~2문장"}`;
  }
  if (mode === "year") {
    return `${COMMON}

[반려동물]
${petLine(b.pet)}

[운세 볼 해] ${Number(b.year) || new Date().getFullYear()}년, 그해의 기운: ${clip(b.yearPillar, 20)}. 관계: ${clip(b.notes, 200)}

JSON 형식:
{"keyword":"그해 키워드 6자 이내","summary":"한 줄 요약","spring":"봄 운세 1문장","summer":"여름 운세 1문장","autumn":"가을 운세 1문장","winter":"겨울 운세 1문장","lucky":"행운의 아이템 한 줄","caution":"가볍게 조심할 것 1문장"}`;
  }
  if (mode === "charm") {
    return `${COMMON}
- 반려동물 사주에서 가장 부족한 기운을 채워 주는 '행운 부적'을 만들어. 부적은 귀여운 재미용이야.
- 건강·질병을 낫게 한다는 표현은 쓰지 마. 행운, 복, 평안, 집사와의 행복 위주로.

[반려동물]
${petLine(b.pet)}
[채울 기운] ${clip(b.need, 20)}
[털 색] ${clip(b.fur, 10)}

JSON 형식:
{"charmName":"부적 이름 8자 이내(예: 금빛 재물부)","hanja":"부적에 쓸 길한 한자 사자성어 4글자(한자만)","reading":"그 사자성어의 한글 독음 4글자","meaning":"사자성어 뜻 한 줄","blessing":"이 부적이 반려동물에게 주는 복 2문장(사주 근거 한 번 언급)","howTo":"부적 두는 곳 재미있게 1문장(예: 밥그릇 옆에 붙여 두세요)"}`;
  }
  if (mode === "face") {
    return `${COMMON}
- 첨부한 사진 속 반려동물의 얼굴을 실제로 보고, 보이는 특징(눈 모양·색, 코, 귀, 입, 털 색과 무늬, 표정)을 근거로 관상을 풀어 줘. 사진에 안 보이는 부위는 지어내지 말고 "사진으론 잘 안 보이지만"처럼 넘어가.
- 건강·질병 판단은 절대 하지 마. 성격과 복, 재미 위주로만.
- 사진에 동물이 없으면 nickname을 "관상 불가"로 하고 summary에 다른 사진을 올려 달라고 써.

[반려동물] 이름 ${clip(b.pet && b.pet.name, 12) || "우리 애"} (${KINDS.includes(b.pet && b.pet.kind) ? b.pet.kind : "반려동물"})
${b.pet && b.pet.pillars ? `생일 사주도 있음 → combo에 관상과 사주를 엮은 종합 풀이를 써 줘.\n${petLine(b.pet)}` : "생일 정보 없음 → combo는 빈 문자열로."}

JSON 형식:
{"nickname":"10자 이내 관상 별명(예: 타고난 재물복 상)","summary":"한 줄 총평","eyes":"눈 풀이 1~2문장","nose":"코·입 풀이 1~2문장","ears":"귀 풀이 1~2문장","fur":"털 색·무늬 풀이 1~2문장","pastLife":"웃긴 전생 직업 한 구절(예: 조선시대 어사또)","fortune":"타고난 복 1~2문장","combo":"관상+사주 종합 2~3문장 또는 빈 문자열"}`;
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "잘못된 요청이에요." });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "서버에 API 키가 설정되지 않았어요." });

  const b = req.body || {};
  const prompt = buildPrompt(b);
  if (!prompt) return res.status(400).json({ error: "잘못된 요청이에요." });
  let content = prompt;
  if (b.mode === "face") {
    const image = typeof b.image === "string" ? b.image : "";
    if (!image || image.length > 3_500_000) return res.status(400).json({ error: "사진이 없거나 너무 커요. 다른 사진을 골라 주세요." });
    content = [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
      { type: "text", text: prompt },
    ];
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 900,
        messages: [{ role: "user", content }],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Anthropic error", r.status, JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: r.status === 429 ? "지금 사람이 많아요. 잠시 후 다시 해 주세요." : "도사님이 잠깐 자리를 비웠어요. 다시 눌러 주세요." });
    }
    const text = (data.content || []).filter(x => x.type === "text").map(x => x.text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    const out = m ? JSON.parse(m[0]) : null;
    if (!out) throw new Error("bad json");
    const clean = {};
    for (const [k, v] of Object.entries(out)) if (typeof v === "string") clean[k] = v.trim().slice(0, 300);
    return res.status(200).json(clean);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "도사님이 잠깐 자리를 비웠어요. 다시 눌러 주세요." });
  }
};
