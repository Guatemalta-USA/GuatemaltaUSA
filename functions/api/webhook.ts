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
      name: "RSASSA-PKCS1-v1_5",
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
    "RSASSA-PKCS1-v1_5",
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
  const sponsorLink = `https://guatemaltausa.org/sponsor-a-child?ref=${refCode}`;

  const payload = {
    sender: { name: "Guatemalta USA", email: "info@guatemaltausa.org" },
    to: [{ email: toEmail, name: firstName }],
    subject: "Thank you! Choose a child to sponsor",
    htmlContent: `
      <html>
        <body>
          <h2>Thank you for your generous donation, ${firstName}!</h2>
          <p>Your contribution will make a massive impact. To complete your sponsorship, please click the link below to select your child:</p>
          <p><a href="${sponsorLink}" style="padding: 10px 20px; background-color: #002E6C; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Select Your Sponsored Child</a></p>
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

async function sendDataEmail(apiKey: string, dataStr: string) {
  const payload = {
    sender: { name: "Guatemalta USA", email: "info@guatemaltausa.org" },
    to: [{ email: "ryan@guatemaltausa.org", name: "Ryan" }],
    subject: "Sponsor a child webhook data",
    htmlContent: `
      <html>
        <body>
          <p>A donation has been made to Sponsor A Child.</p>
          <br>
          <p>${dataStr}</p>
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

    if (event && event.event === "transaction.succeeded") {
      const data = event.data;

      const donationAmount = data.amount;
      const email = data.email;
      const firstName = data.first_name || "Supporter";
      const lastName = data.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();

      const incomingCampaignId = data.campaign_id?.toString();
      const targetCampaignId = env.GIVE_BUTTER_SPONSOR_CHILD_ID?.toString();

      const authToken = await getGoogleAuthToken(env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);

      if (incomingCampaignId === targetCampaignId) {
        if (email) {

          const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const currentYear = new Date().getFullYear();

          const firestorePayload = {
            fields: {
              refCode: { stringValue: refCode },
              donorName: { stringValue: fullName },
              donorEmail: { stringValue: email },
              selectedChildName: { nullValue: null },
              year: { integerValue: currentYear.toString() }
            }
          };
          const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/referrals?documentId=${refCode}`;
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
          //await sendSponsorshipEmail(env.BREVO_API_KEY, email, firstName, refCode);
          await sendDataEmail(env.BREVO_API_KEY, JSON.stringify(event.data))
          console.log(`Successfully processed Donor ${fullName} (${refCode})`);
        }
      } else {
        await sendDataEmail(env.BREVO_API_KEY, JSON.stringify(event.data));
        const commitUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;

        const incomingChange = donationAmount;

        const commitPayload = {
          writes: [
            {
              transform: {
                document: `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/campaignTotals/${incomingCampaignId}`,
                fieldTransforms: [
                  {
                    fieldPath: "amount",
                    increment: {
                      integerValue: incomingChange
                    }
                  }
                ]
              }
            }
          ]
        };

        const dbResponse = await fetch(commitUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(commitPayload)
        });

        if (!dbResponse.ok) {
          const dbErr = await dbResponse.text();
          throw new Error(`Firestore REST atomic increment failed: ${dbErr}`);
        }
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