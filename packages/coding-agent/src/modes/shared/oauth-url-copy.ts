import { isHyperlinkEnabled } from "../../tui/hyperlink";

export interface OAuthUrlCopyLeaseHost {
	beginOAuthUrlForCopy(url: string): () => void;
}

export interface OAuthUrlCopyLease {
	replace(url: string): void;
	release(): void;
}

export function buildOAuthLoginAnchor(url: string, label: string = url, hyperlinks = isHyperlinkEnabled()): string {
	return hyperlinks ? `\x1b]8;;${url}\x07${label}\x1b]8;;\x07` : label;
}

export function createOAuthUrlCopyLease(host: OAuthUrlCopyLeaseHost): OAuthUrlCopyLease {
	let releaseCurrent: (() => void) | undefined;

	return {
		replace(url: string): void {
			releaseCurrent?.();
			releaseCurrent = host.beginOAuthUrlForCopy(url);
		},
		release(): void {
			releaseCurrent?.();
			releaseCurrent = undefined;
		},
	};
}
