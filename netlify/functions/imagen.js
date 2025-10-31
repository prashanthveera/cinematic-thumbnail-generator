// netlify/functions/imagen.js
import { GoogleAuth } from "google-auth-library";

const REGION = "us-central1";

// Primary (will likely 429 until approved)
const MODEL_PRIMARY = "google/imagen-4.0-fast-generate-001";

// Temporary working fallback
const MODEL_FALLBACK = "google/imagen-3.0-generate-002";

// Helpers
function extractBase64(predictions) {
  if (!predictions || !predictions.length) return null;
  // Vertex returns one of these depending on model/version
  return (
    predictions[0]?.bytesBase64 ||
    predictions[0]?.bytesBase64Encoded ||
    predictions[0]?.imageBytesBase64 ||
    null
  );
}

async function predict(client, projectId, modelId, prompt) {
  const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${REGION}/publishers/google/models/${modelId}:predict`;

  const payload = {
    // basic request; you can add parameters later (aspectRatio, etc.)
    instances: [{ prompt }],
  };

  const resp = await client.request({
    url,
    method: "POST",
    data: payload,
  });

  return resp?.data;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const body = req.body ? req.body : {};
    const prompt = (typeof body === "string" ? JSON.parse(body) : body)?.prompt;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const projectId = process.env.GOOGLE_PROJECT_ID;
    const saJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!projectId || !saJson) {
      return res
        .status(500)
        .json({ error: "Missing GOOGLE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS_JSON" });
    }

    const credentials = JSON.parse(saJson);
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();

    // 1) Try PRIMARY (Imagen-4 Fast)
    let data, base64;
    try {
      data = await predict(client, projectId, MODEL_PRIMARY, prompt);
      base64 = extractBase64(data?.predictions);
    } catch (err) {
      // If the error is quota (429) or model missing (404), we will fall through to fallback
      const status = err?.response?.status;
      const msg = err?.response?.data || err?.message;
      const isQuota =
        status === 429 ||
        (typeof msg === "string" && msg.toLowerCase().includes("quota"));
      const notFound = status === 404 || (typeof msg === "string" && msg.includes("not found"));
      if (!isQuota && !notFound) {
        // Other errors: bubble up
        throw err;
      }
    }

    // 2) If primary failed or returned nothing, try FALLBACK (Imagen-3)
    if (!base64) {
      const fallbackData = await predict(client, projectId, MODEL_FALLBACK, prompt);
      base64 = extractBase64(fallbackData?.predictions);
      if (!base64) {
        return res.status(500).json({ error: "No image returned from Imagen-3" });
      }
    }

    // Success
    return res.status(200).json({ images: [base64] });
  } catch (err) {
    console.error("SERVER ERROR →", err?.response?.data || err.message || err);
    return res
      .status(500)
      .json({ error: err?.response?.data || err.message || "Server error" });
  }
}
