// netlify/functions/imagen.js
const { GoogleAuth } = require("google-auth-library");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { prompt } = body;

    if (!prompt) {
      return { statusCode: 400, body: "Prompt required" };
    }

    const projectId = process.env.GOOGLE_PROJECT_ID;
    const saJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!projectId || !saJson) {
      return {
        statusCode: 500,
        body: "Missing GOOGLE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS_JSON",
      };
    }

    const credentials = JSON.parse(saJson);

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();

    // ✅ CORRECT MODEL
    const modelName =
      `projects/${projectId}/locations/us-central1/publishers/google/models/imagen-4.0-fast-generate-001`;

    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/${modelName}:predict`;

    const payload = {
      instances: [{ prompt }],
    };

    const apiResp = await client.request({
      url: endpoint,
      method: "POST",
      data: payload,
    });

    const preds = apiResp?.data?.predictions || [];

    if (!preds.length) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No images returned" }),
      };
    }

    const base64 = preds[0]?.bytesBase64;

    if (!base64) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing Base64 image" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
    };
  } catch (err) {
    console.error("SERVER ERROR →", err.message, err.response?.data);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
        details: err.response?.data,
      }),
    };
  }
};
