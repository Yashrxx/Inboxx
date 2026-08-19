/**
 * WhatsApp Business webhook — SCAFFOLD ONLY, DISABLED.
 *
 * When you're ready to activate:
 *   1. Set ENABLED = true below.
 *   2. Add these environment variables:
 *        WHATSAPP_VERIFY_TOKEN   — the token you give Meta during webhook setup
 *        WHATSAPP_ACCESS_TOKEN   — long-lived access token from the BSP / Meta
 *        WHATSAPP_PHONE_NUMBER_ID — the sending phone number ID
 *   3. In Meta / your BSP dashboard, configure the webhook URL to:
 *        https://<your-domain>/api/public/whatsapp
 *      and use WHATSAPP_VERIFY_TOKEN as the verify token.
 *   4. Uncomment the pipeline call in the POST handler — it routes inbound
 *      messages through the SAME RAG + Gemini pipeline as the public chat
 *      widget (see src/routes/api/public/chat.ts) and sends the reply back
 *      via the WhatsApp Cloud API.
 *
 * Until ENABLED is true, GET returns 200 (so verification handshakes don't
 * error during setup) and POST returns 503 so no message is processed.
 */
import { createFileRoute } from "@tanstack/react-router";

const ENABLED = false;

export const Route = createFileRoute("/api/public/whatsapp")({
  server: {
    handlers: {
      // Meta webhook verification handshake.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env.WHATSAPP_VERIFY_TOKEN;

        if (ENABLED && mode === "subscribe" && expected && token === expected) {
          return new Response(challenge ?? "", { status: 200 });
        }
        // Disabled / not-yet-configured: respond 200 so setup pings don't 500.
        return new Response("whatsapp webhook scaffold (disabled)", {
          status: 200,
        });
      },

      // Inbound message delivery from Meta / BSP.
      POST: async ({ request }) => {
        if (!ENABLED) {
          return new Response(JSON.stringify({ error: "WhatsApp integration not enabled yet." }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }

        // TODO (activation):
        //   const body = await request.json();
        //   const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        //   if (!msg || msg.type !== "text") return new Response("ok");
        //   const fromNumber = msg.from;
        //   const text = msg.text.body;
        //
        //   const { searchKb, buildContextBlock, CHAT_MODEL } = await import(
        //     "@/lib/rag.server"
        //   );
        //   const { CHAT_SYSTEM_PROMPT } = await import("@/lib/system-prompt");
        //   const matches = await searchKb(text, 5);
        //   const contextBlock = buildContextBlock(matches);
        //
        //   ... call Gemini API with CHAT_SYSTEM_PROMPT + contextBlock,
        //   ... POST the reply to https://graph.facebook.com/v20.0/
        //       {WHATSAPP_PHONE_NUMBER_ID}/messages with Bearer
        //       WHATSAPP_ACCESS_TOKEN, and log to answer_logs (type='chat').

        await request.text(); // drain body
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
