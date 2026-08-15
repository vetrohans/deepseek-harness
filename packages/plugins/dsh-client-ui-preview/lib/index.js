// dsh-preview-panel — node half.
// Host-side proxy for the DeepSeek account balance. The browser cannot hold the
// API key (and api.deepseek.com blocks cross-origin fetches), so this plugin
// exposes a read-only GET /api/deepseek-balance that resolves the key through
// the credentials service and relays the /user/balance payload back as JSON.
// The key is never echoed into a response or a log line.

const BALANCE_PATH = "/api/deepseek-balance";
const API_KEY_REF = "DEEPSEEK_API_KEY";
const BASE_URL_ENV = "DEEPSEEK_BASE_URL";
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const UPSTREAM_TIMEOUT_MS = 10000;

/** Write one JSON response; HEAD sends headers only. */
function sendJson(req, res, status, payload) {
	const body = JSON.stringify(payload);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(req.method === "HEAD" ? undefined : body);
}

/** Resolve the DeepSeek API key: credentials service first, environment as fallback. */
async function resolveApiKey(ctx) {
	const credentials = ctx.get("credentials");
	if (credentials !== void 0) {
		try {
			const hit = await credentials.resolve(API_KEY_REF);
			if (hit !== void 0 && typeof hit.value === "string" && hit.value.length > 0) {
				return hit.value;
			}
		} catch {
			// fall through to the environment fallback
		}
	}
	const ambient = process.env[API_KEY_REF];
	return typeof ambient === "string" && ambient.length > 0 ? ambient : void 0;
}

/** Effective DeepSeek base URL, mirroring dsh-llm-deepseek's $DEEPSEEK_BASE_URL fallback. */
function baseUrl() {
	const configured = process.env[BASE_URL_ENV];
	return typeof configured === "string" && configured.length > 0
		? configured.replace(/\/+$/, "")
		: DEFAULT_BASE_URL;
}

/** Relay the account balance for a GET/HEAD request; never surfaces the key. */
async function handleBalance(ctx, req, res) {
	if (req.method !== "GET" && req.method !== "HEAD") {
		sendJson(req, res, 405, { is_available: false, error: "method_not_allowed" });
		return;
	}
	const apiKey = await resolveApiKey(ctx);
	if (apiKey === void 0) {
		sendJson(req, res, 200, { is_available: false, reason: "no_api_key" });
		return;
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
	let upstream;
	try {
		upstream = await fetch(`${baseUrl()}/user/balance`, {
			method: "GET",
			headers: { authorization: `Bearer ${apiKey}` },
			signal: controller.signal
		});
	} catch (error) {
		clearTimeout(timer);
		ctx.logger?.warn(
			`deepseek-balance: upstream request failed: ${error instanceof Error ? error.message : String(error)}`
		);
		sendJson(req, res, 502, { is_available: false, error: "upstream_unreachable" });
		return;
	}
	clearTimeout(timer);
	if (!upstream.ok) {
		sendJson(req, res, 502, { is_available: false, error: "upstream_error", status: upstream.status });
		return;
	}
	let data;
	try {
		data = await upstream.json();
	} catch {
		sendJson(req, res, 502, { is_available: false, error: "invalid_upstream_response" });
		return;
	}
	sendJson(req, res, 200, data);
}

/**
* Services required before the balance route can be claimed. Declaring webServer
* (rather than ctx.get) guarantees the service is ready before apply runs.
*/
const inject = ["webServer"];

function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: BALANCE_PATH,
		handler: (req, res) => handleBalance(ctx, req, res)
	}), "deepseek-balance: /api route");
}

export { apply, inject };
