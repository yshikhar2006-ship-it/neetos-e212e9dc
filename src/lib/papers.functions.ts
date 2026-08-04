import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Thin RPC surface only — all orchestration lives in the *.server.ts helpers. */

export const extractPaperPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ paperId: z.string().uuid(), pageId: z.string().uuid(), force: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The reading service is not configured yet.");
    const { extractOnePage } = await import("@/lib/papers-extract.server");
    return extractOnePage(context.supabase, apiKey, data.paperId, data.pageId, data.force ?? false);
  });

export const finalizePaperExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ paperId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { finalizePaper } = await import("@/lib/papers-extract.server");
    return finalizePaper(context.supabase, data.paperId);
  });

export const commitPaperAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ paperId: z.string().uuid(), totalTimeSeconds: z.number().min(0).max(86400) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { commitPaper } = await import("@/lib/papers-commit.server");
    return commitPaper(context.supabase, context.userId, data.paperId, data.totalTimeSeconds);
  });
