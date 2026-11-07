function explicitHost(value: string | undefined) {
  return value?.trim() ?? "";
}

function hostRoutingDisabled() {
  return process.env.NEXT_PUBLIC_DISABLE_HOST_ROUTING === "true";
}

function developmentPort(port?: string) {
  return port || process.env.PORT || "3000";
}

export function getAppHost(port?: string) {
  const explicit = explicitHost(process.env.NEXT_PUBLIC_APP_HOST);
  if (explicit) {
    return explicit;
  }
  if (hostRoutingDisabled()) {
    return "";
  }
  if (process.env.NODE_ENV === "development") {
    return `app.localhost:${developmentPort(port)}`;
  }
  return "";
}

export function getMarketingHost(port?: string) {
  const explicit = explicitHost(process.env.NEXT_PUBLIC_MARKETING_HOST);
  if (explicit) {
    return explicit;
  }
  if (hostRoutingDisabled()) {
    return "";
  }
  if (process.env.NODE_ENV === "development") {
    return `localhost:${developmentPort(port)}`;
  }
  return "";
}

export function isHostRoutingEnabled(
  appHost = getAppHost(),
  marketingHost = getMarketingHost(),
) {
  return Boolean(appHost && marketingHost);
}

export function stripHostPort(host: string) {
  return host.trim().replace(/:\d+$/, "").toLowerCase();
}

export function requestHostname(hostHeader: string | null) {
  if (!hostHeader) {
    return "";
  }

  return stripHostPort(hostHeader.split(",")[0] ?? "");
}

function marketingAliases(marketingHost: string) {
  const apex = stripHostPort(marketingHost).replace(/^www\./, "");
  const aliases = new Set([apex, `www.${apex}`]);
  if (apex === "localhost") {
    aliases.add("127.0.0.1");
  }
  return aliases;
}

export function isAppHostname(host: string, appHost = getAppHost()) {
  if (!appHost) {
    return false;
  }

  return stripHostPort(host) === stripHostPort(appHost);
}

/** RFC1918 addresses used to open the dev server from another device. */
export function isPrivateNetworkHostname(host: string) {
  const hostname = stripHostPort(host);
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  if (first === 10) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  return first === 172 && second >= 16 && second <= 31;
}

export function isMarketingHostname(
  host: string,
  marketingHost = getMarketingHost(),
) {
  if (!marketingHost) {
    return false;
  }

  return marketingAliases(marketingHost).has(stripHostPort(host));
}

export function hostOrigin(
  host: string,
  protocol: "http" | "https" = "https",
) {
  return `${protocol}://${host.replace(/\/$/, "")}`;
}
