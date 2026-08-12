import { Slider } from '@/components/ui/slider';

interface OpacitySliderControlProps {
  value: number;
  onChange: (value: number) => void;
}

export function OpacitySliderControl({ value, onChange }: OpacitySliderControlProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-body text-xs text-text-muted">
        <label htmlFor="gradcam-opacity">Opasitas Grad-CAM</label>
        <span className="font-mono tabular-nums">{Math.round(value * 100)}%</span>
      </div>
      <Slider
        id="gradcam-opacity"
        value={[value]}
        min={0}
        max={1}
        step={0.01}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
