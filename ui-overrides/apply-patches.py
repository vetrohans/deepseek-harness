#!/usr/bin/env python3
"""Idempotent patch for the DSH layout bundle: add a draggable right 'preview'
column (4th grid track) with a wide drag range, leaving the 8px handle as-is.

Run this again after a DeepSeek Harness update (the app bundle is replaced and
this layout file reverts to the original 3-column version).

Usage:
    python3 apply-patches.py [path-to-client.js]
Default path is the installed dsh-client-ui-layout bundle.

It applies the changes only where their target markers are absent, so it is
safe to run on an already-patched file (no-op) and on the pristine file
(repair). Backs up the pre-modification file to `<file>.dshpv.orig`.
"""
import sys, shutil

PATH = sys.argv[1] if len(sys.argv) > 1 else (
    "/Applications/DeepSeek Harness.app/Contents/Resources/harness/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js"
)

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()
original = src

def repl(name, old, new, required=True):
    global src
    if new in src:
        print(f"skip [{name}]: already applied")
        return False
    count = src.count(old)
    if count == 0:
        if required:
            print(f"skip [{name}]: target not found")
        return False
    if count > 1:
        raise SystemExit(f"FAIL [{name}]: expected 0 or 1 occurrence, found {count}")
    src = src.replace(old, new)
    print(f"applied [{name}]")
    return True

changed = False

# ---- patch 1: add the 4th column + preview slot + store/actions/service ----

# computeColumns -> 4-track solve
changed |= repl("computeColumns-4track", """function computeColumns(viewport, sidebar, details) {
\t\t\tconst s = sidebar === 0 ? 56 : clampWidth(sidebar, 264, 420);
\t\t\tconst d0 = details === 0 ? 0 : clampWidth(details, 300, 520);
\t\t\tif (s + d0 + 640 <= viewport) return {
\t\t\t\tsidebar: s,
\t\t\t\tcenter: viewport - s - d0,
\t\t\t\tdetails: d0
\t\t\t};
\t\t\tconst d1 = d0 === 0 ? 0 : Math.max(300, viewport - s - 640);
\t\t\tif (s + d1 + 640 <= viewport) return {
\t\t\t\tsidebar: s,
\t\t\t\tcenter: 640,
\t\t\t\tdetails: d1
\t\t\t};
\t\t\treturn {
\t\t\t\tsidebar: s,
\t\t\t\tcenter: Math.max(0, viewport - s),
\t\t\t\tdetails: 0
\t\t\t};
\t\t}""", """function computeColumns(viewport, sidebar, details, preview) {
\t\t\tconst CENTER_MIN = 400;
\t\t\tconst s = sidebar === 0 ? 56 : clampWidth(sidebar, 264, 420);
\t\t\tconst d0 = details === 0 ? 0 : clampWidth(details, 300, 520);
\t\t\tconst p0 = preview === 0 ? 0 : clampWidth(preview, 280, 1200);
\t\t\tif (s + d0 + p0 + CENTER_MIN <= viewport) return {
\t\t\t\tsidebar: s,
\t\t\t\tcenter: viewport - s - d0 - p0,
\t\t\t\tdetails: d0,
\t\t\t\tpreview: p0
\t\t\t};
\t\t\tconst p1 = p0 === 0 ? 0 : Math.max(280, viewport - s - d0 - CENTER_MIN);
\t\t\tif (s + d0 + p1 + CENTER_MIN <= viewport) return {
\t\t\t\tsidebar: s,
\t\t\t\tcenter: CENTER_MIN,
\t\t\t\tdetails: d0,
\t\t\t\tpreview: p1
\t\t\t};
\t\t\tconst d1 = d0 === 0 ? 0 : Math.max(300, viewport - s - CENTER_MIN);
\t\t\tif (s + d1 + CENTER_MIN <= viewport) return {
\t\t\t\tsidebar: s,
\t\t\t\tcenter: CENTER_MIN,
\t\t\t\tdetails: d1,
\t\t\t\tpreview: 0
\t\t\t};
\t\t\treturn {
\t\t\t\tsidebar: s,
\t\t\t\tcenter: Math.max(0, viewport - s),
\t\t\t\tdetails: 0,
\t\t\t\tpreview: 0
\t\t\t};
\t\t}""", required=False)

# class map entry
changed |= repl("class-map", '"overlayLayer": "vY0v1a_overlayLayer",',
                '"overlayLayer": "vY0v1a_overlayLayer",\n\t\t\t"previewCol": "vY0v1a_previewCol",', required=False)

# computeColumns call site
changed |= repl("cols-call", "detailsSession === void 0 ? 0 : panels.details);",
                "detailsSession === void 0 ? 0 : panels.details, panels.preview);", required=False)

# drag base refs
changed |= repl("drag-base", """const sidebarBase = (0, react.useRef)(0);
\t\t\tconst detailsBase = (0, react.useRef)(0);""",
                """const sidebarBase = (0, react.useRef)(0);
\t\t\tconst detailsBase = (0, react.useRef)(0);
\t\t\tconst previewBase = (0, react.useRef)(0);""", required=False)

# drag handlers
changed |= repl("drag-handlers", """const onDetailsDrag = (0, react.useCallback)((dx) => {
\t\t\t\tactions.setDetails(detailsBase.current - dx);
\t\t\t}, [actions]);""",
                """const onDetailsDrag = (0, react.useCallback)((dx) => {
\t\t\t\tactions.setDetails(detailsBase.current - dx);
\t\t\t}, [actions]);
\t\t\tconst onPreviewStart = (0, react.useCallback)(() => {
\t\t\t\tpreviewBase.current = colsRef.current.preview;
\t\t\t\tsetDragging(true);
\t\t\t}, []);
\t\t\tconst onPreviewDrag = (0, react.useCallback)((dx) => {
\t\t\t\tactions.setPreview(previewBase.current - dx);
\t\t\t}, [actions]);""", required=False)

# grid template + data attr
changed |= repl("frame-grid", """style: { gridTemplateColumns: `${cols.sidebar}px minmax(0, 1fr) ${cols.details}px` },
\t\t\t\t"data-sidebar-collapsed": sidebarCollapsed || void 0,
\t\t\t\t"data-details-collapsed": cols.details === 0 || void 0,""",
                """style: { gridTemplateColumns: `${cols.sidebar}px minmax(0, 1fr) ${cols.details}px ${cols.preview}px` },
\t\t\t\t"data-sidebar-collapsed": sidebarCollapsed || void 0,
\t\t\t\t"data-details-collapsed": cols.details === 0 || void 0,
\t\t\t\t"data-preview-collapsed": cols.preview === 0 || void 0,""", required=False)

# preview column node
changed |= repl("preview-col", """(0, react_jsx_runtime.jsx)(DetailsColumn, { children: renderSlot("details", {}) })] }),
\t\t\t\t\t(0, react_jsx_runtime.jsx)("div", {
\t\t\t\t\t\tclassName: AppFrame_module_css_default.overlayLayer,""",
                """(0, react_jsx_runtime.jsx)(DetailsColumn, { children: renderSlot("details", {}) })] }),
\t\t\t\t\t(0, react_jsx_runtime.jsx)("div", {
\t\t\t\t\t\tclassName: AppFrame_module_css_default.previewCol,
\t\t\t\t\t\t"data-preview-col": true,
\t\t\t\t\t\tchildren: renderSlot("preview", {
\t\t\t\t\t\t\twidth: cols.preview
\t\t\t\t\t\t})
\t\t\t\t\t}),
\t\t\t\t\t(0, react_jsx_runtime.jsx)("div", {
\t\t\t\t\t\tclassName: AppFrame_module_css_default.overlayLayer,""", required=False)

# preview drag handle
changed |= repl("preview-handle", """cols.details > 0 && (0, react_jsx_runtime.jsx)(DragHandle, {
\t\t\t\t\t\tside: "details",
\t\t\t\t\t\tleft: viewport - cols.details,
\t\t\t\t\t\tonStart: onDetailsStart,
\t\t\t\t\t\tonDrag: onDetailsDrag,
\t\t\t\t\t\tonEnd: onDragEnd
\t\t\t\t\t})""",
                """cols.details > 0 && (0, react_jsx_runtime.jsx)(DragHandle, {
\t\t\t\t\t\tside: "details",
\t\t\t\t\t\tleft: viewport - cols.details,
\t\t\t\t\t\tonStart: onDetailsStart,
\t\t\t\t\t\tonDrag: onDetailsDrag,
\t\t\t\t\t\tonEnd: onDragEnd
\t\t\t\t\t}),
\t\t\t\t\tcols.preview > 0 && (0, react_jsx_runtime.jsx)(DragHandle, {
\t\t\t\t\t\tside: "preview",
\t\t\t\t\t\tleft: viewport - cols.preview,
\t\t\t\t\t\tonStart: onPreviewStart,
\t\t\t\t\t\tonDrag: onPreviewDrag,
\t\t\t\t\t\tonEnd: onDragEnd
\t\t\t\t\t})""", required=False)

# store init
changed |= repl("store-init", """init: () => ({
\t\t\t\t\tsidebar: 280,
\t\t\t\t\tdetails: 0,
\t\t\t\t\tnarrow: false,
\t\t\t\t\tnarrowExpanded: false
\t\t\t\t}),""",
                """init: () => ({
\t\t\t\t\tsidebar: 280,
\t\t\t\t\tdetails: 0,
\t\t\t\t\tpreview: 0,
\t\t\t\t\tnarrow: false,
\t\t\t\t\tnarrowExpanded: false
\t\t\t\t}),""", required=False)

# store actions
changed |= repl("store-actions", """closeDetails: (d) => {
\t\t\t\t\t\td.details = 0;
\t\t\t\t\t}
\t\t\t\t}""",
                """closeDetails: (d) => {
\t\t\t\t\t\td.details = 0;
\t\t\t\t\t},
\t\t\t\t\tsetPreview: (d, px) => {
\t\t\t\t\t\td.preview = clampWidth(px, 280, 1200);
\t\t\t\t\t},
\t\t\t\t\topenPreview: (d) => {
\t\t\t\t\t\tif (d.preview === 0) d.preview = 360;
\t\t\t\t\t},
\t\t\t\t\tclosePreview: (d) => {
\t\t\t\t\t\td.preview = 0;
\t\t\t\t\t},
\t\t\t\t\ttogglePreview: (d) => {
\t\t\t\t\t\td.preview = d.preview === 0 ? 360 : 0;
\t\t\t\t\t}
\t\t\t\t}""", required=False)

# LayoutController service methods
changed |= repl("service-methods", """closeDetails() {
\t\t\t\tthis.#require().closeDetails();
\t\t\t}""",
                """closeDetails() {
\t\t\t\tthis.#require().closeDetails();
\t\t\t}
\t\t\t/** Open the preview column (no-op when already open). */
\t\t\topenPreview() {
\t\t\t\tthis.#require().openPreview();
\t\t\t}
\t\t\t/** Close the preview column. */
\t\t\tclosePreview() {
\t\t\t\tthis.#require().closePreview();
\t\t\t}
\t\t\t/** Toggle the preview column (closed ⟷ contract default width). */
\t\t\ttogglePreview() {
\t\t\t\tthis.#require().togglePreview();
\t\t\t}""", required=False)

# root children slot declaration
changed |= repl("slot-decl", """"details": {
\t\t\t\t\t\t\tkind: "single",
\t\t\t\t\t\t\tscope: "session"
\t\t\t\t\t\t},""",
                """"details": {
\t\t\t\t\t\t\tkind: "single",
\t\t\t\t\t\t\tscope: "session"
\t\t\t\t\t\t},
\t\t\t\t\t\t"preview": {
\t\t\t\t\t\t\tkind: "single",
\t\t\t\t\t\t\tscope: "root"
\t\t\t\t\t\t},""", required=False)

# ---- final: verify expected markers ----
required_markers = [
    "function computeColumns(viewport, sidebar, details, preview)",
    "clampWidth(preview, 280, 1200)",
    "const CENTER_MIN = 400",
    'className: AppFrame_module_css_default.previewCol,',
    'side: "preview",',
    "togglePreview: (d) => {",
    '"preview": {',
]
missing = [m for m in required_markers if m not in src]
if missing:
    raise SystemExit("FAIL: missing markers after patch: " + ", ".join(missing))

# handle width must remain 8px (untouched)
assert "width:8px;transition:left" in src, "unexpected: 8px handle marker missing"

if src != original:
    shutil.copy(PATH, PATH + ".dshpv.orig")
    with open(PATH, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"patched: {len(src)} bytes (was {len(original)}); backup at {PATH}.dshpv.orig")
else:
    print("no changes needed (already patched)")

print("OK: preview column present, handle still 8px, preview clamp 280-1200, center min 400")
