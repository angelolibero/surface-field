import * as React from "react";

type HouseSliderProps = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

// The house slider uses a 22px row, a grip inset 2px on every side,
// and a native input for keyboard, pointer, and touch interaction.
export function HouseSlider({ id, label, min, max, step, value, onChange }: HouseSliderProps) {
  const progress = max === min ? 0 : (value - min) / (max - min);
  const ref = React.useRef<HTMLDivElement>(null);

  const resetPull = () => ref.current?.style.setProperty("--slider-pull-x", "0px");
  const updatePull = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const center = rect.left + 11 + progress * (rect.width - 22);
    const pull = Math.max(-4, Math.min(4, (clientX - center) * 0.18));
    ref.current?.style.setProperty("--slider-pull-x", `${pull}px`);
  };

  return <div ref={ref} className="house-slider" style={{ "--slider-progress": progress } as React.CSSProperties}>
    <span className="house-slider-track" aria-hidden="true" />
    <span className="house-slider-fill" aria-hidden="true" />
    <input
      id={id}
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={event => onChange(Number(event.target.value))}
      onPointerDown={event => updatePull(event.clientX)}
      onPointerMove={event => { if (event.buttons) updatePull(event.clientX); }}
      onPointerUp={resetPull}
      onPointerCancel={resetPull}
      onLostPointerCapture={resetPull}
    />
  </div>;
}
