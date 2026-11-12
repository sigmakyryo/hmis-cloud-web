import { HMIS_API_URL } from "@/constants/api";
import { isPrivateNetworkHostname } from "@/constants/hosts";

const LOCAL_MEDIA_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function sameOriginMediaPath(url: string) {
  if (url.startsWith("/media/")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (
      parsed.pathname.startsWith("/media/") &&
      (LOCAL_MEDIA_HOSTS.has(parsed.hostname) ||
        isPrivateNetworkHostname(parsed.hostname))
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Django stores uploaded files as `/media/...`. The browser loads them from
 * this app, which proxies `/media` to the API. That keeps images working on
 * a LAN address such as http://192.168.1.45:3000, where `localhost` is the
 * wrong machine.
 */
export function absoluteMediaUrl(
  url: string | null | undefined,
  _apiUrl: string | undefined = HMIS_API_URL,
): string {
  if (!url) {
    return "";
  }

  return sameOriginMediaPath(url) ?? url;
}

export function withBrowserAvatar<T extends { avatar_url?: string | null }>(
  user: T,
): T {
  const avatarUrl = absoluteMediaUrl(user.avatar_url);
  if (!avatarUrl || avatarUrl === user.avatar_url) {
    return user;
  }

  return {
    ...user,
    avatar_url: avatarUrl,
  };
}

export function withBrowserCustomerPhoto<T extends { photo_url?: string | null }>(
  customer: T,
): T {
  const photoUrl = absoluteMediaUrl(customer.photo_url);
  if (!photoUrl || photoUrl === customer.photo_url) {
    return customer;
  }

  return {
    ...customer,
    photo_url: photoUrl,
  };
}
