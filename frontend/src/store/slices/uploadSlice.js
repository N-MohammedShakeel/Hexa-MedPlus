import { createSlice } from "@reduxjs/toolkit";

// Upload progress lives in Redux (not component state) specifically so it
// survives navigating away from the Document Workspace and back — the AI
// pipeline keeps running server-side regardless of what's mounted, so the UI
// tracking it shouldn't reset just because the component did.
const uploadSlice = createSlice({
  name: "upload",
  initialState: {
    // { id, fileName, fileKey, flowType, phase, log }
    batches: [],
  },
  reducers: {
    resetBatches(state) {
      state.batches = [];
    },
    startBatch(state, action) {
      state.batches.push(action.payload);
    },
    updateBatchById(state, action) {
      const { id, patch } = action.payload;
      const batch = state.batches.find((b) => b.id === id);
      if (batch) Object.assign(batch, patch);
    },
    appendBatchLog(state, action) {
      const { id, line } = action.payload;
      const batch = state.batches.find((b) => b.id === id);
      if (batch) batch.log.push(line);
    },
    // Used when a document's status changes from somewhere other than the
    // upload flow itself (e.g. resolving a blur annotation) so the progress
    // panel reflects reality even if the upload's own poll already stopped.
    updateBatchPhaseByFileKey(state, action) {
      const { fileKey, phase } = action.payload;
      state.batches
        .filter((b) => b.fileKey === fileKey)
        .forEach((b) => {
          b.phase = phase;
        });
    },
  },
});

// Poll-interval handles for in-flight status checks. Deliberately a plain
// module-level object, not component state or a ref — component unmount
// (e.g. navigating to another page) must NOT stop these, since the actual AI
// processing they're watching keeps running on the server regardless.
export const pollTimers = {};

export const {
  resetBatches,
  startBatch,
  updateBatchById,
  appendBatchLog,
  updateBatchPhaseByFileKey,
} = uploadSlice.actions;

export default uploadSlice.reducer;
