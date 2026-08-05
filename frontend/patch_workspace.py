import os
import re

file_path = r'c:\Hexa-MedPlus\frontend\src\features\encounters\pages\EncounterWorkspacePage.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove EvidenceTab and DiagnosisCard definitions from the file
content = re.sub(r'function EvidenceTab\(.*?\)\s*\{.*?\}\s*function DiagnosisCard\(.*?\)\s*\{.*?\}\s*(?=\/\/\s*--- MAIN PAGE ---)', '', content, flags=re.DOTALL)

# Add imports for the new components
imports = """
import EvidenceTab from "../components/EvidenceTab";
import EncounterNotesTab from "../components/EncounterNotesTab";
import EncounterLabsTab from "../components/EncounterLabsTab";
import EncounterImagingTab from "../components/EncounterImagingTab";
import EncounterVitalsTab from "../components/EncounterVitalsTab";
import EncounterAIPane from "../components/EncounterAIPane";
"""

content = content.replace('// --- SUB COMPONENTS ---', imports)

# Replace the Left Pane
left_pane_replacement = """
                {/* Left Pane: Clinical Evidence */}
                <div className="flex-1 bg-neutral-50 flex flex-col border-r border-neutral-500">
                    <EvidenceTab activeTab={activeTab} setActiveTab={setActiveTab} />

                    <div className="flex-1 p-6 overflow-y-auto">
                        {/* Locked banner */}
                        {isLocked && (
                            <div className="max-w-3xl mx-auto mb-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-amber-800">Encounter Locked for Editing</p>
                                    <p className="text-xs text-amber-700 mt-0.5">This encounter has been signed and is currently <strong>{latestEncounter?.status?.replace(/_/g, ' ')}</strong>. Notes cannot be modified.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === "notes" && (
                            <EncounterNotesTab 
                                isLocked={isLocked}
                                noteTag={noteTag} setNoteTag={setNoteTag}
                                noteCustomTag={noteCustomTag} setNoteCustomTag={setNoteCustomTag}
                                noteAlert={noteAlert}
                                newNoteContent={newNoteContent} setNewNoteContent={setNewNoteContent}
                                handleSavePatientNote={handleSavePatientNote} isSavingNote={isSavingNote}
                                patientNotes={patientNotes}
                                expandedNoteId={expandedNoteId} setExpandedNoteId={setExpandedNoteId}
                                handleDeletePatientNote={handleDeletePatientNote}
                                noteCommentInputs={noteCommentInputs} setNoteCommentInputs={setNoteCommentInputs}
                                handleSaveNoteComment={handleSaveNoteComment}
                                TAG_CONFIG={TAG_CONFIG}
                            />
                        )}

                        {activeTab === "labs" && (
                            <EncounterLabsTab 
                                labTrendView={labTrendView} setLabTrendView={setLabTrendView}
                                labTrendsLoading={labTrendsLoading} labTrends={labTrends}
                                visionResults={visionResults} visionLoading={visionLoading}
                                setSelectedVisionDoc={setSelectedVisionDoc} handleVerifyVisionRecord={handleVerifyVisionRecord}
                                handleStartEditVision={handleStartEditVision} handleDeleteVisionRecord={handleDeleteVisionRecord}
                                editingVisionId={editingVisionId} visionEditJson={visionEditJson} setVisionEditJson={setVisionEditJson}
                                handleCancelEditVision={handleCancelEditVision} handleSaveVisionEdit={handleSaveVisionEdit}
                            />
                        )}

                        {activeTab === "imaging" && (
                            <EncounterImagingTab 
                                visionResults={visionResults} visionLoading={visionLoading}
                                setSelectedVisionDoc={setSelectedVisionDoc} handleVerifyVisionRecord={handleVerifyVisionRecord}
                                handleStartEditVision={handleStartEditVision} handleDeleteVisionRecord={handleDeleteVisionRecord}
                                editingVisionId={editingVisionId} visionEditJson={visionEditJson} setVisionEditJson={setVisionEditJson}
                                handleCancelEditVision={handleCancelEditVision} handleSaveVisionEdit={handleSaveVisionEdit}
                            />
                        )}

                        {activeTab === "vitals" && (
                            <EncounterVitalsTab 
                                latestEncounter={latestEncounter}
                                isLocked={isLocked}
                                patientId={patientId}
                                refetchEncounters={refetchEncounters}
                            />
                        )}
                    </div>
                </div>
"""

# Find Left pane start and Right pane start
left_pane_start = content.find('{/* Left Pane: Clinical Evidence */}')
right_pane_start = content.find('{/* Right Pane: AI Assistance */}')

if left_pane_start != -1 and right_pane_start != -1:
    content = content[:left_pane_start] + left_pane_replacement + content[right_pane_start:]


right_pane_replacement = """
                {/* Right Pane: AI Assistance */}
                <EncounterAIPane 
                    aiData={aiData} setAiData={setAiData}
                    aiLoading={aiLoading} aiError={aiError}
                    activeAiTab={activeAiTab} setActiveAiTab={setActiveAiTab}
                    handleGenerateAI={handleGenerateAI} latestEncounter={latestEncounter}
                    patientNotes={patientNotes} patientId={patientId} user={user}
                    isLocked={isLocked} renderTextWithCitations={renderTextWithCitations}
                    openExplainability={openExplainability}
                    isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}
                    selectedData={selectedData}
                />
            </div>

            {selectedVisionDoc && (
                <DocumentVisionViewer 
                    record={selectedVisionDoc}
                    onClose={() => setSelectedVisionDoc(null)}
                    onSaveHitl={(id, vals) => {
                        console.log("HITL saved for", id, vals);
                        setSelectedVisionDoc(null);
                    }}
                    onVerify={(id) => handleVerifyVisionRecord(id)}
                />
            )}
        </div>
    );
}
"""

end_of_file = content.find('{/* Right Pane: AI Assistance */}')
if end_of_file != -1:
    content = content[:end_of_file] + right_pane_replacement


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patching complete!")
