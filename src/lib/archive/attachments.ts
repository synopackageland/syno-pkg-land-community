/**
 * GitHub renders attached images in bodyHTML as private-user-images URLs signed
 * with a JWT that expires five minutes later. The archive is served for hours,
 * so it stores the stable github.com/user-attachments/assets/<id> address
 * instead; GitHub signs that one again on every request, without sign-in.
 */
const SIGNED_IMAGE =
	/https:\/\/private-user-images\.githubusercontent\.com\/\d+\/\d+-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.[A-Za-z0-9]+(?:\?[^"'\s<>]*)?/g;

export function stableAttachmentUrls(html: string): string {
	return html.replace(SIGNED_IMAGE, (_, id: string) => `https://github.com/user-attachments/assets/${id}`);
}
