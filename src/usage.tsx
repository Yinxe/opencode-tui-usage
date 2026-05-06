/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import { Title, ProgressBar } from "./components.jsx";

interface UsageData {
  rollingPercent: number;
  rollingTime: string;
  weeklyPercent: number;
  weeklyTime: string;
  monthlyPercent: number;
  monthlyTime: string;
}

const mockUsage: UsageData = {
  rollingPercent: 20,
  rollingTime: "2h",
  weeklyPercent: 10,
  weeklyTime: "3d4h",
  monthlyPercent: 1,
  monthlyTime: "18d",
};

export function UsageView(): JSX.Element {
  const u = mockUsage;
  return (
    <box gap={0}>
      <Title text="Usage" color="#6bcf7f" />
      <box flexDirection="row" gap={1}>
        <text>Rolling:</text>
        <text>{u.rollingPercent}%</text>
        <text fg="#888">{u.rollingTime}</text>
      </box>
      <ProgressBar value={u.rollingPercent} color="#6bcf7f" />
      <box flexDirection="row" gap={1}>
        <text>Weekly:</text>
        <text>{u.weeklyPercent}%</text>
        <text fg="#888">{u.weeklyTime}</text>
      </box>
      <ProgressBar value={u.weeklyPercent} color="#6bcf7f" />
      <box flexDirection="row" gap={1}>
        <text>Monthly:</text>
        <text>{u.monthlyPercent}%</text>
        <text fg="#888">{u.monthlyTime}</text>
      </box>
      <ProgressBar value={u.monthlyPercent} color="#6bcf7f" />
    </box>
  );
}