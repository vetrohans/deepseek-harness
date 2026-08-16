//! PATH resolution for GUI-launched processes.
//!
//! macOS Finder launches GUI apps with an empty PATH, so a bundled Node.js
//! sidecar would start without `npm`/`npx`/`corepack`/`pnpm` visibility. This
//! module rebuilds PATH from the user's login shell (macOS) or the inherited
//! environment (Windows), with the bundled tool directories first.

use std::path::Path;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

/// Minimal system PATH, used only when nothing better is available.
const FALLBACK_PATH: &str = "/usr/bin:/bin:/usr/sbin:/sbin";

/// Build the PATH handed to the sidecar (and inherited by every harness
/// child): bundled tool dirs first, then the user's shell PATH, then the
/// system fallback. Duplicates are dropped, order preserved.
pub fn build_path(bundled_dirs: &[&Path]) -> String {
    let mut parts: Vec<String> = Vec::new();
    for dir in bundled_dirs {
        if let Some(value) = dir.to_str() {
            push_unique(&mut parts, value);
        }
    }
    for item in user_shell_path().split(':') {
        if !item.is_empty() {
            push_unique(&mut parts, item);
        }
    }
    for item in FALLBACK_PATH.split(':') {
        if !item.is_empty() {
            push_unique(&mut parts, item);
        }
    }
    parts.join(":")
}

fn push_unique(parts: &mut Vec<String>, item: &str) {
    if !parts.iter().any(|existing| existing == item) {
        parts.push(item.to_string());
    }
}

/// The PATH a terminal under this user would see. On macOS a GUI launch
/// inherits only the bare system PATH, so the login shell is probed.
fn user_shell_path() -> String {
    if let Ok(existing) = std::env::var("PATH") {
        let trimmed = existing.trim();
        if !trimmed.is_empty() && trimmed != FALLBACK_PATH {
            return trimmed.to_string();
        }
    }

    #[cfg(target_os = "macos")]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        if let Ok(output) = run_with_timeout(&shell, &["-l", "-c", "printf %s \"$PATH\""], Duration::from_secs(5)) {
            let probed = String::from_utf8_lossy(&output).trim().to_string();
            if !probed.is_empty() {
                return probed;
            }
        }
        // Fallback: Apple's path_helper prints the system default PATH.
        if let Ok(output) = run_with_timeout("/usr/libexec/path_helper", &["-s"], Duration::from_secs(2)) {
            let text = String::from_utf8_lossy(&output);
            if let Some(rest) = text.split("PATH=\"").nth(1) {
                if let Some(end) = rest.find('"') {
                    let parsed = rest[..end].to_string();
                    if !parsed.is_empty() {
                        return parsed;
                    }
                }
            }
        }
    }

    String::new()
}

/// Run a short command and capture stdout, giving up after `timeout`.
fn run_with_timeout(program: &str, args: &[&str], timeout: Duration) -> std::io::Result<Vec<u8>> {
    let mut child = Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()?;
    let deadline = Instant::now() + timeout;
    loop {
        if let Some(_status) = child.try_wait()? {
            use std::io::Read;
            let mut output = Vec::new();
            if let Some(mut stdout) = child.stdout.take() {
                stdout.read_to_end(&mut output)?;
            }
            return Ok(output);
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Ok(Vec::new());
        }
        std::thread::sleep(Duration::from_millis(50));
    }
}
