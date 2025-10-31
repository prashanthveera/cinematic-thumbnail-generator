// netlify/functions/imagen.js
import { GoogleAuth } from "google-auth-library";

export default async function handler(req, res) {
  try {
    const body = req.body ? JSON.parse(req.body) : {};
    const prompt = body.prompt;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // ✅ ENV
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const saJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!projectId || !saJson) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const credentials = JSON.parse(saJson);

    // ✅ Auth
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();

    // ✅ Correct Imagen model
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate:predict`;

    const request = {
      instances: [
        {
          prompt,
        },
      ],
    };

    const response = await client.request({
      url: endpoint,
      method: "POST",
      data: request,
    });

    const preds = response?.data?.predictions;

    if (!preds || !preds.length) {
      return res.status(500).json({ error: "No image returned" });
    }

    // Return 1st base64 image
    const image = preds?.[0]?.bytesBase64 || null;

    if (!image) {
      return res.status(500).json({ error: "No base64 image found" });
    }

    return res.json({ image });

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}

export const config = {
  path: "/imagen",
};
