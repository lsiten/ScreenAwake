import "./style.css";
import { lang, t } from "./i18n";

type AppStatus = {
  active: boolean;
  powerGuardActive: boolean;
  jiggleActive: boolean;
  keyboardActive: boolean;
  windowPingActive: boolean;
  accessibilityGranted: boolean;
  remainingSeconds: number | null;
};

const isTauri = "__TAURI_INTERNALS__" in window;
const state: AppStatus = {
  active: false, powerGuardActive: false, jiggleActive: false, keyboardActive: false,
  windowPingActive: false, accessibilityGranted: !isTauri, remainingSeconds: null,
};
let selectedDuration = 0;
let webWakeLock: WakeLockSentinel | undefined;
let webKeepAwakeRequested = false;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const toggleButton = byId<HTMLButtonElement>("toggle-button");
const notice = byId("notice");
const desktopElements = document.querySelectorAll<HTMLElement>(".desktop-only");

function message(text: string) { notice.textContent = text; }
function formatRemaining(seconds: number | null) {
  if (seconds === null) return t("remainingUnlimited");
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours && `${hours}${t("unitHour")}`, minutes && `${minutes}${t("unitMin")}`, `${remaining}${t("unitSec")}`].filter(Boolean).join(" ");
}
function applyStatic() {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n!;
    const value = t(key);
    if (value !== key) el.textContent = value;
  });
  byId("platform-badge").textContent = isTauri ? t("desktopBadge") : t("webBadge");
}
function render() {
  const running = state.active;
  document.documentElement.dataset.screenAwakeActive = String(running);
  byId("status-orb").classList.toggle("active", running);
  byId("status-text").textContent = running ? t("statusActive") : t("statusIdle");
  byId("status-detail").textContent = running ? t("statusDetailActive") : t("statusDetailIdle");
  toggleButton.textContent = running ? t("btnStop") : t("btnStart");
  toggleButton.classList.toggle("stop", running);
  byId("power-state").textContent = state.powerGuardActive ? t("running") : t("off");
  byId("jiggle-state").textContent = state.jiggleActive ? t("running") : t("offJiggle");
  byId("permission-state").textContent = state.accessibilityGranted ? t("granted") : t("notGranted");
  byId("remaining").textContent = formatRemaining(state.remainingSeconds);
  byId("timer-value").textContent = selectedDuration ? formatRemaining(selectedDuration) : t("always");
  byId<HTMLInputElement>("jiggle").disabled = !state.accessibilityGranted;
  byId("jiggle-help").textContent = state.accessibilityGranted ? t("jiggleHelpOn") : t("jiggleHelpOff");
}

async function desktopInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}
async function start() {
  try {
    if (isTauri) {
      Object.assign(state, await desktopInvoke<AppStatus>("start_awake", {
        request: { durationSeconds: selectedDuration || null, enableJiggle: byId<HTMLInputElement>("jiggle").checked, enableKeyboard: byId<HTMLInputElement>("keyboard").checked, enableWindowPing: byId<HTMLInputElement>("window-ping").checked },
      }));
    } else {
      if (!("wakeLock" in navigator)) throw new Error(t("noWakeLock"));
      webKeepAwakeRequested = true;
      webWakeLock = await navigator.wakeLock.request("screen");
      const acquiredWakeLock = webWakeLock;
      acquiredWakeLock.addEventListener("release", () => {
        if (webWakeLock === acquiredWakeLock) webWakeLock = undefined;
        state.active = false;
        state.powerGuardActive = false;
        if (webKeepAwakeRequested && document.visibilityState !== "visible") message(t("tabHidden"));
        render();
      });
      state.active = true; state.powerGuardActive = true;
      if (selectedDuration) window.setTimeout(() => stop(), selectedDuration * 1000);
      message(t("webNeedsVisible"));
    }
  } catch (error) { message(error instanceof Error ? error.message : String(error)); }
  render();
}
async function stop() {
  try {
    if (isTauri) Object.assign(state, await desktopInvoke<AppStatus>("stop_awake"));
    else {
      webKeepAwakeRequested = false;
      await webWakeLock?.release();
      webWakeLock = undefined;
      Object.assign(state, { active: false, powerGuardActive: false });
    }
  } catch (error) { message(error instanceof Error ? error.message : String(error)); }
  render();
}
toggleButton.addEventListener("click", () => state.active ? stop() : start());
document.querySelectorAll<HTMLButtonElement>(".duration").forEach((button) => button.addEventListener("click", () => {
  selectedDuration = Number(button.dataset.duration); document.querySelector(".duration.selected")?.classList.remove("selected"); button.classList.add("selected"); render();
}));
byId<HTMLButtonElement>("permission-button").addEventListener("click", async () => {
  if (!isTauri) return;
  const granted = await desktopInvoke<boolean>("check_accessibility_permission");
  state.accessibilityGranted = granted;
  if (!granted) { await desktopInvoke("open_mac_accessibility_settings"); message(t("enableA11y")); }
  render();
});
byId<HTMLInputElement>("autostart").addEventListener("change", async (event) => {
  if (!isTauri) return;
  const enabled = (event.currentTarget as HTMLInputElement).checked;
  try {
    await desktopInvoke("set_launch_at_login", { enabled });
    message(enabled ? t("autostartOn") : t("autostartOff"));
  } catch (error) {
    (event.currentTarget as HTMLInputElement).checked = !enabled;
    message(error instanceof Error ? error.message : String(error));
  }
});
async function initialize() {
  if (isTauri) {
    applyStatic();
    desktopElements.forEach((element) => { element.hidden = false; });
    Object.assign(state, await desktopInvoke<AppStatus>("get_status"));
    byId<HTMLInputElement>("autostart").checked = await desktopInvoke<boolean>("get_launch_at_login");
    const { listen } = await import("@tauri-apps/api/event");
    await listen<AppStatus>("awake-status", (event) => { Object.assign(state, event.payload); render(); });
  } else {
    desktopElements.forEach((element) => { element.hidden = true; });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && webKeepAwakeRequested && (!webWakeLock || webWakeLock.released)) {
        webWakeLock = undefined;
        void start();
      }
    });
    applyStatic();
  }
  render();
}
window.setInterval(async () => { if (isTauri && state.active) { Object.assign(state, await desktopInvoke<AppStatus>("get_status")); render(); } }, 1000);
initialize().catch((error) => message(String(error)));
