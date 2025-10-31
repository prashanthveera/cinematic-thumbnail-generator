import { GoogleAuth } from "google-auth-library";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { prompt } = JSON.parse(event.body || "{}");
    if (!prompt) {
      return { statusCode: 400, body: "Missing prompt" };
    }

    // ✅ LOAD CREDENTIAL JSON
    const credJSON = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credJSON) {
      return { statusCode: 500, body: "Missing credentials env variable" };
    }

    const credentials = JSON.parse(credJSON);

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();

    const url =
      "https://us-central1-aiplatform.googleapis.com/v1/projects/" +
      credentials.project_id +
      "/locations/us-central1/publishers/google/models/imagen-3.0:predict";

    const payload = {
      instances: [
        {
          prompt,
        },
      ],
    };

    const response = await client.request({
      url,
      method: "POST",
      data: payload,
    });

    const images =
      response.data?.predictions?.map((p) => p.bytesBase64) || [];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
