# ScreenAwake

一个同时提供网页临时模式和 Tauri 桌面端持久模式的屏幕常亮工具。

## 运行

```bash
npm install
npm run tauri dev
```

仅运行网页临时模式：`npm run dev`。网页通过 Screen Wake Lock API 工作，必须保持标签页可见。

## 桌面端机制

- 电源抑制锁：macOS 使用 `caffeinate -d -i`，Windows 使用 `SetThreadExecutionState`，Linux 使用 `systemd-inhibit`。
- 鼠标微动：每五秒以 1px 相对位移交替移动；macOS 会先检查辅助功能权限。
- 键盘兜底：可选模拟 Shift 短按，默认关闭。
- 托盘、倒计时、开机自启和 `Cmd+Shift+A` 快捷键均在桌面端可用；关闭主窗口会隐藏到托盘，不会停止防护。开机自启可在“启动设置”中开关。

## macOS 权限

使用鼠标微动前，请在 **系统设置 → 隐私与安全性 → 辅助功能** 中授权 ScreenAwake。未授权时，应用仍能使用电源抑制锁，且自动禁用鼠标微动。

## macOS 安装与首次打开

1. 从 [GitHub Releases](https://github.com/lsiten/ScreenAwake/releases) 下载与设备匹配的 DMG，打开后将 `ScreenAwake.app` 拖入“应用程序”文件夹。
2. 当前公开构建尚未经过 Apple Developer ID 公证，因此首次打开时 macOS Gatekeeper 可能提示“Apple 无法验证”。这不表示 DMG 损坏；请仅从本仓库的 Release 下载。
3. 点击提示框中的“完成”，然后打开 **系统设置 → 隐私与安全性**，在 ScreenAwake 的拦截提示旁点击“仍要打开”。也可以在 Finder 中按住 Control 点击 `ScreenAwake.app`，选择“打开”。
4. 如果仍因下载隔离无法打开，请在终端执行下面两行命令，然后再次启动应用：

```bash
xattr -dr com.apple.quarantine /Applications/ScreenAwake.app
open /Applications/ScreenAwake.app
```

`xattr` 命令仅移除 macOS 为该下载添加的隔离标记；请先确认应用位于 `/Applications/ScreenAwake.app`。后续使用鼠标微动时，仍需按上面的“macOS 权限”授予辅助功能权限。

## 发布

推送 `main` 自动发布网页至 GitHub Pages。推送 `v*` 标签会生成 GitHub Release，包含 macOS DMG 与 Windows 安装包。正式分发 macOS 应用前，请在仓库机密中配置 Apple 签名与公证凭据，并扩展 release 工作流的签名步骤。
