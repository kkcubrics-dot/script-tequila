import {
  appendMessages,
  listNoteVersions,
  readState,
  restoreNoteVersion,
  saveSettings,
  upsertFolder,
  upsertNote,
  updateNoteStructuredSections
} from "@/lib/store";

export const workspaceRepository = {
  readState,
  upsertFolder,
  upsertNote,
  listNoteVersions,
  restoreNoteVersion,
  saveSettings,
  appendMessages,
  updateNoteStructuredSections
};
