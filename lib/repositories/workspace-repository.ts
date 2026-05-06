import {
  appendMessages,
  readState,
  saveSettings,
  upsertNote,
  upsertProject,
  updateNoteStructuredSections
} from "@/lib/store";

export const workspaceRepository = {
  readState,
  upsertProject,
  upsertNote,
  saveSettings,
  appendMessages,
  updateNoteStructuredSections
};
