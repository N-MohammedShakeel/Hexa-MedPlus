import re

FILE_PATH = r"c:\Hexa-MedPlus\frontend\src\features\encounters\pages\EncounterWorkspacePage.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Add imports if not present
if "import { toast }" not in content:
    content = content.replace(
        'import React, { useState } from "react";',
        'import React, { useState } from "react";\nimport { toast } from "react-hot-toast";\nimport { useConfirm } from "../../../contexts/ConfirmContext";'
    )

if "const confirm = useConfirm();" not in content:
    content = content.replace(
        'export default function EncounterWorkspacePage() {\n    const dispatch = useDispatch();',
        'export default function EncounterWorkspacePage() {\n    const confirm = useConfirm();\n    const dispatch = useDispatch();'
    )

# Replace alert("...") and alert('...')
content = re.sub(r'alert\((["\'].*?["\'])\)', r'toast.error(\1)', content)
# Restore specific success alerts
content = content.replace('toast.error("Note updated successfully!")', 'toast.success("Note updated successfully!")')
content = content.replace('toast.error("Note saved successfully!")', 'toast.success("Note saved successfully!")')

# Replace confirms in handleDeleteVisionRecord
# Original: if (!window.confirm("Are you sure you want to delete this AI analysis record? This will also remove it from the Document list.")) return;
replacement_delete_vision = """
        const confirmed = await confirm("Are you sure you want to delete this AI analysis record? This will also remove it from the Document list.");
        if (!confirmed) return;
"""
content = re.sub(r'if\s*\(!window\.confirm\("Are you sure you want to delete this AI analysis record\? This will also remove it from the Document list\."\)\)\s*return;', replacement_delete_vision.strip(), content)
# We need to make sure handleDeleteVisionRecord is async if it wasn't.
content = content.replace('const handleDeleteVisionRecord = async (id, fileKey) => {', 'const handleDeleteVisionRecord = async (id, fileKey) => {') # It's already async

# Replace confirms in handleNoteDelete
# Original: if (!window.confirm('Delete this note?')) return;
replacement_delete_note = """
        const confirmed = await confirm('Delete this note?');
        if (!confirmed) return;
"""
content = re.sub(r'if\s*\(!window\.confirm\(\'Delete this note\?\'\)\)\s*return;', replacement_delete_note.strip(), content)
# handleNoteDelete is async already: const handleNoteDelete = async (id) => {

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied to EncounterWorkspacePage.jsx")
