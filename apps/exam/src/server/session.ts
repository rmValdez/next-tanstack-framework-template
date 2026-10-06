import { createServerFn } from "@tanstack/react-start";
import { readSession } from "./session.server";

// Server functions run only on the server; routes call them from beforeLoad/loaders on both
// SSR and client navigation (as RPC). Only plain data crosses that boundary. The compiler
// strips handler bodies from the client bundle, so the server-only import above never ships.

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface CurrentSession {
  user: SessionUser;
  expiresAt: string;
}

export const getSessionFn = createServerFn({ method: "GET" }).handler(() => readSession());
