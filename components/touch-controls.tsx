"use client";

import { useEffect, useRef, useState } from "react";

import type { GameMeta, TouchButton, TouchCluster } from "@/lib/engines/meta";
import { pressKey, releaseAll, releaseKey } from "@/lib/touch-input";

function vibrate() {
  try {
    navigator.vibrate?.(10);
  } catch {
    // unsupported or blocked: no feedback
  }
}

function PadButton({ button }: { button: TouchButton }) {
  const [pressed, setPressed] = useState(false);
  // Pointer holding this button; null when released
  const pointerRef = useRef<number | null>(null);

  const release = () => {
    if (pointerRef.current === null) return;
    pointerRef.current = null;
    setPressed(false);
    releaseKey(button.code);
  };

  return (
    <button
      type="button"
      className="touch-btn"
      data-code={button.code}
      data-pressed={pressed || undefined}
      aria-label={button.aria}
      onPointerDown={(e) => {
        e.preventDefault();
        if (pointerRef.current !== null) return;
        // Keep the press while the finger drifts off the button
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerRef.current = e.pointerId;
        setPressed(true);
        vibrate();
        pressKey(button.code, { repeat: button.repeat });
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {button.label}
    </button>
  );
}

function Cluster({
  cluster,
  side,
}: {
  cluster: TouchCluster;
  side: "left" | "right";
}) {
  const hasUp = cluster.buttons.some((b) => b.code === "ArrowUp");
  return (
    <div
      className={`touch-cluster ${side}`}
      data-kind={cluster.kind}
      data-has-up={cluster.kind === "dpad" ? hasUp : undefined}
    >
      {cluster.buttons.map((b) => (
        <PadButton key={b.code} button={b} />
      ))}
    </div>
  );
}

export function TouchControls({ layout }: { layout: GameMeta["touch"] }) {
  // Never leave a key held after the gamepad goes away
  useEffect(() => releaseAll, []);

  return (
    <div className="touch-pad" role="group" aria-label="Mando táctil">
      <Cluster cluster={layout.left} side="left" />
      {layout.right && <Cluster cluster={layout.right} side="right" />}
    </div>
  );
}
