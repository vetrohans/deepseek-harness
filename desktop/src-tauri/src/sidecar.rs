//! Boots the bundled `dsh` web service as a Tauri sidecar process.
//!
//! The sidecar is the bundled Node.js binary (`bundle.externalBin`), invoked
//! with the production runtime closure's CLI entry. The environment built here
//! is inherited by every process the harness spawns, so the agent's shells —
//! and `dsh plugin` (a thin pnpm forwarder) — can run `node`, `npm`, `npx`,
//! `corepack`, and `pnpm` without a system Node.js.

use std::path::{Path, PathBuf};

use regex::Regex;
use serde::Deserialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use crate::{first_run, shell_path, Result, SidecarState};

/// Runtime configuration from `tauri.conf.json > plugins > dsh-desktop > runtime`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeConfig {
    /// `bundled` uses the closure shipped in the bundle (default);
    /// `download` fetches the closure tarball on first launch and caches it
    /// in the app-data dir (Sakana-yuyu strategy / update path).
    #[serde(default = "default_mode")]
    pub mode: String,
    /// `home` keeps the harness home at `~/.dsh` (interops with a normal dsh
    /// install); `app-support` relocates it under
    /// `~/Library/Application Support/dsh-desktop` (sandbox-friendly).
    #[serde(default = "default_data_dir")]
    pub data_dir: String,
    /// npm registry for plugin installs (e.g. the npmmirror registry in CN).
    #[serde(default)]
    pub npm_registry: Option<String>,
    /// First-launch/update manifest URL; `${TARGET}` is replaced with the
    /// dist tag (`darwin-arm64`, `darwin-x64`, `win32-x64`).
    #[serde(default)]
    pub manifest_url: Option<String>,
    /// Domestic mirror base for the same manifest + tarball (npmmirror).
    #[serde(default)]
    pub mirror_url: Option<String>,
    /// Plugins to `dsh plugin --profile web add` on first launch.
    #[serde(default)]
    pub preset_plugins: Vec<String>,
}

fn default_mode() -> String {
    "bundled".to_string()
}
fn default_data_dir() -> String {
    "home".to_string()
}

impl Default for RuntimeConfig {
    fn default() -> Self {
        Self {
            mode: default_mode(),
            data_dir: default_data_dir(),
            npm_registry: None,
            manifest_url: None,
            mirror_url: None,
            preset_plugins: Vec::new(),
        }
    }
}

/// The `runtime` object from `tauri.conf.json > plugins > dsh-desktop`,
/// or defaults when absent.
pub fn runtime_config(app: &AppHandle) -> RuntimeConfig {
    app.config()
        .plugins
        .0
        .get("dsh-desktop")
        .and_then(|value| value.get("runtime"))
        .and_then(|value| serde_json::from_value(value.clone()).ok())
        .unwrap_or_default()
}

/// `node-dist/<tag>` layout produced by `desktop/scripts/fetch-node.mjs`.
pub fn node_dist_tag() -> &'static str {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("macos", "aarch64") => "darwin-arm64",
        ("macos", "x86_64") => "darwin-x64",
        ("windows", "x86_64") => "win32-x64",
        (os, arch) => panic!("unsupported platform {os}-{arch}"),
    }
}

/// Where Tauri renamed the sidecar: next to the app executable.
fn sidecar_path() -> Result<PathBuf> {
    let exe = std::env::current_exe()?;
    let dir = exe.parent().ok_or("app binary has no parent directory")?;
    let name = if cfg!(target_os = "windows") { "node.exe" } else { "node" };
    Ok(dir.join(name))
}

/// The bundled runtime closure, failing loud when the build omitted it.
fn bundled_runtime(app: &AppHandle) -> Result<PathBuf> {
    let dir = app.path().resource_dir()?.join("dsh-runtime");
    if !dir.join("lib/bin.js").exists() {
        return Err(format!("bundled runtime missing at {} — run desktop/scripts/prepare-runtime.mjs before building", dir.display()).into());
    }
    Ok(dir)
}

/// The harness home: `~/.dsh` when usable, else the app-support dir.
fn resolve_dsh_home(app: &AppHandle, cfg: &RuntimeConfig) -> Result<PathBuf> {
    let fallback = app.path().app_data_dir()?.join("dsh-home");
    if cfg.data_dir == "app-support" {
        return Ok(fallback);
    }
    let home = app.path().home_dir()?.join(".dsh");
    if is_writable(&home) {
        return Ok(home);
    }
    if std::fs::create_dir_all(&home).is_ok() && is_writable(&home) {
        return Ok(home);
    }
    Ok(fallback)
}

fn is_writable(dir: &Path) -> bool {
    let probe = dir.join(".dsh-desktop-write-test");
    match std::fs::write(&probe, b"ok") {
        Ok(()) => {
            let _ = std::fs::remove_file(&probe);
            true
        }
        Err(_) => false,
    }
}

/// Environment for the sidecar and every child it spawns.
fn sidecar_env(cfg: &RuntimeConfig, dsh_home: &Path, path: &str, sidecar: &Path) -> Vec<(String, String)> {
    let mut env: Vec<(String, String)> = vec![
        ("PATH".to_string(), path.to_string()),
        ("DSH_DESKTOP".to_string(), "1".to_string()),
        ("DSH_DESKTOP_NODE".to_string(), sidecar.display().to_string()),
        // Never prompt for a corepack download: pnpm is bundled.
        ("COREPACK_ENABLE_DOWNLOAD_PROMPT".to_string(), "0".to_string()),
    ];
    if cfg.data_dir == "app-support" {
        env.push(("DSH_HOME".to_string(), dsh_home.display().to_string()));
    }
    if let Some(registry) = &cfg.npm_registry {
        env.push(("npm_config_registry".to_string(), registry.clone()));
    }
    env
}

/// Run one `dsh` command synchronously (used for first-launch plugin installs
/// and the IPC command); the long-running web boot uses the sidecar spawn.
pub fn run_dsh_sync(sidecar: &Path, runtime_dir: &Path, env: &[(String, String)], args: &[&str]) -> Result<String> {
    let entry = runtime_dir.join("lib/bin.js");
    let output = std::process::Command::new(sidecar)
        .arg(&entry)
        .args(args)
        .envs(env.iter().cloned())
        .current_dir(runtime_dir)
        .output()?;
    if !output.status.success() {
        return Err(format!(
            "dsh {} failed ({}) — {}",
            args.join(" "),
            output.status,
            String::from_utf8_lossy(&output.stderr)
        )
        .into());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}


/// Bundled tool directories in PATH order: app-data node shim, node-dist
/// npm/npx/corepack scripts, and the closure's pnpm shim.
fn bundled_bin_dirs(app: &AppHandle, runtime_dir: &Path) -> Result<Vec<PathBuf>> {
    let paths = app.path();
    let tools_bin = paths.app_data_dir()?.join("bin");
    let node_dist = paths.resource_dir()?.join("node-dist").join(node_dist_tag());
    let runtime_bin = runtime_dir.join("bin");
    Ok(vec![tools_bin, node_dist.join("bin"), runtime_bin])
}

/// IPC entry: `dsh plugin --profile web add <package>`.
pub fn install_plugin_sync(app: &AppHandle, package: &str) -> Result<String> {
    let cfg = runtime_config(app);
    let runtime_dir = bundled_runtime(app)?;
    let dsh_home = resolve_dsh_home(app, &cfg)?;
    let sidecar = sidecar_path()?;
    let path = shell_path::build_path(&bundled_bin_dirs(app, &runtime_dir)?.iter().map(PathBuf::as_path).collect::<Vec<_>>());
    let env = sidecar_env(&cfg, &dsh_home, &path, &sidecar);
    run_dsh_sync(&sidecar, &runtime_dir, &env, &["plugin", "--profile", "web", "add", package])
}

fn open_webview(app: &AppHandle, url: &str) -> Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        window.navigate(tauri::Url::parse(url)?)?;
    }
    Ok(())
}

/// Resolve the runtime, prepare the environment, then boot `dsh web --port 0`
/// and navigate the window to the printed URL.
pub async fn boot(app: AppHandle) -> Result<()> {
    let cfg = runtime_config(&app);

    // 1. Runtime closure: bundled, or downloaded/cached on first launch.
    let runtime_dir = match cfg.mode.as_str() {
        "download" => first_run::ensure_downloaded_runtime(&app, &cfg).await?,
        _ => bundled_runtime(&app)?,
    };

    // 2. Harness home (permanent; plugin installs land in its profiles dir).
    let dsh_home = resolve_dsh_home(&app, &cfg)?;
    std::fs::create_dir_all(&dsh_home)?;

    // 3. Bundled tool directories, in PATH order.
    let bin_dirs = bundled_bin_dirs(&app, &runtime_dir)?;
    let tools_bin = bin_dirs[0].clone();
    std::fs::create_dir_all(&tools_bin)?;

    // 4. PATH: tool shims → node-dist scripts → runtime bin → shell PATH.
    let path = shell_path::build_path(&bin_dirs.iter().map(PathBuf::as_path).collect::<Vec<_>>());
    let sidecar = sidecar_path()?;
    first_run::ensure_node_shim(&tools_bin, &sidecar)?;
    let env = sidecar_env(&cfg, &dsh_home, &path, &sidecar);

    // 5. First-launch preset plugins (idempotent: dsh's pnpm add is a no-op
    //    when the package is already installed).
    for pkg in &cfg.preset_plugins {
        run_dsh_sync(&sidecar, &runtime_dir, &env, &["plugin", "--profile", "web", "add", pkg])
            .map_err(|err| format!("preset plugin {pkg} install failed: {err}"))?;
    }

    // 6. Boot the web profile on an OS-assigned port.
    let entry = runtime_dir.join("lib/bin.js");
    let entry_str = entry.to_str().ok_or("runtime entry path is not UTF-8")?;
    let command = app
        .shell()
        .sidecar("node")?
        .args([entry_str, "web", "--port", "0"])
        .current_dir(&runtime_dir);
    let command = env.iter().fold(command, |cmd, (key, value)| cmd.env(key, value));

    let ready = Regex::new(r"dsh web: (https?://\S+)").expect("static regex");
    let (mut rx, child) = command.spawn()?;
    if let Some(state) = app.try_state::<SidecarState>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = Some(child);
        }
    }

    let mut ready_seen = false;
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let text = String::from_utf8_lossy(&line);
                print!("[dsh] {text}");
                if !ready_seen {
                    if let Some(captures) = ready.captures(&text) {
                        if let Some(url) = captures.get(1) {
                            ready_seen = true;
                            open_webview(&app, url.as_str())?;
                        }
                    }
                }
            }
            CommandEvent::Stderr(line) => {
                eprint!("[dsh] {}", String::from_utf8_lossy(&line));
            }
            CommandEvent::Terminated(payload) => {
                if !ready_seen {
                    return Err(format!(
                        "dsh web exited before ready (code={:?}, signal={:?})",
                        payload.code, payload.signal
                    )
                    .into());
                }
                break;
            }
            _ => {}
        }
    }
    if !ready_seen {
        return Err("dsh web exited without printing a ready URL".into());
    }
    Ok(())
}
