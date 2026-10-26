import { getStore } from "@/lib/store";

/** Photos and quest cards. Ids are random, so knowing one is the access check. */
export async function GET(_request: Request, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(id)) return new Response("Not found", { status: 404 });
  const image = await getStore().getImage(id);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.bytes as BodyInit, {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
