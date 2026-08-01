use crate::{
    input_guard::{start_input_guard, InputModes},
    permission,
    power_guard::PowerGuard,
};
use serde::Serialize;
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};

#[derive(Default)]
pub struct AppState {
    controller: Mutex<AwakeController>,
}

#[derive(Default)]
struct AwakeController {
    power_guard: Option<PowerGuard>,
    input_running: Option<Arc<AtomicBool>>,
    window_ping_running: Option<Arc<AtomicBool>>,
    jiggle_active: bool,
    keyboard_active: bool,
    window_ping_active: bool,
    deadline: Option<Instant>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStatus {
    pub active: bool,
    pub power_guard_active: bool,
    pub jiggle_active: bool,
    pub keyboard_active: bool,
    pub window_ping_active: bool,
    pub accessibility_granted: bool,
    pub remaining_seconds: Option<u64>,
}

#[derive(Clone)]
pub struct AwakeOptions {
    pub duration_seconds: Option<u64>,
    pub enable_jiggle: bool,
    pub enable_keyboard: bool,
    pub enable_window_ping: bool,
}

impl AppState {
    pub fn start(&self, options: AwakeOptions) -> Result<AppStatus, String> {
        self.stop();
        let mut controller = self
            .controller
            .lock()
            .map_err(|_| "状态锁不可用".to_string())?;
        controller.power_guard = Some(PowerGuard::start()?);
        let can_jiggle = options.enable_jiggle && permission::is_accessibility_enabled();
        let can_input = can_jiggle || options.enable_keyboard;
        if can_input {
            let running = Arc::new(AtomicBool::new(true));
            start_input_guard(
                running.clone(),
                InputModes {
                    jiggle: can_jiggle,
                    keyboard: options.enable_keyboard,
                },
            );
            controller.input_running = Some(running);
        }
        controller.jiggle_active = can_jiggle;
        controller.keyboard_active = options.enable_keyboard;
        controller.window_ping_active = options.enable_window_ping;
        controller.deadline = options
            .duration_seconds
            .filter(|seconds| *seconds > 0)
            .map(|seconds| Instant::now() + Duration::from_secs(seconds));
        Ok(Self::status_locked(&controller))
    }

    pub fn stop(&self) {
        let Ok(mut controller) = self.controller.lock() else {
            return;
        };
        if let Some(running) = controller.input_running.take() {
            running.store(false, Ordering::SeqCst);
        }
        if let Some(running) = controller.window_ping_running.take() {
            running.store(false, Ordering::SeqCst);
        }
        if let Some(power_guard) = controller.power_guard.take() {
            power_guard.stop();
        }
        controller.jiggle_active = false;
        controller.keyboard_active = false;
        controller.window_ping_active = false;
        controller.deadline = None;
    }

    pub fn status(&self) -> AppStatus {
        let controller = self.controller.lock().expect("状态锁不可用");
        Self::status_locked(&controller)
    }

    pub fn expired(&self) -> bool {
        self.controller
            .lock()
            .ok()
            .and_then(|controller| controller.deadline)
            .is_some_and(|deadline| Instant::now() >= deadline)
    }

    pub fn start_window_ping(&self) -> Option<Arc<AtomicBool>> {
        let mut controller = self.controller.lock().ok()?;
        if !controller.window_ping_active {
            return None;
        }
        let running = Arc::new(AtomicBool::new(true));
        controller.window_ping_running = Some(running.clone());
        Some(running)
    }

    fn status_locked(controller: &AwakeController) -> AppStatus {
        AppStatus {
            active: controller.power_guard.is_some(),
            power_guard_active: controller.power_guard.is_some(),
            jiggle_active: controller.jiggle_active,
            keyboard_active: controller.keyboard_active,
            window_ping_active: controller.window_ping_active,
            accessibility_granted: permission::is_accessibility_enabled(),
            remaining_seconds: controller
                .deadline
                .map(|deadline| deadline.saturating_duration_since(Instant::now()).as_secs()),
        }
    }
}
