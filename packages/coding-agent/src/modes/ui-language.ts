export const UI_LANGUAGES = ["en", "ko"] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];

const ENGLISH_STRINGS = {
	"settings.title": "Settings",
	"settings.navigationHint": "(tab to cycle)",
	"settings.selectHint": "  Enter to select · Esc to go back",
	"settings.preview": "Preview:",
	"settings.tab.appearance": "Appearance",
	"settings.tab.model": "Model",
	"settings.tab.interaction": "Interaction",
	"settings.tab.context": "Context",
	"settings.tab.memory": "Memory",
	"settings.tab.editing": "Editing",
	"settings.tab.tools": "Tools",
	"settings.tab.tasks": "Tasks",
	"settings.tab.providers": "Providers",
	"settings.tab.notifications": "Notifications",
	"settings.tab.plugins": "Plugins",
	"settings.tab.gjcBundles": "GJC Bundles",
	"settings.language.label": "Language",
	"settings.language.description": "Language for human-facing interactive UI text",
	"settings.language.english": "English",
	"settings.language.korean": "Korean (한국어)",
} as const;

export type UiStringKey = keyof typeof ENGLISH_STRINGS;

const KOREAN_STRINGS: Record<UiStringKey, string> = {
	"settings.title": "설정",
	"settings.navigationHint": "(Tab 키로 전환)",
	"settings.selectHint": "  Enter: 선택 · Esc: 뒤로",
	"settings.preview": "미리보기:",
	"settings.tab.appearance": "화면",
	"settings.tab.model": "모델",
	"settings.tab.interaction": "상호작용",
	"settings.tab.context": "컨텍스트",
	"settings.tab.memory": "메모리",
	"settings.tab.editing": "편집",
	"settings.tab.tools": "도구",
	"settings.tab.tasks": "작업",
	"settings.tab.providers": "공급자",
	"settings.tab.notifications": "알림",
	"settings.tab.plugins": "플러그인",
	"settings.tab.gjcBundles": "GJC 번들",
	"settings.language.label": "언어",
	"settings.language.description": "사람이 읽는 대화형 UI 텍스트의 언어",
	"settings.language.english": "English",
	"settings.language.korean": "한국어",
};

/** User selection is authoritative; invalid or unavailable values deterministically fall back to English. */
export function resolveUiLanguage(value: unknown): UiLanguage {
	return value === "ko" ? "ko" : "en";
}

export function uiString(language: unknown, key: UiStringKey): string {
	return resolveUiLanguage(language) === "ko" ? KOREAN_STRINGS[key] : ENGLISH_STRINGS[key];
}
