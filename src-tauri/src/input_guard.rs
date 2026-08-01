use enigo::{Coordinate, Direction, Enigo, Key, Keyboard, Mouse, Settings};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};

#[derive(Clone, Copy)]
pub struct InputModes {
    pub jiggle: bool,
    pub keyboard: bool,
}

pub fn start_input_guard(running: Arc<AtomicBool>, modes: InputModes) {
    thread::spawn(move || {
        let mut enigo = match Enigo::new(&Settings::default()) {
            Ok(enigo) => enigo,
            Err(_) => return,
        };
        let mut direction = 1;
        while running.load(Ordering::SeqCst) {
            if modes.jiggle {
                let _ = enigo.move_mouse(0, direction, Coordinate::Rel);
                direction *= -1;
            }
            if modes.keyboard {
                let _ = enigo.key(Key::Shift, Direction::Press);
                let _ = enigo.key(Key::Shift, Direction::Release);
            }
            for _ in 0..50 {
                if !running.load(Ordering::SeqCst) {
                    return;
                }
                thread::sleep(Duration::from_millis(100));
            }
        }
    });
}
