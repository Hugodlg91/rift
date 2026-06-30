import Phaser from 'phaser';

/**
 * Pause the scene's time briefly to emphasize an impact.
 * Uses `setTimeout` because setting `timeScale = 0` freezes `scene.time.delayedCall`.
 */
export function hitstop(scene: Phaser.Scene, durationMs: number = 60) {
  // Prevent stacking hitstops
  if (scene.time.timeScale < 1) return;

  const originalScale = scene.time.timeScale;
  scene.time.timeScale = 0;

  // We can't use scene timer because time is stopped!
  setTimeout(() => {
    // Only restore if the scene is still active
    if (scene.sys.isActive()) {
      scene.time.timeScale = originalScale;
    }
  }, durationMs);
}

/**
 * Creates a brief "scanline glitch" effect by rapidly shifting the camera
 * left and right for a few frames.
 */
export function glitchCamera(camera: Phaser.Cameras.Scene2D.Camera, durationMs: number = 150) {
  const start = performance.now();
  const intensity = 8; // px

  const glitchFn = (time: number) => {
    if (time - start > durationMs) {
      camera.setScroll(camera.midPoint.x - camera.width / 2, camera.midPoint.y - camera.height / 2);
      camera.scene.events.off('postupdate', glitchFn);
      return;
    }
    
    // Shift camera slightly randomly
    const offsetX = (Math.random() - 0.5) * intensity;
    const offsetY = (Math.random() - 0.5) * intensity * 0.5;
    
    camera.setScroll(
      camera.midPoint.x - camera.width / 2 + offsetX,
      camera.midPoint.y - camera.height / 2 + offsetY
    );
  };

  camera.scene.events.on('postupdate', glitchFn);
}
