/**
 * 从消息列表中查找最后一条有效的 assistant 消息
 * 返回 providerID 和 modelID
 */
export function findLastAssistantMessage(
  messages: readonly { role: string; [key: string]: unknown }[]
): { providerID: string; modelID: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;

    if (!("providerID" in msg) || typeof msg.providerID !== "string") {
      continue;
    }

    const modelID =
      "modelID" in msg && typeof msg.modelID === "string"
        ? msg.modelID
        : "";

    return {
      providerID: msg.providerID as string,
      modelID,
    };
  }
  return null;
}
