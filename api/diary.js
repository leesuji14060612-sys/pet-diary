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
  const name = clip(body.name, 12) || "우리 아이";
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

  const hasB = (w) => { const c = String(w).slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const nameIs = name + (hasB(name) ? "이야" : "야");

  const prompt = `너는 ${kind}고, 이름은 ${name}. 첨부한 사진은 오늘의 너야. (${nameIs})
오늘 하루를 초등학생 그림일기처럼 네가 직접 써.
${persona ? `성격: ${persona}\n` : ""}${today ? `집사가 알려 준 오늘 있었던 일: ${today}\n` : ""}
말투: ${tone} — ${TONES[tone]}

쓰는 순서 (속으로만 하고, 결과에는 최종 일기만 써):
1. 사진에서 실제로 보이는 것(표정, 자세, 장소, 물건)을 확인해.
2. 오늘 있었던 일을 딱 하나만 정해. 집사가 알려 준 일이 있으면 그걸 중심으로 해.
3. 그 일을 일어난 순서대로 써. "무슨 일이 있었다 → 그래서 나는 이렇게 했다/느꼈다 → 마지막 한마디" 흐름으로.
4. 다 쓴 뒤 처음부터 소리 내어 읽듯이 점검해: 맞춤법, 띄어쓰기, 조사(은/는, 이/가, 을/를), 시제가 맞는지, 앞뒤 내용이 서로 모순되지 않는지, 누가 무엇을 했는지 헷갈리지 않는지. 어색한 문장은 더 쉬운 문장으로 고쳐.

규칙:
- 반말, 1인칭 "나". 가족은 "집사"라고 불러. (허세 말투면 "이 몸"도 좋아) 자기 이름을 3인칭으로 부르지 마.
- 실제 한국 초등학생이 쓴 것처럼 짧고 쉬운 문장. 한 문장에 한 가지 내용만. 번역투, 억지스러운 말장난, 뜻이 애매한 표현은 쓰지 마.
- 사진에서 보이는 것을 한두 가지 자연스럽게 넣고, ${kind}다운 엉뚱한 생각을 하나 넣어서 웃기게.
- 사진에 없고 집사가 알려 주지도 않은 사건이나 인물은 만들지 마.
- '우리 애'라는 말은 쓰지 마. 이모지 쓰지 마.
- 4~5문장, 공백 포함 200자 이내.
- 사진에 동물이 없으면 사진 속 물건을 구경한 이야기로 써.

"scene"에는 일기에서 가장 웃긴 한 순간을 그림으로 그릴 수 있게 영어 한두 문장으로 써. 일기에 나온 것만 넣고, 글자가 적힌 물건은 빼.
다른 말 없이 JSON 하나로만 답해: {"weather":"맑음|흐림|비|눈|바람 중 하나","title":"12자 이내 제목","diary":"최종 일기 본문","scene":"그림 장면(영어)"}`;

  try {
    const MODELS = [process.env.ANTHROPIC_MODEL, "claude-sonnet-5-5", "claude-haiku-4-5-20251001"].filter(Boolean);
    let r;
    for (const model of MODELS) {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model, max_tokens: 1200,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: prompt },
          ] }],
        }),
      });
      if (r.status !== 404) break; // 모델 이름이 없으면 다음 모델로
    }

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
      diary: String(out.diary).trim().slice(0, 280),
      scene: clip(out.scene, 400),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "일기를 쓰다 멈췄어요. 한 번 더 눌러 주세요." });
  }
};
