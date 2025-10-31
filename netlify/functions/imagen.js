export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { prompt } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing prompt" })
      };
    }

    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing GOOGLE_API_KEY" })
      };
    }

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages";

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

    const resp = await fetch(`${url}?key=${API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();   // ✅ Capture RAW
    console.log("RAW RESPONSE:", text);

    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid JSON returned", raw: text }),
      };
    }

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: data }),
      };
    }

    const images =
      (data.generatedImages || [])
        .map(g => g?.image?.imageBytes)
        .filter(Boolean);

    return {
      statusCode: 200,
      body: JSON.stringify({ images }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
