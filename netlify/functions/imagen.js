// netlify/functions/imagen.js

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    const { prompt } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing prompt" }),
      };
    }

    const API_KEY = process.env.GOOGLE_API_KEY;

    if (!API_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing GOOGLE_API_KEY" }),
      };
    }

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages?key=" +
      API_KEY;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        numberOfImages: 1,
        aspectRatio: "16:9",
      },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let dataText = await resp.text(); // read raw ALWAYS

    let data;
    try {
      data = JSON.parse(dataText);
    } catch {
      data = { raw: dataText };
    }

    if (!resp.ok) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Imagen error", details: data }),
      };
    }

    const images =
      (data.generatedImages || [])
        .map((x) => x?.image?.imageBytes)
        .filter(Boolean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server crash", details: err.toString() }),
    };
  }
}
