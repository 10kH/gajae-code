export interface OAuthUrlCopyLeaseHost {
	beginOAuthUrlForCopy(url: string): () => void;
}

export interface OAuthUrlCopyLease {
	replace(url: string): void;
	release(): void;
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
