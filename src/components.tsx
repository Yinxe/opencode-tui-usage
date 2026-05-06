/** @jsxImportSource @opentui/solid */
import type { JSX } from 'solid-js';

export interface LabelValueProps {
  label: string;
  value: string | number;
  labelColor?: string;
}

export function LabelValue(props: LabelValueProps): JSX.Element {
  return (
    <box flexDirection="row" gap={1}>
      <text fg={props.labelColor}>{props.label}</text>
      <text>:</text>
      <text>{props.value}</text>
    </box>
  );
}

export interface TitleProps {
  text: string;
  color?: string;
}

export function Title(props: TitleProps): JSX.Element {
  return <text fg={props.color}>{props.text}</text>;
}

export interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  width?: number;
}

export function ProgressBar(props: ProgressBarProps): JSX.Element {
  const width = props.width ?? 20;
  const filled = Math.round((props.value / 100) * width);
  const empty = width - filled;
  const barColor = props.color ?? '#6bcf7f';

  return (
    <box flexDirection="row" gap={0}>
      <text fg={barColor}>{'█'.repeat(filled)}</text>
      <text>{'▒'.repeat(empty)}</text>
    </box>
  );
}