import { clearSession, getToken } from "../auth/authStorage.js";

// Empty API_URL uses Vite's same-origin proxy during local development.
// When hosted on GitHub Pages and no explicit VITE_API_URL is configured,
// default to http://localhost:8080 for testing against the local backend.
export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    let custom = localStorage.getItem("app_custom_api_url");
    if (custom) {
      custom = custom.trim().replace(/\/+$/, "")
        .replace(/locslhost/gi, "localhost")
        .replace(/loalhost/gi, "localhost")
        .replace(/locahost/gi, "localhost");
      return custom;
    }
  }
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location.hostname.includes("github.io")) {
    return "http://localhost:8085";
  }
  return "";
}

export function setApiBaseUrl(url) {
  if (typeof window !== "undefined") {
    if (!url || !url.trim()) {
      localStorage.removeItem("app_custom_api_url");
    } else {
      const sanitized = url.trim().replace(/\/+$/, "")
        .replace(/locslhost/gi, "localhost")
        .replace(/loalhost/gi, "localhost")
        .replace(/locahost/gi, "localhost");
      localStorage.setItem("app_custom_api_url", sanitized);
    }
  }
}

export class ApiError extends Error {
  constructor(message, status, path, responseMessage) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    this.responseMessage = responseMessage;
  }
}

export async function api(path, method = "GET", body) {
  const token = getToken();
  let response;
  const baseUrl = getApiBaseUrl();

  try {
    response = await fetch(baseUrl + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    const target = baseUrl || "http://localhost:8080";
    throw new Error(`Cannot reach the backend API at ${target}. Please make sure your backend is running.`);
  }

  const json = await readResponse(response);
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event("auth:expired"));
  }

  if (response.ok && json.success !== false) {
    return json.data;
  }

  throw new ApiError(json.message || getErrorMessage(response.status), response.status, path, json.message);
}

export async function apiList(path) {
  const data = await api(path);
  return Array.isArray(data) ? data : [];
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function getErrorMessage(status) {
  const messages = {
    401: "Your session has expired. Please log in again.",
    403: "Access denied. Your account may not have the role or permission required for this page. Use the portal for your role or contact your administrator.",
    404: "The requested resource was not found."
  };

  return messages[status] || `Request failed (${status})`;
}
