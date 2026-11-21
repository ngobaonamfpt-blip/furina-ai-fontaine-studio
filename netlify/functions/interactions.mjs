import { GoogleGenAI } from "@google/genai";

const GOOGLE_DIRECT_BASE_URL = "https://generativelanguage.googleapis.com";

const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-4-argon"
];

function extractErrorMessage(err) {
  if (!err) return "Lỗi không xác định từ API.";
  if (typeof err === "string") return err;
  if (typeof err.message === "string" && err.message) return err.message;
  if (err.error) return extractErrorMessage(err.error);
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isRealGoogleApiKey(key) {
  return Boolean(key && typeof key === "string" && key.trim().startsWith("AIza"));
}

function buildInteractionParams(body, overrideModel) {
  const model = overrideModel || body.model || "gemini-3.8-flash";
  const params = {
    model,
    input: body.input
  };

  if (body.previous_interaction_id && !overrideModel) {
    params.previous_interaction_id = body.previous_interaction_id;
  }

  if (body.system_instruction && body.system_instruction.trim()) {
    params.system_instruction = body.system_instruction.trim();
  }

  if (Array.isArray(body.tools) && body.tools.length > 0) {
    params.tools = body.tools;
  }

  return params;
}

export default async (req) => {
  const url = new URL(req.url);

  const envGoogleKey = isRealGoogleApiKey(process.env.GEMINI_API_KEY)
    ? process.env.GEMINI_API_KEY.trim()
    : null;
  const hasNetlifyGateway = Boolean(process.env.GOOGLE_GEMINI_BASE_URL);

  // GET /api/status
  if (req.method === "GET" && url.pathname.endsWith("/status")) {
    return Response.json({
      ok: true,
      hasServerApiKey: Boolean(envGoogleKey),
      hasNetlifyGateway,
      defaultModel: "gemini-3.8-flash"
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const headerKey = req.headers.get("x-gemini-api-key");
  const directApiKey =
    (isRealGoogleApiKey(headerKey) ? headerKey.trim() : null) || envGoogleKey || null;

  const requestedModel = body.model || "gemini-3.8-flash";
  const candidateModels = [
    requestedModel,
    ...FALLBACK_MODELS.filter((m) => m !== requestedModel)
  ];

  // Path 1: User provided a Google AI Studio API Key (or one is set in env)
  if (directApiKey) {
    const client = new GoogleGenAI({
      apiKey: directApiKey,
      httpOptions: {
        baseUrl: GOOGLE_DIRECT_BASE_URL,
        timeout: 8000,
        headers: {
          "Api-Revision": "2026-05-20"
        }
      }
    });

    let lastError = null;
    for (let i = 0; i < candidateModels.length; i++) {
      const modelName = candidateModels[i];
      try {
        const params = buildInteractionParams(body, i === 0 ? null : modelName);
        const interaction = await client.interactions.create(params, {
          timeout: 8000,
          maxRetries: 0
        });

        if (interaction.status === "failed" || interaction.errors?.length) {
          const failErr = interaction.errors?.[0] || interaction.error || "Interaction failed";
          throw new Error(extractErrorMessage(failErr));
        }

        return Response.json({
          id: interaction.id,
          model: modelName,
          status: interaction.status,
          output_text: interaction.output_text || null,
          output_image: interaction.output_image || null,
          output_audio: interaction.output_audio || null,
          steps: interaction.steps || [],
          outputs: interaction.outputs || [],
          usage: interaction.usage || null
        });
      } catch (error) {
        lastError = error;
        const msg = extractErrorMessage(error).toLowerCase();
        if (
          error?.status === 401 ||
          error?.status === 403 ||
          msg.includes("api key not valid") ||
          msg.includes("api_key_invalid")
        ) {
          break;
        }
      }
    }

    const errText = extractErrorMessage(lastError);
    return Response.json({ error: errText }, { status: lastError?.status || 500 });
  }

  // Path 2: No user API key -> Use Netlify AI Gateway with zero-arg GoogleGenAI({})
  if (hasNetlifyGateway) {
    try {
      const gatewayClient = new GoogleGenAI({});
      const gatewayModels = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
      for (const modelName of gatewayModels) {
        try {
          const promptText =
            typeof body.input === "string"
              ? body.input
              : JSON.stringify(body.input);
          const fullContents = body.system_instruction
            ? `${body.system_instruction}\n\n${promptText}`
            : promptText;

          const result = await gatewayClient.models.generateContent({
            model: modelName,
            contents: fullContents
          });

          const text = result.text || "";
          if (text) {
            return Response.json({
              id: null,
              model: modelName,
              status: "completed",
              output_text: text,
              steps: [{ type: "model_output", content: [{ type: "text", text }] }],
              outputs: [{ type: "text", text }]
            });
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Fall through to 401 prompt
    }
  }

  return Response.json(
    {
      error:
        "Vui lòng nhấn vào nút 'Nhập API Key tại đây ⚙️' ở góc dưới bên trái và dán Google AI Studio API Key (AIzaSy...) của bạn."
    },
    { status: 401 }
  );
};
