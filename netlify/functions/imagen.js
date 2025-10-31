export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { prompt } = JSON.parse(event.body || "{}");
    if (!prompt) {
      return { statusCode: 400, body: "Missing prompt" };
    }

    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!API_KEY) {
      return { statusCode: 500, body: "Missing GOOGLE_API_KEY" };
    }

    const PROJECT_ID = "gen-lang-client-0398562154";

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-4.0-generate:predict`;

    const payload = {
      instances: [{ prompt }],
      parameters: { sampleCount: 1 }
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    console.log("Imagen response:", JSON.stringify(data).slice(0,200));

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        body: JSON.stringify(data)
      };
    }

    const images = data?.predictions?.map(p => p.bytesBase64) || [];

    return {
      statusCode: 200,
      body: JSON.stringify({ images }),
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message || "Server error" })
    };
  }
}
