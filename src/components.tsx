/** @jsxImportSource @opentui/solid */
import { createSignal, Show } from "solid-js";
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

export interface TreeItemProps {
  label: string;
  value: string | number;
  isLast?: boolean;
  indent?: number;
  labelColor?: string;
}

/**
 * 树线条目组件
 * 用 ├─ / └─ 前缀展示层级关系，增强信息组织感
 * 例如：
 *   ├─ label: value
 *   └─ label: value
 */
export function TreeItem(props: TreeItemProps): JSX.Element {
  const prefix = props.isLast ? "└─ " : "├─ ";
  const indent = "  ".repeat(props.indent ?? 0);

  return (
    <box flexDirection="row" gap={0}>
      <text fg="#555">{indent}{prefix}</text>
      <text fg={props.labelColor ?? "#888"}>{props.label}</text>
      <text fg="#888">:</text>
      <text> {props.value}</text>
    </box>
  );
}

export interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  color?: string;
  children: JSX.Element;
}

/** 持久化折叠状态，防止侧边栏重渲染时复位 */
const collapseState = new Map<string, boolean>();

/**
 * 可折叠区域组件
 * 标题栏可点击切换展开/折叠状态
 * - ▶ 收起状态（点击展开）
 * - ▼ 展开状态（点击收起）
 *
 * 折叠状态持久化在模块级 Map 中，组件重新挂载时自动恢复。
 */
export function Collapsible(props: CollapsibleProps): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(
    collapseState.get(props.title) ?? props.defaultOpen ?? true
  );

  const toggle = () => {
    setIsOpen((v) => {
      const next = !v;
      collapseState.set(props.title, next);
      return next;
    });
  };

  return (
    <box flexDirection="column" gap={0}>
      <box
        flexDirection="row"
        gap={1}
        onMouseDown={toggle}
      >
        <text fg="#888">{() => (isOpen() ? "▼ " : "▶ ")}</text>
        <text fg={props.color}>{props.title}</text>
      </box>
      <Show when={isOpen()}>
        {props.children}
      </Show>
    </box>
  );
}

/**
 * 进度条组件
 * 显示格式：[■■■■■■■■□□] 或类似
 */
export function ProgressBar(props: ProgressBarProps): JSX.Element {
  const width = props.width ?? 12;
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
