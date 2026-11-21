import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public")));

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

function resolveApiKey(req) {
  const headerKey = req.headers["x-gemini-api-key"];
  if (headerKey && typeof headerKey === "string" && headerKey.trim()) {
    return headerKey.trim();
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  return null;
}

function createGenAIClient(apiKey) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "Api-Revision": "2026-05-20"
      }
    }
  });
}

function buildInteractionParams(body, overrideModel, includeThinking = true) {
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

  if (
    includeThinking &&
    body.thinking_level &&
    (model === "gemini-3.8-flash" || model === "gemini-4-argon")
  ) {
    let level = body.thinking_level;
    if (model === "gemini-4-argon" && level === "minimal") {
      level = "low";
    }
    params.generation_config = {
      thinking_level: level
    };
  }

  return params;
}

function isAuthKeyError(err) {
  const msg = extractErrorMessage(err).toLowerCase();
  return (
    err?.status === 401 ||
    err?.status === 403 ||
    msg.includes("api key not valid") ||
    msg.includes("api_key_invalid") ||
    msg.includes("permission denied")
  );
}

app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    hasServerApiKey: Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== "your_google_ai_studio_api_key_here"
    ),
    defaultModel: "gemini-3.8-flash"
  });
});

app.post("/api/interactions", async (req, res) => {
  const apiKey = resolveApiKey(req);
  if (!apiKey) {
    return res.status(401).json({
      error:
        "Chưa có Gemini API Key. Vui lòng nhập API Key từ Google AI Studio trong phần Cài đặt."
    });
  }

  const client = createGenAIClient(apiKey);
  const requestedModel = req.body.model || "gemini-3.8-flash";
  const candidateModels = [
    requestedModel,
    ...FALLBACK_MODELS.filter((m) => m !== requestedModel)
  ];

  let lastError = null;
  for (let i = 0; i < candidateModels.length; i++) {
    const modelName = candidateModels[i];
    try {
      const params = buildInteractionParams(
        req.body,
        i === 0 ? null : modelName,
        i === 0
      );
      const interaction = await client.interactions.create(params);

      if (interaction.status === "failed" || interaction.errors?.length) {
        const failErr = interaction.errors?.[0] || interaction.error || "Interaction failed";
        throw new Error(extractErrorMessage(failErr));
      }

      return res.json({
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
      if (isAuthKeyError(error)) {
        break;
      }
    }
  }

  const errText = extractErrorMessage(lastError);
  console.error("Interaction Error:", errText);
  res.status(lastError?.status || 500).json({
    error: errText
  });
});

app.post("/api/interactions/stream", async (req, res) => {
  const apiKey = resolveApiKey(req);
  if (!apiKey) {
    return res.status(401).json({
      error:
        "Chưa có Gemini API Key. Vui lòng nhập API Key từ Google AI Studio trong phần Cài đặt."
    });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  const client = createGenAIClient(apiKey);
  const requestedModel = req.body.model || "gemini-3.8-flash";
  const candidateModels = [
    requestedModel,
    ...FALLBACK_MODELS.filter((m) => m !== requestedModel)
  ];

  let lastError = null;
  for (let i = 0; i < candidateModels.length; i++) {
    const modelName = candidateModels[i];
    let hasSentContent = false;

    try {
      const params = {
        ...buildInteractionParams(
          req.body,
          i === 0 ? null : modelName,
          i === 0
        ),
        stream: true
      };

      const stream = await client.interactions.create(params);

      for await (const event of stream) {
        if (event.event_type === "error") {
          throw new Error(extractErrorMessage(event.error || event));
        }
        if (event.event_type === "step.delta" || event.event_type === "content.delta") {
          hasSentContent = true;
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (error) {
      lastError = error;
      if (hasSentContent || isAuthKeyError(error)) {
        break;
      }
      // Otherwise automatically try the next model in candidateModels!
    }
  }

  const errText = extractErrorMessage(lastError);
  console.error("Streaming Error:", errText);
  res.write(
    `data: ${JSON.stringify({
      event_type: "error",
      error: errText
    })}\n\n`
  );
  res.end();
});

app.listen(PORT, () => {
  console.log(`🚀 Furina AI Studio Web đang chạy tại: http://localhost:${PORT}`);
});
