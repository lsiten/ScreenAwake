import "./style.css";

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

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const toggleButton = byId<HTMLButtonElement>("toggle-button");
const notice = byId("notice");
const desktopElements = document.querySelectorAll<HTMLElement>(".desktop-only");

function message(text: string) { notice.textContent = text; }
function formatRemaining(seconds: number | null) {
  if (seconds === null) return "无限制";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours && `${hours}小时`, minutes && `${minutes}分`, `${remaining}秒`].filter(Boolean).join(" ");
}
function render() {
  const running = state.active;
  byId("status-orb").classList.toggle("active", running);
  byId("status-text").textContent = running ? "屏幕常亮运行中" : "尚未开启";
  byId("status-detail").textContent = running ? "关闭窗口后仍会在系统托盘中持续运行。" : "开启后将阻止显示器与系统自动休眠。";
  toggleButton.textContent = running ? "停止常亮" : "开启常亮";
  toggleButton.classList.toggle("stop", running);
  byId("power-state").textContent = state.powerGuardActive ? "运行中" : "未运行";
  byId("jiggle-state").textContent = state.jiggleActive ? "运行中" : "未启用";
  byId("permission-state").textContent = state.accessibilityGranted ? "已授权" : "未授权";
  byId("remaining").textContent = formatRemaining(state.remainingSeconds);
  byId("timer-value").textContent = selectedDuration ? formatRemaining(selectedDuration) : "永久";
  byId<HTMLInputElement>("jiggle").disabled = !state.accessibilityGranted;
  byId("jiggle-help").textContent = state.accessibilityGranted ? "每 5 秒轻微移动并还原光标，重置闲置计时器" : "需要在系统设置中授予辅助功能权限";
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
      if (!("wakeLock" in navigator)) throw new Error("当前浏览器不支持 Screen Wake Lock API");
      webWakeLock = await navigator.wakeLock.request("screen");
      webWakeLock.addEventListener("release", () => { state.active = false; state.powerGuardActive = false; render(); });
      state.active = true; state.powerGuardActive = true;
      if (selectedDuration) window.setTimeout(() => stop(), selectedDuration * 1000);
      message("网页模式需要保持此标签页可见。企业 MDM 锁屏请使用桌面客户端。");
    }
  } catch (error) { message(error instanceof Error ? error.message : String(error)); }
  render();
}
async function stop() {
  try {
    if (isTauri) Object.assign(state, await desktopInvoke<AppStatus>("stop_awake"));
    else { await webWakeLock?.release(); webWakeLock = undefined; Object.assign(state, { active: false, powerGuardActive: false }); }
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
  if (!granted) { await desktopInvoke("open_mac_accessibility_settings"); message("请在系统设置中为 ScreenAwake 开启辅助功能权限，然后再次检查。"); }
  render();
});
async function initialize() {
  if (isTauri) {
    byId("platform-badge").textContent = "桌面端";
    desktopElements.forEach((element) => { element.hidden = false; });
    Object.assign(state, await desktopInvoke<AppStatus>("get_status"));
    const { listen } = await import("@tauri-apps/api/event");
    await listen<AppStatus>("awake-status", (event) => { Object.assign(state, event.payload); render(); });
  } else {
    desktopElements.forEach((element) => { element.hidden = true; });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && state.active && !webWakeLock) start(); });
  }
  render();
}
window.setInterval(async () => { if (isTauri && state.active) { Object.assign(state, await desktopInvoke<AppStatus>("get_status")); render(); } }, 1000);
initialize().catch((error) => message(String(error)));
