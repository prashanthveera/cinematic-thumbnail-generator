import { GoogleAuth } from "google-auth-library";

export default async function handler(req, res) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });
    }

    const projectId = process.env.GOOGLE_PROJECT_ID;
    const credentialsJSON = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!projectId) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_PROJECT_ID" }), { status: 500 });
    }

    if (!credentialsJSON) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_APPLICATION_CREDENTIALS_JSON" }), { status: 500 });
    }

    const credentials = JSON.parse(credentialsJSON);

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();

    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0:predict`;

    const requestBody = {
      instances: [
        {
          prompt,
        },
      ],
    };

    const result = await client.request({
      url: endpoint,
      method: "POST",
      data: requestBody,
    });

    const base64 = result.data?.predictions?.[0]?.bytesBase64;

    if (!base64) {
      return new Response(JSON.stringify({ error: "No image returned" }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ image: base64 }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500 }
    );
  }
}
