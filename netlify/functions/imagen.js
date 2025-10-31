// netlify/functions/imagen.js
export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { prompt } = JSON.parse(event.body || "{}");
    if (!prompt || typeof prompt !== "string") {
      return { statusCode: 400, body: "Missing prompt" };
    }

    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!API_KEY) {
      return { statusCode: 500, body: "Server missing GOOGLE_API_KEY" };
    }

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages";

    const payload = {
      prompt,
      config: {
        numberOfImages: 4,
        aspectRatio: "16:9",
      },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
    }

    const images =
      (data.generatedImages || [])
        .map(g => g?.image?.imageBytes)
        .filter(Boolean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    };

  } catch (e) {
    return { statusCode: 500, body: e.message || "Server error" };
  }
}
