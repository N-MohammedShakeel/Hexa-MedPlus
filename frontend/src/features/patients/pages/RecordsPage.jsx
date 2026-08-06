import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectArchivedPatients,
  selectArchivedPatientStatus,
  fetchArchivedPatients,
  unarchivePatient,
} from "../../../store/slices/patientSlice";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import EmptyState from "../../../components/ui/EmptyState";
import { Search, ArchiveRestore, Loader2, FileText } from "lucide-react";
import { logPatientUnarchived } from "../../../services/api/auditService";
import { useConfirm } from "../../../contexts/ConfirmContext";

const PAGE_SIZE = 10;

export default function RecordsPage() {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const archivedPatients = useSelector(selectArchivedPatients);
  const status = useSelector(selectArchivedPatientStatus);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (status === "idle") dispatch(fetchArchivedPatients());
  }, [status, dispatch]);

  // Reset page on search
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const filtered = useMemo(() => {
    return archivedPatients.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [archivedPatients, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleUnarchive = async (patient) => {
    const ok = await confirm(`Unarchive ${patient.name}? They will reappear in the active Patient Management workspace with their full history intact.`);
    if (!ok) return;
    try {
      await dispatch(unarchivePatient(patient.id));
      logPatientUnarchived(patient.mrn, patient.name);
    } catch (error) {
      // Failure is already surfaced to the user via toast inside the unarchivePatient thunk.
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
          Medical Records / Audits
        </h1>
        <p className="text-sm text-neutral-800 dark:text-slate-400 mt-1">
          Read-only archive of completed and billed patients. Unarchive a returning patient to bring them back into the active workspace.
        </p>
      </div>

      <Card padding="md">
        <div className="max-w-md">
          <Input
            placeholder="Search archived patients, MRN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={Search}
          />
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        {status === "loading" ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
            <p className="text-sm text-neutral-600 dark:text-slate-400">Loading archived patients...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-500 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800/50">
                    {["Patient Name", "MRN", "Age/Gender", "Department", "Archived On", "Actions"].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-neutral-700 dark:text-slate-300 uppercase tracking-wider ${h === "Actions" ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.length > 0 ? paged.map((patient, index) => (
                    <tr
                      key={patient.id}
                      className={`border-b border-neutral-400 dark:border-slate-700/50 ${
                        index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-neutral-50/50 dark:bg-slate-800/30"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-600 dark:bg-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {patient.name?.split(' ').map(n => n[0]).join('') || '?'}
                          </div>
                          <span className="text-sm font-medium text-neutral-900 dark:text-slate-200">{patient.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-neutral-600 dark:text-slate-400 tracking-wider">{patient.mrn}</td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">{patient.age}y / {patient.gender?.charAt(0)}</td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">{patient.department}</td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">
                        {patient.archivedAt ? new Date(patient.archivedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleUnarchive(patient)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-4 border text-[11px] font-semibold border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                          title="Unarchive this patient"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          Unarchive
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="px-0">
                        <EmptyState
                          icon={FileText}
                          title="No archived patients found"
                          description={searchTerm ? "Try adjusting your search term." : "Patients that are archived will appear here."}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-100 dark:bg-slate-800/50 border-t border-neutral-500 dark:border-slate-700">
              <span className="text-sm text-neutral-800 dark:text-slate-300">
                Showing {filtered.length === 0 ? 0 : Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} records
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`w-8 h-8 flex items-center justify-center border border-neutral-500 dark:border-slate-700 rounded-2 ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-neutral-200 dark:hover:bg-slate-700'}`}
                >←</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                  Math.max(0, currentPage - 3),
                  Math.min(totalPages, currentPage + 2)
                ).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center border border-neutral-500 dark:border-slate-700 rounded-2 text-xs font-bold transition-colors ${page === currentPage ? 'bg-primary-500 text-white' : 'hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-300'}`}
                  >{page}</button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className={`w-8 h-8 flex items-center justify-center border border-neutral-500 dark:border-slate-700 rounded-2 ${currentPage >= totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-neutral-200 dark:hover:bg-slate-700'}`}
                >→</button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
