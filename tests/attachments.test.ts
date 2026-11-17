// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { stableAttachmentUrls } from '../src/lib/archive/attachments';

const id = '2fa28baf-40d9-440c-95a5-e1d167fd63cc';
const signed = `https://private-user-images.githubusercontent.com/316781378/708663952-${id}.png?jwt=eyJ0eXAi.eyJpc3Mi.sig`;
const stable = `https://github.com/user-attachments/assets/${id}`;

describe('stableAttachmentUrls', () => {
	it('replaces signed image links and sources with the stable address', () => {
		const html = `<p><a target="_blank" rel="noopener noreferrer" href="${signed}"><img src="${signed}" alt="Overview" style="max-width: 100%;"></a></p>`;
		expect(stableAttachmentUrls(html)).toBe(
			`<p><a target="_blank" rel="noopener noreferrer" href="${stable}"><img src="${stable}" alt="Overview" style="max-width: 100%;"></a></p>`
		);
	});

	it('handles escaped query separators and several images', () => {
		const html = `<img src="${signed}&amp;x=1"><img src="${signed.replace('.png', '.jpeg')}">`;
		expect(stableAttachmentUrls(html)).toBe(`<img src="${stable}"><img src="${stable}">`);
	});

	it('leaves other addresses alone', () => {
		const html = `<img src="${stable}"><img src="https://user-images.githubusercontent.com/1/abc.png"><a href="https://example.com/x?jwt=1">x</a>`;
		expect(stableAttachmentUrls(html)).toBe(html);
	});
});
