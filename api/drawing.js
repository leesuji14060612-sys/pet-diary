// Vercel 서버 함수: 사진 + 일기 내용을 받아 그림 AI(Gemini)로 그림일기 그림을 만듭니다.
// 구글 키는 Vercel 환경변수 GEMINI_API_KEY 에만 넣으세요.

const KINDS = ["고양이", "강아지", "토끼", "햄스터", "새", "기타"];
const ART_STYLES = {
  "크레파스": { lead: "a cute crayon drawing, like a picture a Korean elementary school kid draws in a picture diary", style: "wax crayon and colored pencil on white paper, simple slightly wobbly lines, soft pastel colors, plain white background" },
  "색연필": { lead: "a gentle colored pencil drawing", style: "soft colored pencils on white drawing paper, delicate visible hatching strokes, light pastel colors, airy and calm, plain white background" },
  "수채화": { lead: "a soft watercolor painting", style: "light watercolor washes on textured watercolor paper, gentle bleeding edges, pale pastel colors, lots of white space, plain white background" },
  "동화책": { lead: "a warm children's picture book illustration", style: "gouache picture book style, soft rounded shapes, cozy warm light, gentle pastel palette, simple soft background" },
  "스티커": { lead: "a cute kawaii sticker illustration", style: "flat pastel colors, simple clean shapes, thick white die-cut outline around the whole pet, soft light gray shadow, plain white background" },
};
const clip = (v, n) => String(v || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);

// 앞에서부터 시도하고, 모델 이름이 없어졌으면(404) 다음 것으로 넘어갑니다.
const MODELS = [
  process.env.GEMINI_IMAGE_MODEL,
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image",
].filter(Boolean);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "잘못된 요청이에요." });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "서버에 그림 AI 키가 설정되지 않았어요." });

  const body = req.body || {};
  const image = typeof body.image === "string" ? body.image : "";
  if (!image || image.length > 3_500_000) {
    return res.status(400).json({ error: "사진이 없거나 너무 커요." });
  }
  const name = clip(body.name, 12) || "우리 아이";
  const kind = KINDS.includes(body.kind) ? body.kind : "반려동물";
  const title = clip(body.title, 30);
  const diary = clip(body.diary, 300);

  const scene = clip(body.scene, 400);
  const animal = { "고양이":"cat","강아지":"dog","토끼":"rabbit","햄스터":"hamster","새":"bird" }[kind] || "pet";
  const st = ART_STYLES[body.style] || ART_STYLES["크레파스"];
  const prompt = `Redraw the ${animal} in the attached photo as ${st.lead}.
Keep the ${animal} recognizable: same fur colors, markings and body shape as in the photo.
Draw ONLY this scene, and nothing else: ${scene || `${title}. ${diary}`}
Do not add any people, animals, objects or props that are not in that scene. Ignore the photo's background.
No text, letters, numbers, labels or speech bubbles anywhere in the image.
Style: ${st.style}. Square image.`;

  let lastErr = "";
  for (const model of MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: "image/jpeg", data: image } },
              ],
            }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        }
      );
      const data = await r.json().catch(() => ({}));
      if (r.status === 404) { lastErr = `model not found: ${model}`; continue; }
      if (!r.ok) {
        console.error("Gemini error", model, r.status, JSON.stringify(data).slice(0, 500));
        const msg = r.status === 429 ? "그림 그리는 사람이 많아요. 잠시 후 다시 해 주세요." : "그림을 그리다 멈췄어요.";
        return res.status(502).json({ error: msg });
      }
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const img = parts.find(p => p.inlineData || p.inline_data);
      const inline = img && (img.inlineData || img.inline_data);
      if (!inline || !inline.data) {
        console.error("No image in response", model, JSON.stringify(data).slice(0, 500));
        return res.status(502).json({ error: "이 사진으로는 그림을 못 그렸어요. 다른 사진으로 해 보세요." });
      }
      return res.status(200).json({
        image: `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`,
      });
    } catch (e) {
      console.error(e);
      lastErr = String(e);
    }
  }
  console.error("All models failed:", lastErr);
  return res.status(500).json({ error: "그림을 그리다 멈췄어요." });
};
