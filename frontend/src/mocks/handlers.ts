import { http, HttpResponse } from "msw";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const handlers = [
  http.get(`${BASE_URL}/api/todo/health`, () => {
    console.log("MSW: Intercepted GET /api/todo/health");
    return HttpResponse.json({ status: "ok" });
  }),
];
