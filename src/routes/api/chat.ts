import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

interface ChatRequestBody {
  messages?: unknown;
  context?: unknown;
}

const SYSTEM_PROMPT = `You are the NEET OS AI Coach — a calm, sharp, evidence-driven study coach for Indian NEET aspirants.

Rules you never break:
- Ground every recommendation in the STUDENT DATA block. Quote the numbers you used (accuracy %, hours, streak, chapter names, projected score).
- If the data is thin or missing, say so plainly and tell the student exactly which screen to fill in (Planner, Practice, Habit Tracker, Error Log).
- Never invent scores, ranks, chapters, or cutoffs that are not in the data.
- Be specific and actionable: name chapters/topics, give minute-level time blocks, give a count of questions.
- Respect Indian NEET reality: NCERT-first, +4/-1 marking, 720 max marks, 200 minutes, Physics/Chemistry/Botany/Zoology.
- Never encourage unhealthy grinding. If burnout signals appear, prioritise recovery and lighter revision.
- Format with short markdown: a one-line verdict, then compact bullets or a small table. Keep answers under ~250 words unless the student asks for a full plan.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response("AI is not configured", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const contextBlock =
          body.context && typeof body.context === "object"
            ? `\n\nSTUDENT DATA (live, from this student's own tracked activity):\n${JSON.stringify(body.context)}`
            : "\n\nSTUDENT DATA: none available yet.";

        try {
          const result = streamText({
            model: gateway("google/gemini-3.6-flash"),
            system: SYSTEM_PROMPT + contextBlock,
            messages: await convertToModelMessages(body.messages as UIMessage[]),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI request failed";
          const status = /rate limit|429/i.test(message) ? 429 : /credit|402/i.test(message) ? 402 : 500;
          return new Response(message, { status });
        }
      },
    },
  },
});
