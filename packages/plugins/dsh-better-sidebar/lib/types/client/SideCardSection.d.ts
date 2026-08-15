import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type SidebarPrefs } from '../prefs-shared.ts';
import type { SidebarStore } from './state.ts';
import type { BetterSidebarService, SidebarSettingToggle } from './service.ts';
/** Injected business face: the shared store (prefs cache) + the sidebar service (registries). */
export interface SideCardSectionInjected {
    store: SidebarStore;
    service: BetterSidebarService;
}
/** Full section props: the runtime share plus the injected face. */
export type SideCardSectionProps = PropsRuntime<'settings.section'> & SideCardSectionInjected;
/**
 * The body of a feature's secondary settings popup: one row (title/desc +
 * control) per declared setting. Switches render the custom switch; text and
 * number rows render a free-form / numeric input committed on blur/Enter
 * (clamped to the declared min/max). Extracted so the rows are testable
 * without opening the Modal (the Modal portal renders only while open).
 */
export declare function FeatureSettingsRows(props: {
    toggles: readonly SidebarSettingToggle[];
    prefs: SidebarPrefs;
    onToggle: (toggle: SidebarSettingToggle, next: boolean) => void;
    /** Commit one text/number row; returns the canonical value the row should
     *  display (clamped for numbers, the current pref when the input is
     *  invalid). Optional: rows with no handler keep their draft. */
    onCommit?: (toggle: SidebarSettingToggle, raw: string) => string;
}): import("react").JSX.Element;
/**
 * Render the Side card preferences section.
 * @param props - composed slot props (runtime share + injected store/service).
 * @returns the section element tree.
 */
export declare function SideCardSection({ store, service }: SideCardSectionProps): import("react").JSX.Element;
