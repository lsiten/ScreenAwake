#[cfg(any(target_os = "macos", target_os = "linux"))]
use std::process::{Child, Command, Stdio};

pub enum PowerGuard {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    Process(Child),
    #[cfg(target_os = "windows")]
    Windows,
    Unsupported,
}

impl PowerGuard {
    pub fn start() -> Result<Self, String> {
        #[cfg(target_os = "macos")]
        {
            let process = Command::new("/usr/bin/caffeinate")
                .args(["-d", "-i"])
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|error| format!("无法创建 macOS 电源抑制锁: {error}"))?;
            return Ok(Self::Process(process));
        }

        #[cfg(target_os = "windows")]
        {
            use windows_sys::Win32::System::Power::{
                SetThreadExecutionState, ES_CONTINUOUS, ES_DISPLAY_REQUIRED, ES_SYSTEM_REQUIRED,
            };
            let result = unsafe {
                SetThreadExecutionState(ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED)
            };
            if result == 0 {
                return Err("无法设置 Windows 电源请求".to_string());
            }
            return Ok(Self::Windows);
        }

        #[cfg(target_os = "linux")]
        {
            let process = Command::new("systemd-inhibit")
                .args([
                    "--what=idle:sleep",
                    "--why=ScreenAwake",
                    "--mode=block",
                    "sleep",
                    "infinity",
                ])
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|error| format!("无法创建 Linux 电源抑制锁: {error}"))?;
            return Ok(Self::Process(process));
        }

        #[allow(unreachable_code)]
        Ok(Self::Unsupported)
    }

    pub fn stop(mut self) {
        match &mut self {
            #[cfg(any(target_os = "macos", target_os = "linux"))]
            Self::Process(process) => {
                let _ = process.kill();
                let _ = process.wait();
            }
            #[cfg(target_os = "windows")]
            Self::Windows => {
                use windows_sys::Win32::System::Power::{SetThreadExecutionState, ES_CONTINUOUS};
                unsafe { SetThreadExecutionState(ES_CONTINUOUS) };
            }
            Self::Unsupported => {}
        }
    }
}
