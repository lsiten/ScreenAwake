// Runtime i18n: single source of truth for all app-UI text (static labels + JS-rendered).
// The web build serves the same bundle for both / and /en/; language is picked from the
// page's <html lang> (postbuild sets "en" on the English page) or the /en/ path as a fallback.
export type Lang = "zh" | "en";

export const lang: Lang =
  document.documentElement.lang === "en" || /(^|\/)en\b/.test(window.location.pathname)
    ? "en"
    : "zh";

type Dict = Record<string, string>;

const zh: Dict = {
  // static labels
  title: "让屏幕保持清醒",
  webBadge: "网页版",
  desktopBadge: "桌面端",
  statusTitle: "当前状态",
  basicTitle: "基础选项",
  alwaysOnBadge: "始终启用",
  keepAwakeLabel: "保持屏幕常亮",
  keepAwakeDesc: "阻止显示器关闭与整机休眠",
  advancedTitle: "进阶选项",
  checkPerm: "检查权限",
  jiggleLabel: "启用鼠标微动",
  keyboardLabel: "键盘空事件兜底",
  keyboardDesc: "模拟 Shift 短按；仅在严苛策略下使用",
  windowPingLabel: "窗口激活备用策略",
  windowPingDesc: "低频后台窗口事件，仅供兼容性排障",
  timerTitle: "定时设置",
  dur0: "永久",
  dur1800: "30 分钟",
  dur3600: "1 小时",
  dur10800: "3 小时",
  startupTitle: "启动设置",
  autostartLabel: "开机时启动",
  autostartDesc: "登录系统后自动启动 ScreenAwake；启动后可在托盘中显示窗口",
  statusPanelTitle: "状态信息",
  powerGuardLabel: "电源防护",
  jiggleStateLabel: "鼠标微动",
  permStateLabel: "辅助功能权限",
  // dynamic (render)
  remainingUnlimited: "无限制",
  unitHour: "小时",
  unitMin: "分",
  unitSec: "秒",
  statusActive: "屏幕常亮运行中",
  statusIdle: "尚未开启",
  statusDetailActive: "关闭窗口后仍会在系统托盘中持续运行。",
  statusDetailIdle: "开启后将阻止显示器与系统自动休眠。",
  btnStart: "开启常亮",
  btnStop: "停止常亮",
  running: "运行中",
  off: "未运行",
  offJiggle: "未启用",
  granted: "已授权",
  notGranted: "未授权",
  always: "永久",
  jiggleHelpOn: "每 5 秒轻微移动并还原光标，重置闲置计时器",
  jiggleHelpOff: "需要在系统设置中授予辅助功能权限",
  // messages
  noWakeLock: "当前浏览器不支持 Screen Wake Lock API",
  webNeedsVisible: "网页模式需要保持此标签页可见。企业 MDM 锁屏请使用桌面客户端。",
  tabHidden: "标签页暂时不可见；返回后会自动恢复常亮。",
  enableA11y: "请在系统设置中为 ScreenAwake 开启辅助功能权限，然后再次检查。",
  autostartOn: "已开启开机自启。",
  autostartOff: "已关闭开机自启。",
};

const en: Dict = {
  title: "Keep Screen Awake",
  webBadge: "Web",
  desktopBadge: "Desktop",
  statusTitle: "Status",
  basicTitle: "Basic",
  alwaysOnBadge: "Always on",
  keepAwakeLabel: "Keep screen awake",
  keepAwakeDesc: "Prevents the display from turning off and the system from sleeping",
  advancedTitle: "Advanced",
  checkPerm: "Check permission",
  jiggleLabel: "Enable mouse jiggle",
  keyboardLabel: "Keyboard no-op fallback",
  keyboardDesc: "Simulates a brief Shift tap; use only under strict policies",
  windowPingLabel: "Window-activation fallback",
  windowPingDesc: "Low-frequency background window events for compatibility troubleshooting only",
  timerTitle: "Timer",
  dur0: "Always",
  dur1800: "30 min",
  dur3600: "1 hour",
  dur10800: "3 hours",
  startupTitle: "Startup",
  autostartLabel: "Start at login",
  autostartDesc: "Launch ScreenAwake automatically after login; shows a window in the tray",
  statusPanelTitle: "Status",
  powerGuardLabel: "Power guard",
  jiggleStateLabel: "Mouse jiggle",
  permStateLabel: "Accessibility",
  remainingUnlimited: "Unlimited",
  unitHour: " h",
  unitMin: " m",
  unitSec: " s",
  statusActive: "Active",
  statusIdle: "Not active",
  statusDetailActive: "It keeps running in the system tray after you close the window.",
  statusDetailIdle: "When on, it prevents your display and system from auto-sleeping.",
  btnStart: "Keep Screen On",
  btnStop: "Stop",
  running: "On",
  off: "Off",
  offJiggle: "Off",
  granted: "Granted",
  notGranted: "Not granted",
  always: "Always",
  jiggleHelpOn: "Gently moves and restores the cursor every 5 seconds to reset the idle timer",
  jiggleHelpOff: "Grant accessibility permission in System Settings",
  noWakeLock: "This browser doesn't support the Screen Wake Lock API",
  webNeedsVisible: "Web mode needs this tab visible. For enterprise MDM lock, use the desktop app.",
  tabHidden: "This tab is temporarily hidden; keep-awake resumes automatically when you return.",
  enableA11y: "Enable accessibility permission for ScreenAwake in System Settings, then check again.",
  autostartOn: "Launch at login enabled.",
  autostartOff: "Launch at login disabled.",
};

const dict = lang === "en" ? en : zh;

export function t(key: string): string {
  return dict[key] ?? key;
}
