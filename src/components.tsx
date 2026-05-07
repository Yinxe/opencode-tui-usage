/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";

export interface LabelValueProps {
  label: string;
  value: string | number;
  labelColor?: string;
}

/**
 * 标签-值组件
 * 显示格式：标签: 值
 */
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

/**
 * 标题组件
 * 显示带颜色的文本
 */
export function Title(props: TitleProps): JSX.Element {
  return <text fg={props.color}>{props.text}</text>;
}

export interface ProgressBarProps {
  value: number; // 0-100 百分比
  color?: string;
  width?: number; // 进度条总宽度，默认 20
}

/**
 * 进度条组件
 * 显示格式：[■■■■■■■■□□] 或类似
 */
export function ProgressBar(props: ProgressBarProps): JSX.Element {
  const width = props.width ?? 20;
  // 计算填充和空白的字符数
  const filled = Math.round((props.value / 100) * width);
  const empty = filled === 0 ? width - 1 : width - filled;
  const barColor = props.color ?? '#6bcf7f';

  return (
    <box flexDirection="row" gap={0}>
      <text>[</text>
      <text fg={barColor}>{'■'.repeat(filled)}</text>
      <text>{' '.repeat(empty)}</text>
      <text>]</text>
    </box>
  );
}
