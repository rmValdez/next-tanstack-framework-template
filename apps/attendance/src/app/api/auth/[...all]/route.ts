import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(async (request: Request) =>
  (await getAuth()).handler(request)
);
