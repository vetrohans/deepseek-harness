window.__ModuleLoader__.load({
	id: "@local/dsh-client-ui-preview",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");

		//#region preview panel styles (self-injected, scoped class names)
		const css = ".vY0v1a_previewCol{box-sizing:border-box;border-left:1px solid var(--dsw-alias-border-l2);min-width:0;overflow:hidden;display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-base))}.vY0v1a_frame[data-preview-collapsed] .vY0v1a_previewCol{border-left:none}[data-side=preview]:after{content:\"\";box-sizing:border-box;background:var(--dsw-alias-button-floating-fill);border:1px solid var(--dsw-alias-border-l2-darkmode-thin);opacity:0;width:12px;height:32px;transition:opacity var(--ds-transition-duration-slow) var(--ds-ease-in-out),background var(--ds-transition-duration-slow) var(--ds-ease-in-out);border-radius:10px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.vY0v1a_previewCol:hover~[data-side=preview]:after,[data-side=preview]:hover:after,[data-side=preview][data-dragging=true]:after{opacity:1}[data-side=preview]:hover:after,[data-side=preview][data-dragging=true]:after{background:var(--dsw-alias-button-floating-hover);border-color:var(--dsw-alias-border-l3)}.dshpv_column{box-sizing:border-box;width:100%;height:100%;min-width:0;display:flex;flex-direction:column;overflow:hidden}.dshpv_bar{flex:none;display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dshpv_title{font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary);white-space:nowrap}.dshpv_url{flex:1;min-width:0;box-sizing:border-box;height:30px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-fill-l2);color:var(--dsw-alias-label-primary);font-size:12px;font-family:var(--dsw-font-mono,monospace)}.dshpv_url:focus{outline:none;border-color:var(--dsw-alias-accent,#4f8cff)}.dshpv_iconBtn{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:14px;text-decoration:none}.dshpv_iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dshpv_frame{flex:1;min-height:0;width:100%;border:0;background:#fff}.dshpv_popover{position:absolute;z-index:100;pointer-events:auto;display:flex;flex-direction:column;gap:2px;min-width:200px;max-width:340px;box-sizing:border-box;padding:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);font-size:12px}.dshpv_popUrl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);padding:2px 6px;font-family:var(--dsw-font-mono,monospace);font-size:11px}.dshpv_popBtn{display:flex;align-items:center;gap:6px;box-sizing:border-box;border:0;background:transparent;border-radius:6px;padding:7px 8px;color:var(--dsw-alias-label-primary);font-size:12px;line-height:16px;cursor:pointer;text-align:left}.dshpv_popBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}";
		const tagId = "@local/dsh-client-ui-preview/PreviewPanel.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@local/dsh-client-ui-preview";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		const styles = {
			column: "dshpv_column",
			bar: "dshpv_bar",
			title: "dshpv_title",
			url: "dshpv_url",
			iconBtn: "dshpv_iconBtn",
			frame: "dshpv_frame",
			popover: "dshpv_popover",
			popUrl: "dshpv_popUrl",
			popBtn: "dshpv_popBtn",
			balanceCapsule: "dshpv_balanceCapsule",
			rail: "dshqn_rail",
			marker: "dshqn_marker"
		};
		//#endregion

		//#region quick nav rail styles (self-injected, scoped class names)
		// NOTE: .xRnBFa_ / .zmN36a_ / .vDJq1q_ / .g27KSG_ are CSS-module hashes of the
		// installed conversation bundle (same fragility contract as apply-patches.py:
		// re-verify after a harness update). Data-attribute selectors are preferred
		// elsewhere because they survive bundle rebuilds.
		// Geometry: bars left edge aligns with the "对话" tab (28px); the content
		// (messages + composer) sits to the right of the bars at 64px.
		const navCss = [
			// unify ALL hover/pressed/selected grays (light theme only; covers settings,
			// sidebar nav, floating buttons, solid-hover rows)
			"body:not([data-ds-dark-theme]){--dsw-alias-interactive-bg-hover:#F3F3F3!important;--dsw-alias-interactive-bg-active:#F3F3F3!important;--dsw-alias-interactive-bg-hover-solid:#F3F3F3!important;--dsw-alias-button-floating-hover:#F3F3F3!important;--dsw-specific-sidebar-nav-item-hover:#F3F3F3!important;--dsw-specific-sidebar-nav-item-active:#F3F3F3!important;--dsw-alias-bg-module-platform:#F3F3F3!important;--dsw-specific-selector:#F3F3F3!important;--dsw-alias-bg-overlay:#F3F3F3!important;--dsw-specific-sidebar-fill:#FCFCFC!important}",
			// settings nav: force active/hover off the blue-gray, same #F3F3F3 as everywhere else (light theme only)
			"body:not([data-ds-dark-theme]) .ky8sCq_navCell:hover,body:not([data-ds-dark-theme]) .ky8sCq_navCell.ky8sCq_active{background:#F3F3F3!important}",
			"[data-conversation-scroll]{--dshqn-left:max(64px,calc((100% - var(--dsh-chat-content-width))/2));position:relative!important;--dsw-specific-bubble:#F3F3F3}",
			// Align the message column and the stats line with the input card: override
		// BOTH width vars to the composer width (780 = base 748 + 32) on the
		// ConversationRoot, breaking the calc(+32) relation so the two never
		// drift and no cycle forms. Value-coupled to the base width; re-tune
		// after an upstream update.
		"[data-phase]:has([data-conversation-scroll]){--dsh-chat-content-width:780px!important;--dsh-composer-card-max-width:780px!important}",
			"body[data-ds-dark-theme] [data-conversation-scroll]{--dsw-specific-bubble:var(--dsw-static-neutral-bluish-800)}",
			"[data-composer-card] ._4PgkvG_primary{background:#000!important;width:30.6px;height:30.6px}",
			"[data-composer-card] ._4PgkvG_primary:hover:not(:disabled){background:#333!important}",
			"[data-composer-card] textarea::placeholder{font-size:14px;color:#A2A4A6}",
			"[data-composer-card] ._4PgkvG_primary svg:has(> path){transform:scale(.87);transform-origin:center}",
			// common icons one notch smaller (square icon svgs, sized by width attr)
			"svg[width='12']{width:11px;height:11px}",
			"svg[width='14']{width:13px;height:13px}",
			"svg[width='16']{width:15px;height:15px}",
			"svg[width='18']{width:17px;height:17px}",
			"svg[width='20']{width:19px;height:19px}",
			"svg[width='24']{width:23px;height:23px}",
			// --- content centered in the pane (narrow: keep 64px left of the rail);
			// rail tracks the column's left edge ---
			".zmN36a_toBottomSlot{padding-right:max(0px,calc((100% - var(--dsh-chat-content-width))/2))!important}",
			"[data-queue-dock]{margin-left:calc(var(--dshqn-left) - 8px)!important}",
			".vDJq1q_root{margin-left:var(--dshqn-left)!important}",
			".g27KSG_root{align-items:flex-start!important;padding-left:calc(var(--dshqn-left) + (var(--dsw-composer-card-max-width) - var(--dsh-chat-content-width)) / 2)!important}",
			// --- rail (always pinned to the far left) ---
			".dshqn_rail{position:sticky;top:0;left:0;width:64px;height:0;flex:none;z-index:5;pointer-events:auto}",
			".dshqn_cluster{position:absolute;top:0;left:28px;transform:translateY(-50%);display:flex;flex-direction:column;align-items:flex-start;gap:3px;pointer-events:auto}",
			".dshqn_marker{display:block;height:2px;border:0;padding:0;margin:0;border-radius:2px;background:var(--dsw-alias-border-l4,var(--dsw-alias-border-l3));width:8px;transition:width .12s ease-out,background-color .12s ease-out;cursor:pointer}",
			".dshqn_marker[data-current='1']{background:var(--dsw-alias-label-primary)}",
			".dshqn_panel{position:absolute;left:100%;margin-left:10px;top:0;max-width:280px;min-width:140px;background:var(--dsw-specific-menu,var(--dsw-alias-bg-overlay,#fff));border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:var(--dsw-shadow-lv2);padding:9px 12px;pointer-events:none;opacity:0;transform:scale(.97);transform-origin:left center;transition:opacity .12s ease-out,transform .12s ease-out;font-size:11px;line-height:17px;color:var(--dsw-alias-label-tertiary)}",
			".dshqn_panel[data-show='1']{opacity:1;transform:scale(1)}",
			".dshqn_panelTitle{font-weight:600;color:var(--dsw-alias-label-primary);font-size:12px;line-height:19px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}",
			".dshqn_panelBody{margin-top:2px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}",
			// sidebar workspace rows: no hover arrow / folder swap; closed = gray folder,
			// expanded = blue open folder
			"._5TygFG_projectRow ._5TygFG_chevron{display:none!important}",
			"._5TygFG_projectRow:hover ._5TygFG_folder{display:inline-flex!important}",
			"._5TygFG_projectRow[aria-expanded='true'] ._5TygFG_folder{color:var(--dsw-alias-state-business-primary)!important}",
			// approval (等待审批) card: neutralize warn colors, align with composer
			".g27KSG_card{border-color:var(--dsw-alias-border-l2)!important}",
			".g27KSG_strip{background:var(--dsw-alias-bg-module-platform)!important;color:var(--dsw-alias-label-secondary)!important}",
			".g27KSG_dot{background:var(--dsw-alias-label-secondary)!important}",
			".g27KSG_root{align-items:flex-start!important;padding-left:calc(var(--dshqn-left) + (var(--dsw-composer-card-max-width) - var(--dsh-chat-content-width)) / 2)!important}",
			// "Deep diving…" running status: gray instead of blue
			".zmN36a_turnStatus{background-image:linear-gradient(90deg, var(--dsw-alias-label-secondary) 0%, var(--dsw-alias-label-secondary) 40%, var(--dsw-static-neutral-200) 50%, var(--dsw-alias-label-secondary) 60%, var(--dsw-alias-label-secondary) 100%)!important}",
			".zmN36a_turnStatusClock{color:#A2A4A6!important;-webkit-text-fill-color:#A2A4A6!important}",
			// sidebar rows: shorter hover rectangle
			"._5TygFG_projectRow{height:32px!important}",
			"._5TygFG_sessionRow{height:30px!important}",
			// sidebar workspace list: tighter vertical rhythm
			".GNQp-G_flatList>*+*,.GNQp-G_searchTree>[role=treeitem]+[role=treeitem],.GNQp-G_groupSection>*+*{margin-top:1px!important}",
			".GNQp-G_groupSection+.GNQp-G_groupSection{margin-top:2px!important}",
			".GNQp-G_sectionHeader{height:30px!important;margin-bottom:2px!important}",
			".GNQp-G_list{padding-bottom:8px!important}",
			// copy/action button under messages: hidden by default, shown on hover with the time
			"@media (hover:hover){[data-time-hover-root] .UACrWq_action{opacity:0;transition:opacity 80ms}[data-time-hover-root]:hover .UACrWq_action,[data-time-hover-root]:focus-within .UACrWq_action{opacity:1}}",
			// permission/access mode selector (Read-only/Workspace Write/Full access):
			// nudge it a bit to the left
			"[data-composer-card] ._4PgkvG_modes{margin-left:-16px!important}",
			// composer commands button: no gray circle at rest, keep hover fill
			"[data-composer-card] ._4PgkvG_add{background:transparent!important}",
			"[data-composer-card] ._4PgkvG_add:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)!important}",
			// context-usage ring: used portion = conversation tab blue
			".JjU0sa_fill{stroke:var(--dsw-alias-state-business-primary)!important}",
			// Think/Bash tool-call message rows: tighter line spacing
			".nTPDZa_summary,._206-Pq_summary{line-height:20px!important}",
			".nTPDZa_thinkBody{line-height:20px!important;padding-top:2px!important;padding-bottom:2px!important}",
			"._206-Pq_bodyWrap{margin-top:2px!important;margin-bottom:2px!important}",
			"@media (prefers-reduced-motion:reduce){.dshqn_marker,.dshqn_panel{transition:none}}"
		].join("");
		const navTagId = "@local/dsh-client-ui-preview/QuickNavRail.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(navTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@local/dsh-client-ui-preview";
			tag.dataset.pluginCss = navTagId;
			tag.textContent = navCss;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region balance capsule styles (self-injected, scoped class name)
		const balanceCss = ".dshpv_balanceCapsule{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);height:32px;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);cursor:pointer;background:transparent;border-radius:18px;justify-content:center;align-items:center;gap:4px;padding:6px 12px;font-size:12px;font-weight:500;line-height:20px;display:inline-flex;white-space:nowrap}.dshpv_balanceCapsule:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.dshpv_balanceCapsule[data-state=error],.dshpv_balanceCapsule[data-state=loading]{color:var(--dsw-alias-label-dimmed)}";
		const balanceTagId = "@local/dsh-client-ui-preview/BalanceCapsule.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(balanceTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@local/dsh-client-ui-preview";
			tag.dataset.pluginCss = balanceTagId;
			tag.textContent = balanceCss;
			document.head.appendChild(tag);
		}
		//#region font shrink: every theme font var -1px (shorthand + sub vars) and
		// every hardcoded conversation font-size -1px; hash classes are bundle-version
		// fragile (same contract as apply-patches.py)
		const fontCss = "body{--dsw-font-base-16:15px/23px var(--dsw-font-family);--dsw-font-base-16-font-family:var(--dsw-font-family);--dsw-font-base-16-font-size:15px;--dsw-font-base-16-font-style:normal;--dsw-font-base-16-font-weight:400;--dsw-font-base-16-line-height:23px;--dsw-font-base-strong-16:500 15px/23px var(--dsw-font-family);--dsw-font-base-strong-16-font-family:var(--dsw-font-family);--dsw-font-base-strong-16-font-size:15px;--dsw-font-base-strong-16-font-style:normal;--dsw-font-base-strong-16-font-weight:500;--dsw-font-base-strong-16-line-height:23px;--dsw-font-l-20:500 19px/27px var(--dsw-font-family);--dsw-font-l-20-font-family:var(--dsw-font-family);--dsw-font-l-20-font-size:19px;--dsw-font-l-20-font-style:normal;--dsw-font-l-20-font-weight:500;--dsw-font-l-20-line-height:27px;--dsw-font-m-18:500 15px/27px var(--dsw-font-family);--dsw-font-m-18-font-family:var(--dsw-font-family);--dsw-font-m-18-font-size:15px;--dsw-font-m-18-font-style:normal;--dsw-font-m-18-font-weight:500;--dsw-font-m-18-line-height:27px;--dsw-font-markdown-base:15px/27px var(--dsw-font-family);--dsw-font-markdown-base-font-family:var(--dsw-font-family);--dsw-font-markdown-base-font-size:15px;--dsw-font-markdown-base-font-style:normal;--dsw-font-markdown-base-font-weight:400;--dsw-font-markdown-base-italic:italic 15px/27px var(--dsw-font-family);--dsw-font-markdown-base-italic-font-family:var(--dsw-font-family);--dsw-font-markdown-base-italic-font-size:15px;--dsw-font-markdown-base-italic-font-style:italic;--dsw-font-markdown-base-italic-font-weight:400;--dsw-font-markdown-base-italic-line-height:27px;--dsw-font-markdown-base-line-height:27px;--dsw-font-markdown-base-strong:600 15px/27px var(--dsw-font-family);--dsw-font-markdown-base-strong-font-family:var(--dsw-font-family);--dsw-font-markdown-base-strong-font-size:15px;--dsw-font-markdown-base-strong-font-style:normal;--dsw-font-markdown-base-strong-font-weight:600;--dsw-font-markdown-base-strong-italic:italic 600 15px/27px var(--dsw-font-family);--dsw-font-markdown-base-strong-italic-font-family:var(--dsw-font-family);--dsw-font-markdown-base-strong-italic-font-size:15px;--dsw-font-markdown-base-strong-italic-font-style:italic;--dsw-font-markdown-base-strong-italic-font-weight:600;--dsw-font-markdown-base-strong-italic-line-height:27px;--dsw-font-markdown-base-strong-line-height:27px;--dsw-font-markdown-code:13px/21px var(--ds-font-family-code);--dsw-font-markdown-code-block:12px/21px var(--ds-font-family-code);--dsw-font-markdown-code-block-font-family:var(--ds-font-family-code);--dsw-font-markdown-code-block-font-size:12px;--dsw-font-markdown-code-block-font-style:normal;--dsw-font-markdown-code-block-font-weight:400;--dsw-font-markdown-code-block-line-height:21px;--dsw-font-markdown-code-block-small:11px/17px var(--ds-font-family-code);--dsw-font-markdown-code-block-small-font-family:var(--ds-font-family-code);--dsw-font-markdown-code-block-small-font-size:11px;--dsw-font-markdown-code-block-small-font-style:normal;--dsw-font-markdown-code-block-small-font-weight:400;--dsw-font-markdown-code-block-small-line-height:17px;--dsw-font-markdown-code-font-family:var(--ds-font-family-code);--dsw-font-markdown-code-font-size:13px;--dsw-font-markdown-code-font-style:normal;--dsw-font-markdown-code-font-weight:400;--dsw-font-markdown-code-line-height:21px;--dsw-font-markdown-h1:700 23px/33px var(--dsw-font-family);--dsw-font-markdown-h1-font-family:var(--dsw-font-family);--dsw-font-markdown-h1-font-size:23px;--dsw-font-markdown-h1-font-style:normal;--dsw-font-markdown-h1-font-weight:700;--dsw-font-markdown-h1-line-height:33px;--dsw-font-markdown-h2:700 21px/31px var(--dsw-font-family);--dsw-font-markdown-h2-font-family:var(--dsw-font-family);--dsw-font-markdown-h2-font-size:21px;--dsw-font-markdown-h2-font-style:normal;--dsw-font-markdown-h2-font-weight:700;--dsw-font-markdown-h2-line-height:31px;--dsw-font-markdown-h3:700 19px/29px var(--dsw-font-family);--dsw-font-markdown-h3-font-family:var(--dsw-font-family);--dsw-font-markdown-h3-font-size:19px;--dsw-font-markdown-h3-font-style:normal;--dsw-font-markdown-h3-font-weight:700;--dsw-font-markdown-h3-line-height:29px;--dsw-font-markdown-h4:600 15px/27px var(--dsw-font-family);--dsw-font-markdown-h4-font-family:var(--dsw-font-family);--dsw-font-markdown-h4-font-size:15px;--dsw-font-markdown-h4-font-style:normal;--dsw-font-markdown-h4-font-weight:600;--dsw-font-markdown-h4-line-height:27px;--dsw-font-markdown-small:13px/23px var(--dsw-font-family);--dsw-font-markdown-small-font-family:var(--dsw-font-family);--dsw-font-markdown-small-font-size:13px;--dsw-font-markdown-small-font-style:normal;--dsw-font-markdown-small-font-weight:400;--dsw-font-markdown-small-italic:italic 13px/23px var(--dsw-font-family);--dsw-font-markdown-small-italic-font-family:var(--dsw-font-family);--dsw-font-markdown-small-italic-font-size:13px;--dsw-font-markdown-small-italic-font-style:italic;--dsw-font-markdown-small-italic-font-weight:400;--dsw-font-markdown-small-italic-line-height:23px;--dsw-font-markdown-small-line-height:23px;--dsw-font-markdown-small-strong:600 13px/23px var(--dsw-font-family);--dsw-font-markdown-small-strong-font-family:var(--dsw-font-family);--dsw-font-markdown-small-strong-font-size:13px;--dsw-font-markdown-small-strong-font-style:normal;--dsw-font-markdown-small-strong-font-weight:600;--dsw-font-markdown-small-strong-italic:italic 600 13px/23px var(--dsw-font-family);--dsw-font-markdown-small-strong-italic-font-family:var(--dsw-font-family);--dsw-font-markdown-small-strong-italic-font-size:13px;--dsw-font-markdown-small-strong-italic-font-style:italic;--dsw-font-markdown-small-strong-italic-font-weight:600;--dsw-font-markdown-small-strong-italic-line-height:23px;--dsw-font-markdown-small-strong-line-height:23px;--dsw-font-markdown-table:14px/24px var(--dsw-font-family);--dsw-font-markdown-table-font-family:var(--dsw-font-family);--dsw-font-markdown-table-font-size:14px;--dsw-font-markdown-table-font-style:normal;--dsw-font-markdown-table-font-weight:400;--dsw-font-markdown-table-head:500 14px/24px var(--dsw-font-family);--dsw-font-markdown-table-head-font-family:var(--dsw-font-family);--dsw-font-markdown-table-head-font-size:14px;--dsw-font-markdown-table-head-font-style:normal;--dsw-font-markdown-table-head-font-weight:500;--dsw-font-markdown-table-head-line-height:24px;--dsw-font-markdown-table-line-height:24px;--dsw-font-s-14:13px/21px var(--dsw-font-family);--dsw-font-s-14-font-family:var(--dsw-font-family);--dsw-font-s-14-font-size:13px;--dsw-font-s-14-font-style:normal;--dsw-font-s-14-font-weight:400;--dsw-font-s-14-line-height:21px;--dsw-font-s-strong-14:500 13px/21px var(--dsw-font-family);--dsw-font-s-strong-14-font-family:var(--dsw-font-family);--dsw-font-s-strong-14-font-size:13px;--dsw-font-s-strong-14-font-style:normal;--dsw-font-s-strong-14-font-weight:500;--dsw-font-s-strong-14-line-height:21px;--dsw-font-xl-24:600 23px/31px var(--dsw-font-family);--dsw-font-xl-24-font-family:var(--dsw-font-family);--dsw-font-xl-24-font-size:23px;--dsw-font-xl-24-font-style:normal;--dsw-font-xl-24-font-weight:600;--dsw-font-xl-24-line-height:31px;--dsw-font-xs-13:12px/19px var(--dsw-font-family);--dsw-font-xs-13-font-family:var(--dsw-font-family);--dsw-font-xs-13-font-size:12px;--dsw-font-xs-13-font-style:normal;--dsw-font-xs-13-font-weight:400;--dsw-font-xs-13-line-height:19px;--dsw-font-xs-strong-13:500 12px/19px var(--dsw-font-family);--dsw-font-xs-strong-13-font-family:var(--dsw-font-family);--dsw-font-xs-strong-13-font-size:12px;--dsw-font-xs-strong-13-font-style:normal;--dsw-font-xs-strong-13-font-weight:500;--dsw-font-xs-strong-13-line-height:19px;--dsw-font-xxs-12:11px/17px var(--dsw-font-family);--dsw-font-xxs-12-font-family:var(--dsw-font-family);--dsw-font-xxs-12-font-size:11px;--dsw-font-xxs-12-font-style:normal;--dsw-font-xxs-12-font-weight:400;--dsw-font-xxs-12-line-height:17px;--dsw-font-xxs-strong-12:500 11px/17px var(--dsw-font-family);--dsw-font-xxs-strong-12-font-family:var(--dsw-font-family);--dsw-font-xxs-strong-12-font-size:11px;--dsw-font-xxs-strong-12-font-style:normal;--dsw-font-xxs-strong-12-font-weight:500;--dsw-font-xxs-strong-12-line-height:17px;--dsw-font-xxxs-11:10px/13px var(--dsw-font-family);--dsw-font-xxxs-11-font-family:var(--dsw-font-family);--dsw-font-xxxs-11-font-size:10px;--dsw-font-xxxs-11-font-style:normal;--dsw-font-xxxs-11-font-weight:400;--dsw-font-xxxs-11-line-height:13px;--dsw-font-xxxs-strong-11:500 10px/13px var(--dsw-font-family);--dsw-font-xxxs-strong-11-font-family:var(--dsw-font-family);--dsw-font-xxxs-strong-11-font-size:10px;--dsw-font-xxxs-strong-11-font-style:normal;--dsw-font-xxxs-strong-11-font-weight:500;--dsw-font-xxxs-strong-11-line-height:13px}.nTPDZa_summary{font-size:13px!important}.nTPDZa_thinkBody{font-size:13px!important}.JCp48a_source{font-size:13px!important}.JCp48a_summary{font-size:13px!important}.LZxFoa_code{font-size:12px!important}.LZxFoa_empty{font-size:12px!important}.LZxFoa_sectionLabel{font-size:11px!important}.LZxFoa_title{font-size:13px!important}.JjU0sa_panel{font-size:11px!important}.g27KSG_command{font-size:12px!important}.g27KSG_headline{font-size:14px!important}.g27KSG_strip{font-size:12px!important}.vDJq1q_item{font-size:12px!important}.vDJq1q_progress{font-size:12px!important}.vDJq1q_title{font-size:12px!important}._206-Pq_summary{font-size:13px!important}.oyDl9W_bubble{font-size:15px!important;line-height:23px!important}.oyDl9W_compactionBody{font-size:13px!important}.oyDl9W_compactionSummary{font-size:13px!important}.oyDl9W_compactionTitle{font-size:13px!important}.oyDl9W_retryDetails{font-size:11px!important}.oyDl9W_retryRow{font-size:12px!important}.oyDl9W_turnErrorRow{font-size:12px!important}.Hgm69W_crumb{font-size:13px!important}.Hgm69W_crumbSep{font-size:13px!important}.Hgm69W_tab{font-size:12px!important}.udkeoW_headline{font-size:25px!important}.udkeoW_modalError{font-size:11px!important}.udkeoW_modalInput{font-size:13px!important}.udkeoW_previewBadge{font-size:11px!important}.udkeoW_workspace{font-size:12px!important}._9tLbjq_count{font-size:12px!important}._06J-ya_desc{font-size:11px!important}._06J-ya_selector{font-size:13px!important}._06J-ya_title{font-size:13px!important}.JjU0sa_trigger{font-size:12px!important}.UACrWq_timeEnd{font-size:13px!important}.UACrWq_timeStart{font-size:13px!important}._4PgkvG_card{font-size:15px!important;line-height:23px!important}._4PgkvG_notice{font-size:11px!important}._4PgkvG_retry{font-size:11px!important}._4PgkvG_select{font-size:12px!important}.PRHhDq_root{font-size:15px!important}.PRHhDq_stopped{font-size:10px!important}.zmN36a_hint{font-size:11px!important}.zmN36a_openError{font-size:11px!important}";
		const fontTagId = "@local/dsh-client-ui-preview/FontShrink.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(fontTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@local/dsh-client-ui-preview";
			tag.dataset.pluginCss = fontTagId;
			tag.textContent = fontCss;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region locale dictionaries
		const zh = {
			"menu.openDsh": "用 DSH 打开",
			"menu.openBrowser": "用浏览器打开",
			"balance.title": "DeepSeek API 余额（点击刷新）",
			"balance.error": "余额获取失败"
		};
		const en = {
			"menu.openDsh": "Open in DSH",
			"menu.openBrowser": "Open in browser",
			"balance.title": "DeepSeek API balance (click to refresh)",
			"balance.error": "Failed to load balance"
		};
		//#endregion

		/** Default preview target: the local dev server of the workspace app. */

		/** Tiny external store (useSyncExternalStore compatible). */
		function createExternalStore(initial) {
			let state = initial;
			const listeners = /* @__PURE__ */ new Set();
			return {
				getSnapshot: () => state,
				subscribe: (fn) => {
					listeners.add(fn);
					return () => {
						listeners.delete(fn);
					};
				},
				set: (next) => {
					const value = typeof next === "function" ? next(state) : next;
					if (value === state) return;
					state = value;
					for (const fn of [...listeners]) fn();
				}
			};
		}

		/** Floating link-chooser state. */
		const popoverStore = createExternalStore({ visible: false, x: 0, y: 0, url: "" });

		//#region DeepSeek API balance (account-level, shared across sessions)
		const BALANCE_PATH = "/api/deepseek-balance";
		const BALANCE_REFRESH_MS = 60000;
		/** Balance snapshot: status is "loading" | "ready" | "unavailable" | "error". */
		const balanceStore = createExternalStore({ status: "loading", total: null });
		let balanceInFlight = null;
		/** Fetch the DeepSeek account balance from the host proxy (dedupes concurrent calls). */
		function fetchBalance() {
			if (balanceInFlight !== null) return balanceInFlight;
			balanceStore.set((s) => ({ status: "loading", total: s.total }));
			balanceInFlight = fetch(BALANCE_PATH, { method: "GET", cache: "no-store" })
				.then((res) => {
					if (!res.ok) throw new Error("balance http " + res.status);
					return res.json();
				})
				.then((data) => {
					const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : [];
					const info = infos.find((entry) => entry && entry.currency === "CNY") ?? infos[0];
					const total = info !== void 0 && (typeof info.total_balance === "string" || typeof info.total_balance === "number")
						? String(info.total_balance)
						: null;
					if (data?.is_available !== false && total !== null) {
						balanceStore.set({ status: "ready", total });
					} else {
						balanceStore.set({ status: "unavailable", total: null });
					}
				})
				.catch(() => {
					balanceStore.set((s) => ({ status: "error", total: s.total }));
				})
				.finally(() => {
					balanceInFlight = null;
				});
			return balanceInFlight;
		}
		//#endregion

		/**
		* Whether a raw href is an absolute server address (localhost, loopback,
		* IPv4 literal, or any host with an explicit port) — the links the chooser
		* cares about.
		*/
		function isServerLink(rawHref) {
			if (!/^https?:\/\//i.test(rawHref)) return false;
			let u;
			try {
				u = new URL(rawHref);
			} catch {
				return false;
			}
			const host = u.hostname;
			if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
			if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
			return u.port !== "";
		}

		/**
		* Floating chooser shown after clicking a server link in the conversation:
		* open in the DSH preview column, or open in a browser tab.
		*/
		function LinkChooserPopover({ t, onOpenDsh, onOpenBrowser }) {
			const pop = react.useSyncExternalStore(popoverStore.subscribe, popoverStore.getSnapshot);
			if (!pop.visible) return null;
			const left = Math.max(8, Math.min(pop.x, window.innerWidth - 260));
			const top = Math.max(8, Math.min(pop.y, window.innerHeight - 104));
			return react_jsx_runtime.jsx("div", {
				className: styles.popover,
				style: { left, top },
				"data-dshpv-popover": true,
				role: "menu",
				children: [
					react_jsx_runtime.jsx("div", { className: styles.popUrl, children: pop.url }),
					react_jsx_runtime.jsx("button", {
						className: styles.popBtn,
						type: "button",
						onClick: () => onOpenDsh(pop.url),
						children: t("menu.openDsh")
					}),
					react_jsx_runtime.jsx("button", {
						className: styles.popBtn,
						type: "button",
						onClick: () => onOpenBrowser(pop.url),
						children: t("menu.openBrowser")
					})
				]
			});
		}

		/**
		* Session-header capsule showing the DeepSeek account balance (CNY total).
		* Renders beside the built-in "Session log" capsule in the same utilities slot.
		*/
		function BalanceCapsule({ t }) {
			const balance = react.useSyncExternalStore(balanceStore.subscribe, balanceStore.getSnapshot);
			(0, react.useEffect)(() => {
				fetchBalance();
				const timer = setInterval(fetchBalance, BALANCE_REFRESH_MS);
				return () => clearInterval(timer);
			}, []);
			if (balance.status === "unavailable") return null;
			const label = balance.status === "ready" && balance.total !== null
				? "\u00A5 " + balance.total
				: balance.status === "error" ? "\u2014" : "\u2026";
			return react_jsx_runtime.jsx("button", {
				className: styles.balanceCapsule,
				type: "button",
				"data-state": balance.status,
				title: balance.status === "error" ? t("balance.title") + " \u2014 " + t("balance.error") : t("balance.title"),
				"aria-label": t("balance.title"),
				onClick: () => fetchBalance(),
				children: label
			});
		}

		//#region quick nav rail (left quick-locate for user messages)
		/** Static aria/title copy shared by every rail marker (no locale service here). */
		const tNavLabel = "定位到这条消息 / Jump to this message";
		/**
		* Left-edge quick-locate rail. All user messages render as one compact,
		* vertically-centred cluster of horizontal bars (filmstrip / thumbnail
		* navigation): the bar nearest the viewport centre is dark & long, the rest
		* are short grey bars. Hovering the rail applies a fisheye (the bar under
		* the pointer is longest, neighbours shorten away) and pops a rounded panel
		* showing that message's text; clicking jumps the scroll body to it. Rows
		* come from [data-chat-flow-kind="user"] inside [data-conversation-scroll].
		*/
		function installQuickNavRail() {
			if (typeof document === "undefined" || document.body === null) return () => {};
			let sc = null;
			let rail = null;
			let cluster = null;
			let panel = null;
			let panelTitle = null;
			let panelBody = null;
			let markers = [];
			let hoverIdx = null;
			let raf = 0;
			let scMo = null;
			let scRo = null;
			let rowRo = null;
			let seatRo = null;

			function scheduleSync() {
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(sync);
			}

			function sync() {
				if (sc === null || rail === null) return;
				const rows = [...sc.querySelectorAll('[data-chat-flow-kind="user"]')];
				const byRow = new Map();
				for (const m of markers) byRow.set(m.row, m);
				const nextMarkers = [];
				for (const row of rows) {
					let m = byRow.get(row);
					if (m === void 0) {
						m = {
							row,
							replyRow: null,
							el: document.createElement("button"),
							y: 0
						};
						m.el.className = styles.marker;
						m.el.type = "button";
						m.el.setAttribute("aria-label", tNavLabel);
						cluster.appendChild(m.el);
					} else {
						byRow.delete(row);
					}
					nextMarkers.push(m);
				}
				for (const m of byRow.values()) m.el.remove();
				markers = nextMarkers;
				// resolve each user turn's final assistant reply (for the hover panel)
				const allRows = [...sc.querySelectorAll("[data-chat-anchor-key]")];
				const posOf = new Map();
				for (let i = 0; i < allRows.length; i++) posOf.set(allRows[i], i);
				const userPos = markers.map((m) => posOf.get(m.row)).filter((p) => p !== void 0);
				for (let k = 0; k < markers.length; k++) {
					const from = userPos[k];
					const to = k + 1 < markers.length ? userPos[k + 1] : allRows.length;
					let reply = null;
					for (let i = to - 1; i > from; i--) {
						if (allRows[i].getAttribute("data-chat-flow-kind") === "assistant") {
							reply = allRows[i];
							break;
						}
					}
					markers[k].replyRow = reply;
				}
				if (rowRo !== null) {
					rowRo.disconnect();
					for (const row of rows) rowRo.observe(row);
				}
				// keep the cluster compact when there are many messages
				const n = markers.length;
				if (n > 1) {
					const maxH = 360;
					const barH = 2;
					for (const m of markers) m.el.style.height = barH + "px";
					let gap = 8;
					const natural = n * barH + (n - 1) * gap;
					if (natural > maxH) gap = Math.max(1, (maxH - n * barH) / (n - 1));
					cluster.style.gap = gap + "px";
				}
				const cRect = sc.getBoundingClientRect();
				const scrollTop = sc.scrollTop;
				for (const m of markers) {
					const r = m.row.getBoundingClientRect();
					m.y = r.top - cRect.top + scrollTop + r.height / 2;
				}
				rail.style.top = (sc.clientHeight / 2) + "px";
				rail.style.display = n >= 2 ? "" : "none";
				if (hoverIdx !== null) hoverIdx = Math.min(hoverIdx, Math.max(0, n - 1));
			}

			function applyLens() {
				for (let i = 0; i < markers.length; i++) {
					const m = markers[i];
					let w = 8;
					let active = false;
					if (hoverIdx !== null) {
						const d = Math.abs(i - hoverIdx);
						const t = Math.max(0, 1 - d / 6);
						w = Math.max(5, Math.round(26 * t));
						active = d === 0;
					}
					m.el.style.width = w + "px";
					m.el.dataset.current = active ? "1" : "0";
				}
			}

			function indexAt(clientY) {
				if (markers.length === 0) return null;
				const cr = cluster.getBoundingClientRect();
				const step = cr.height / markers.length;
				return Math.max(0, Math.min(markers.length - 1, Math.floor((clientY - cr.top) / step)));
			}

			function showPanel(idx) {
				const m = markers[idx];
				const userText = (m.row.innerText || m.row.textContent || "").replace(/[ \t]*\n[ \t]*/g, "\n").trim();
				const replyText = m.replyRow !== null
					? (m.replyRow.innerText || m.replyRow.textContent || "").replace(/[ \t]*\n[ \t]*/g, "\n").trim()
					: "";
				panelTitle.textContent = userText !== "" ? userText : "\u2026";
				if (replyText !== "") {
					panelBody.textContent = replyText;
					panelBody.style.display = "";
				} else {
					panelBody.textContent = "";
					panelBody.style.display = "none";
				}
				panel.dataset.show = "1";
				const railRect = rail.getBoundingClientRect();
				const cr = cluster.getBoundingClientRect();
				const step = cr.height / markers.length;
				const barCenter = cr.top + (idx + 0.5) * step;
				const scrollTop = sc.getBoundingClientRect().top;
				let top = barCenter - panel.offsetHeight / 2 - railRect.top;
				const minTop = 8 + scrollTop - railRect.top;
				const maxTop = (sc.clientHeight - panel.offsetHeight - 8) + scrollTop - railRect.top;
				top = Math.max(minTop, Math.min(top, maxTop));
				panel.style.top = top.toFixed(1) + "px";
			}

			function hidePanel() {
				panel.dataset.show = "0";
			}

			function onMove(event) {
				const idx = indexAt(event.clientY);
				if (idx === null) return;
				hoverIdx = idx;
				applyLens();
				showPanel(idx);
			}

			function onLeave() {
				hoverIdx = null;
				applyLens();
				hidePanel();
			}

			function onClick(event) {
				const idx = indexAt(event.clientY);
				if (idx !== null) {
					sc.scrollTo({
						top: Math.max(0, markers[idx].y - sc.clientHeight * 0.35),
						behavior: "smooth"
					});
				}
			}

			function attach(next) {
				sc = next;
				rail = document.createElement("div");
				rail.className = styles.rail;
				cluster = document.createElement("div");
				cluster.className = "dshqn_cluster";
				panel = document.createElement("div");
				panel.className = "dshqn_panel";
				panel.dataset.show = "0";
				panelTitle = document.createElement("div");
				panelTitle.className = "dshqn_panelTitle";
				panelBody = document.createElement("div");
				panelBody.className = "dshqn_panelBody";
				panel.appendChild(panelTitle);
				panel.appendChild(panelBody);
				rail.appendChild(cluster);
				rail.appendChild(panel);
				sc.insertBefore(rail, sc.firstChild);
				rail.addEventListener("mousemove", onMove);
				rail.addEventListener("mouseleave", onLeave);
				rail.addEventListener("click", onClick);
				scMo = new MutationObserver(scheduleSync);
				scMo.observe(sc, { childList: true, subtree: true });
				scRo = new ResizeObserver(scheduleSync);
				scRo.observe(sc);
				rowRo = new ResizeObserver(scheduleSync);
				seatRo = new ResizeObserver(scheduleSync);
				const seat = sc.querySelector("[data-composer-seat]");
				if (seat !== null) seatRo.observe(seat);
				sync();
			}

			function teardown() {
				if (sc !== null) {
					const seat = sc.querySelector("[data-composer-seat]");
					if (seat !== null && seatRo !== null) seatRo.unobserve(seat);
				}
				if (rail !== null && rail.parentNode !== null) rail.parentNode.removeChild(rail);
				if (scMo !== null) scMo.disconnect();
				if (scRo !== null) scRo.disconnect();
				if (rowRo !== null) rowRo.disconnect();
				if (seatRo !== null) seatRo.disconnect();
				sc = null;
				rail = null;
				cluster = null;
				panel = null;
				panelTitle = null;
				panelBody = null;
				markers = [];
				hoverIdx = null;
			}

			const bodyMo = new MutationObserver(() => {
				const next = document.querySelector("[data-conversation-scroll]");
				if (next === sc) return;
				teardown();
				if (next !== null) attach(next);
			});
			bodyMo.observe(document.body, { childList: true, subtree: true });
			const initial = document.querySelector("[data-conversation-scroll]");
			if (initial !== null) attach(initial);
			return () => {
				bodyMo.disconnect();
				teardown();
			};
		}
		//#endregion

		//#region plugin registration
		/** Dictionary namespace owned by this plugin. */
		const NS = "preview";
		/** Services required by the preview plugin (layout for the column geometry). */
		const inject = [
			"slots",
			"locale"
		];
		/** Registers the right preview column, the link chooser, and the click interceptor. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-preview: dictionaries");
			ctx.effect(() => ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "preview-link-chooser",
				locale: NS,
				inject: () => ({
					onOpenDsh: (url) => {
						popoverStore.set((s) => (s.visible ? { ...s, visible: false } : s));
						const sidebar = ctx.get("betterSidebar");
						if (sidebar !== void 0) {
							let title = "";
							try {
								title = new URL(url).hostname;
							} catch {
								/* keep empty */
							}
							sidebar.openTab({ type: "browser", url, title });
						} else {
							window.open(url, "_blank", "noopener,noreferrer");
						}
					},
					onOpenBrowser: (url) => {
						popoverStore.set((s) => (s.visible ? { ...s, visible: false } : s));
						window.open(url, "_blank", "noopener,noreferrer");
					}
				})
			}, LinkChooserPopover)), "ui-preview: link chooser registration");
			ctx.effect(() => ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "deepseek-balance",
				locale: NS,
				inject: () => ({})
			}, BalanceCapsule)), "ui-preview: balance capsule registration");
			ctx.effect(() => installQuickNavRail(), "ui-preview: quick nav rail");
			ctx.effect(() => {
				const onDocumentClick = (event) => {
					if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
					const target = event.target;
					if (target instanceof Element) {
						if (target.closest("[data-dshpv-popover]")) return;
						const anchor = target.closest("a[href]");
						if (anchor !== null) {
							const href = anchor.getAttribute("href") ?? "";
							if (isServerLink(href)) {
								event.preventDefault();
								popoverStore.set({ visible: true, x: event.clientX, y: event.clientY, url: href });
								return;
							}
						}
					}
					popoverStore.set((s) => (s.visible ? { ...s, visible: false } : s));
				};
				document.addEventListener("click", onDocumentClick, true);
				return () => document.removeEventListener("click", onDocumentClick, true);
			}, "ui-preview: link interceptor");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
