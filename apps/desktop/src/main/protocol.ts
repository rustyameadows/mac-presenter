import { net, protocol } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const MEDIA_PROTOCOL = "presenter-media";

protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_PROTOCOL,
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true
    }
  }
]);

export function createMediaUrl(filePath: string): string {
  return `${MEDIA_PROTOCOL}://asset?path=${encodeURIComponent(filePath)}`;
}

export async function registerMediaProtocol(): Promise<void> {
  protocol.handle(MEDIA_PROTOCOL, async (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.searchParams.get("path") ?? "");

    if (!path.isAbsolute(filePath)) {
      return new Response("Bad request", { status: 400 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}
