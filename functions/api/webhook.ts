interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  BREVO_API_KEY: string;
  GIVE_BUTTER_SPONSOR_CHILD_ID: string;
}

/**
 * Helper to convert a PEM formatted private key string into a CryptoKey object
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem
    .replace(/\\n/g, "\n")
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s+/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASHA256",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign"]
  );
}

/**
 * Generates a Google OAuth Access Token using Web Crypto
 */
async function getGoogleAuthToken(clientEmail: string, privateKey: string): Promise<string> {
  const cryptoKey = await importPrivateKey(privateKey);

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: expiry,
    iat: now,
  };

  const stringifyAndEncode = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const encodedHeader = stringifyAndEncode(header);
  const encodedClaimSet = stringifyAndEncode(claimSet);
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    "RSASHA256",
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signatureInput}.${encodedSignature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(`Google OAuth failed: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

/**
 * Sends a transactional email using Brevo's free API tier
 */
async function sendSponsorshipEmail(apiKey: string, toEmail: string, firstName: string, refCode: string) {
  const sponsorLink = `https://guatemaltausa.org/sponsor.html?ref=${refCode}`;

  const payload = {
    sender: { name: "Guatemalta USA", email: "info@guatemaltausa.org" }, // Adjust to your verified Brevo sender
    to: [{ email: toEmail, name: firstName }],
    subject: "Thank you! Choose a child to sponsor",
    htmlContent: `
      <html>
        <body>
          <h2>Thank you for your generous donation, ${firstName}!</h2>
          <p>Your contribution will make a massive impact. To complete your sponsorship, please click the link below to select your child:</p>
          <p><a href="${sponsorLink}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Select Your Sponsored Child</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${sponsorLink}</p>
          <p>Your unique reference code is: <strong>${refCode}</strong></p>
        </body>
      </html>
    `
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Failed to send email via Brevo:", errText);
  }
}

/**
 * Main Cloudflare Pages Function Webhook Route Handler
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const event: any = await request.json();

    if (event && event.type === "transaction.succeeded") {
      const data = event.data;
      const amount = data.amount; // Givebutter standard float/integer
      const email = data.donor?.email;
      const firstName = data.donor?.first_name || "Supporter";

      // Match the exact $175 sponsorship target amount
      const incomingCampaignId = data.campaign_id?.toString();
      const targetCampaignId = env.GIVE_BUTTER_SPONSOR_CHILD_ID?.toString();
      //if (amount === 175 && email && incomingCampaignId === targetCampaignId) {
      if (email && incomingCampaignId === targetCampaignId) {
        // Generate alphanumeric 6-character reference token
        const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 1. Authenticate with Google API
        const authToken = await getGoogleAuthToken(env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);

        // 2. Build the targeted REST Firestore document URL definition
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/referrals?documentId=${refCode}`;

        // 3. Setup strict Firestore type mapping formatting rules
        const firestorePayload = {
          fields: {
            donorEmail: { stringValue: email },
            amount: { integerValue: amount.toString() },
            status: { stringValue: "unused" },
            selectedChildName: { nullValue: null }
          }
        };

        // 4. Save directly into your free Firestore DB instance
        const dbResponse = await fetch(firestoreUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(firestorePayload)
        });

        if (!dbResponse.ok) {
          const dbErr = await dbResponse.text();
          throw new Error(`Firestore REST insertion failed: ${dbErr}`);
        }

        // 5. Trigger the transactional email notification alert link
        await sendSponsorshipEmail(env.BREVO_API_KEY, email, firstName, refCode);

        console.log(`Successfully generated and emailed code ${refCode} to ${email}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Global Webhook Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};