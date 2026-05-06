export type LayoutPreset = "write" | "write-assist" | "chat" | "chat-reference";

export const LAYOUT_PRESET_LABEL: Record<LayoutPreset, string> = {
  write: "写作专注",
  "write-assist": "写作+AI",
  chat: "聊天专注",
  "chat-reference": "聊天+参考"
};
