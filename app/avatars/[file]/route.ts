import { resolveAvatar } from "@/lib/avatar-storage";

export async function GET(_request: Request, { params }: RouteContext<"/avatars/[file]">) {
  const { file } = await params;
  const target = await resolveAvatar(file);
  if (!target) return new Response("Not found", { status: 404 });
  if ("redirect" in target) {
    return Response.redirect(target.redirect, 307);
  }
  return new Response(new Uint8Array(target.bytes), {
    headers: { "Content-Type": target.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
