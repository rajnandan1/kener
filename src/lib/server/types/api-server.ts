import type { Cookies } from "@sveltejs/kit";

export interface APIServerRequest {
  action: string;
  query: URLSearchParams;
  cookies: Cookies;
  headers: Headers;
  body?: any;
}

export type APIHandler = (req: APIServerRequest) => Response | Promise<Response>;
