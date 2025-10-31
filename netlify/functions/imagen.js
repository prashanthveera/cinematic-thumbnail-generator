// netlify/functions/imagen.js
const { GoogleAuth } = require("google-auth-library");

const REGION = "us-central1";

// Primary first → will fail due quota
const MODEL_PRIMARY = "google/imagen-4.0-fast-generate-001";

// Fallback → Imagen-3 works now
const MODEL_FALLBACK = "google/imagen-3.0-generate-002";

// Extract base64
function extractBase64(predictions) {
  if (!predictions || !predictions.length) return null;
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
    instances: [{ prompt }],
  };

  const resp = await client.request({
    url,
    method: "POST",
    data: payload,
  });

  return resp?.data;
}

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const prompt = body.prompt;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Prompt is required" }),
      };
    }

    const projectId = process.env.GOOGLE_PROJECT_ID;
    const saJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!projectId || !saJson) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing credentials" }),
      };
    }

    const credentials = JSON.parse(saJson);

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();

    let base64 = null;

    // Try primary (Imagen-4)
    try {
      const data = await predict(client, projectId, MODEL_PRIMARY, prompt);
      base64 = extractBase64(data?.predictions);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data || err?.message;
      const quota =
        status === 429 ||
        (typeof msg === "string" && msg.toLowerCase().includes("quota"));
      const missing =
        status === 404 || (typeof msg === "string" && msg.includes("not found"));
      if (!quota && !missing) throw err;
    }

    // If failed, fallback to Imagen-3
    if (!base64) {
      const fallbackData = await predict(
        client,
        projectId,
        MODEL_FALLBACK,
        prompt
      );
      base64 = extractBase64(fallbackData?.predictions);
      if (!base64) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "No image returned" }),
        };
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: [base64] }),
    };
  } catch (err) {
    console.error("SERVER ERROR →", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
};
