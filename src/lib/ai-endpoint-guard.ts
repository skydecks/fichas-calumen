import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class AiEndpointError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AiEndpointError";
    this.status = status;
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIp(ip: string): boolean {
  const value = ip.toLowerCase();
  if (isIP(value) === 4) return isPrivateIpv4(value);
  if (isIP(value) !== 6) return true;

  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fe80") || value.startsWith("fc") || value.startsWith("fd")) {
    return true;
  }
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

/**
 * Evita SSRF hacia loopback, red privada, link-local y metadatos cloud.
 * Si se define AI_ALLOWED_HOSTS, solo se permiten esos hosts.
 */
export async function assertSafeAiEndpoint(baseUrl: string): Promise<void> {
  const url = new URL(baseUrl);
  const hostname = url.hostname.toLowerCase();
  const allowedHosts = (process.env.AI_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (allowedHosts.length > 0) {
    if (!allowedHosts.includes(hostname)) {
      throw new AiEndpointError(
        "El endpoint de IA no está en la lista de hosts permitidos.",
      );
    }
    return;
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal"
  ) {
    throw new AiEndpointError(
      "El endpoint de IA no puede apuntar a localhost ni a una red interna.",
    );
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new AiEndpointError(
        "El endpoint de IA no puede apuntar a una IP privada, loopback o de metadatos.",
      );
    }
    return;
  }

  let addresses: Array<{ address: string }> = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
      break;
    } catch {
      if (attempt === 2) {
        throw new AiEndpointError(
          "No se pudo resolver el host del endpoint de IA.",
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  if (addresses.length === 0 || addresses.some((item) => isPrivateIp(item.address))) {
    throw new AiEndpointError(
      "El endpoint de IA resuelve a una dirección privada o no válida.",
    );
  }
}
