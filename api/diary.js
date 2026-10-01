// Vercel 서버 함수: 사진을 받아 Claude에게 일기를 부탁하고 결과를 돌려줍니다.
// API 키는 Vercel 환경변수 ANTHROPIC_API_KEY 에만 넣고, 코드에는 절대 적지 마세요.

const KINDS = ["고양이", "강아지", "토끼", "햄스터", "새", "기타"];
const clip = (v, n) => String(v || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "잘못된 요청이에요." });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "서버에 API 키가 설정되지 않았어요." });

  const body = req.body || {};
  const image = typeof body.image === "string" ? body.image : "";
  if (!image || image.length > 3_500_000) {
    return res.status(400).json({ error: "사진이 없거나 너무 커요. 다른 사진을 골라 주세요." });
  }
  const name = clip(body.name, 12) || "우리 애";
  const kind = KINDS.includes(body.kind) ? body.kind : "기타";
  const persona = clip(body.persona, 60);
  const TONES = {
    "기본": "평범하고 순수한 초등학생 그림일기 말투. 솔직하고 귀엽게. 예: 오늘은 집사가 늦게 왔다. 그래서 조금 심심했다.",
    "시크": "무심하고 도도한 말투. 관심 없는 척하지만 사실은 다 신경 쓰는 츤데레. 짧게 끊어 말하고 '별로', '뭐', '...' 같은 표현. 예: 집사가 새 장난감을 사 왔다. 뭐, 나쁘진 않았다.",
    "애교": "집사를 너무 좋아하는 달달한 말투. '~했어용', '헤헤', '집사 최고' 같은 표현, 귀여운 의성어 많이. 예: 집사가 쓰다듬어 줘서 기분이 너무너무 좋았어용 헤헤.",
    "허세": "자기가 이 집의 왕이라고 믿는 거만하고 웃긴 말투. '본 냥이', '이 몸', '감히' 같은 표현과 과장. 예: 감히 집사가 이 몸의 간식을 늦게 대령했다. 오늘만 특별히 용서해 주었다.",
  };
  const tone = Object.prototype.hasOwnProperty.call(TONES, body.tone) ? body.tone : "기본";
  const today = clip(body.today, 200);

  const prompt = `너는 ${kind} "${name}"(이)야. 첨부한 사진은 오늘의 너야.
사진 속 표정, 자세, 장소, 물건을 자세히 보고, ${name}의 시점에서 초등학생 그림일기처럼 오늘 일기를 써 줘.
${persona ? `성격: ${persona}\n` : ""}${today ? `집사가 알려준 오늘 있었던 일: ${today}\n` : ""}
규칙:
- 반말, 1인칭("나"), 집사는 "집사"라고 불러. (허세 말투면 "이 몸", "본 냥이/본 멍이"도 좋아)
- 말투: ${tone} — ${TONES[tone]} 처음부터 끝까지 이 말투를 확실하게 살려.
- 사진에서 실제로 보이는 것을 꼭 한두 가지 넣어.
- ${kind}다운 엉뚱한 생각이나 오해를 하나 넣어서 웃기게.
- 4~6문장, 공백 포함 180자 이내. 이모지 쓰지 마.
- "scene"에는 일기에서 가장 웃긴 한 순간을 그림으로 그릴 수 있게 영어 한두 문장으로 써. 일기 본문에 나온 것(동물, 사람, 물건, 장소)만 넣고, 일기에 없는 사람이나 물건은 절대 넣지 마. 글자가 적힌 물건(포장지, 간판 등)도 빼.
- 사진에 동물이 없으면 사진 속 물건을 ${name}가 구경한 이야기로 써.
다른 말 없이 JSON 하나로만 답해: {"weather":"맑음|흐림|비|눈|바람 중 하나","title":"15자 이내 제목","diary":"일기 본문","scene":"그림 장면(영어)"}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("Anthropic error", r.status, JSON.stringify(data).slice(0, 500));
      const msg = r.status === 429 ? "지금 사람이 많아요. 잠시 후 다시 눌러 주세요." : "일기를 쓰다 멈췄어요. 한 번 더 눌러 주세요.";
      return res.status(502).json({ error: msg });
    }

    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    const out = m ? JSON.parse(m[0]) : null;
    if (!out || typeof out.diary !== "string") throw new Error("bad json");

    return res.status(200).json({
      weather: clip(out.weather, 4) || "맑음",
      title: clip(out.title, 20),
      diary: String(out.diary).trim().slice(0, 260),
      scene: clip(out.scene, 400),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "일기를 쓰다 멈췄어요. 한 번 더 눌러 주세요." });
  }
};
