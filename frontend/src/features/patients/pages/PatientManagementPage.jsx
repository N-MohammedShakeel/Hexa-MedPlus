import React, { useState, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectAllPatients, fetchPatients, selectPatientStatus, archivePatient } from "../../../store/slices/patientSlice";
import { useAllEncounters } from "../../../common/hooks/useEncounters";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import StatusBadge from "../../../components/ui/Badge";
import { Plus, Search, Download, MoreVertical, Activity, X, Tag, FileText, Pill, History, MessageSquare, ChevronDown, Check, Archive } from "lucide-react";
import Input from "../../../components/ui/Input";
import AddPatientModal from "../components/AddPatientModal";
import PatientNotesDrawer from "../components/PatientNotesDrawer";
import axiosInstance from "../../../config/axios";
import { logPatientArchived, logRecordExported } from "../../../services/api/auditService";

// Priority: higher = more urgent to surface in the status badge
const CODING_STATUS_PRIORITY = {
  CODING_REVISION: 5,
  CODING_PENDING:  4,
  CODING_COMPLETE: 3,
  BILLING_READY:   2,
  BILLED:          1,
  IN_PROGRESS:     0,
};

const CODING_STATUS_BADGE = {
  CODING_PENDING:  { label: "Awaiting Coding",  cls: "bg-amber-100 text-amber-800 border-amber-200" },
  CODING_COMPLETE: { label: "Pending Review",    cls: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  CODING_REVISION: { label: "Revision Needed",   cls: "bg-red-100 text-red-800 border-red-200" },
  BILLING_READY:   { label: "Ready to Bill",     cls: "bg-green-100 text-green-800 border-green-200" },
  BILLED:          { label: "Billed",            cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

export default function PatientManagementPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const allPatients = useSelector(selectAllPatients);
  const status      = useSelector(selectPatientStatus);
  const { encounters } = useAllEncounters();

  const [searchTerm,      setSearchTerm]      = useState("");
  const [isAddModalOpen,  setIsAddModalOpen]  = useState(false);
  const [departmentFilter,setDepartmentFilter]= useState("All Departments");
  const [statusFilter,    setStatusFilter]    = useState("All Status");
  const [admissionFilter, setAdmissionFilter] = useState("All Admissions");
  const [genderFilter,    setGenderFilter]    = useState("All Genders");
  const [currentPage,     setCurrentPage]     = useState(1);
  const [notesPatient,    setNotesPatient]    = useState(null); // patient for notes drawer
  const itemsPerPage = 10;

  useEffect(() => {
    if (status === "idle") dispatch(fetchPatients());
  }, [status, dispatch]);

  // Patient CSV export — comprehensive columns
  const handleExportPatients = () => {
    const headers = [
      "Patient Name", "MRN", "Date of Birth", "Age", "Gender", "Department", "Status",
      "Allergies / Primary Diagnosis", "Active Medications",
      "Total Encounters", "Last Encounter Date", "Last Encounter Status", "Admission Type",
      "Archived", "Archived Date"
    ];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filteredPatients.map(p => {
      const enc = patientEncounterMap[String(p.id)];
      const admissionType = parseInt(p.mrn.split('-')[1] || '0') % 2 === 0 ? 'Inpatient' : 'Outpatient';
      const totalEnc = (encounters || []).filter(e => String(e.patientId) === String(p.id)).length;
      return [
        p.name, p.mrn, p.lastVisit, p.age, p.gender, p.department, p.status,
        p.primaryDiagnosis, '—',
        totalEnc,
        enc?.encounterDate?.split('T')[0] || p.lastVisit,
        enc?.status || '—',
        admissionType,
        p.archived ? 'Yes' : 'No',
        p.archivedAt ? new Date(p.archivedAt).toLocaleDateString() : '—',
      ].map(escape).join(',');
    });
    const csv = [headers.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logRecordExported('Patient List CSV', filteredPatients.length);
  };

  // Map: patientId → most-urgent encounter (for the coding status badge)
  const patientEncounterMap = useMemo(() => {
    const map = {};
    (encounters || []).forEach(enc => {
      const pid = String(enc.patientId);
      const existing = map[pid];
      const newPri  = CODING_STATUS_PRIORITY[enc.status] ?? -1;
      const exPri   = existing ? (CODING_STATUS_PRIORITY[existing.status] ?? -2) : -2;
      if (newPri > exPri) map[pid] = enc;
    });
    return map;
  }, [encounters]);

  const filteredPatients = useMemo(() => {
    return allPatients.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.mrn.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept   = departmentFilter === "All Departments" || p.department === departmentFilter;
      const matchStatus = statusFilter === "All Status" || p.status === statusFilter;
      const mockAdm     = parseInt(p.mrn.split('-')[1] || "0") % 2 === 0 ? "Inpatient" : "Outpatient";
      const matchAdm    = admissionFilter === "All Admissions" || mockAdm === admissionFilter;
      const matchGender = genderFilter === "All Genders" || p.gender === genderFilter;
      return matchSearch && matchDept && matchStatus && matchAdm && matchGender;
    });
  }, [allPatients, searchTerm, departmentFilter, statusFilter, admissionFilter, genderFilter]);

  const totalPages       = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Patient Management
          </h1>
          <p className="text-sm text-neutral-800 dark:text-slate-400 mt-1">
            Manage and view all patient records
          </p>
        </div>
        <Button icon={Plus} onClick={() => setIsAddModalOpen(true)}>
          Add Patient
        </Button>
      </div>

      {/* Filters */}
      <Card padding="md" className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search patients, MRN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={Search}
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { v: departmentFilter, set: setDepartmentFilter, opts: ["All Departments","Cardiology","Endocrinology","Pulmonology","Oncology","Neurology","General Medicine"] },
            { v: statusFilter,     set: setStatusFilter,     opts: ["All Status","Active","Inactive"] },
            { v: admissionFilter,  set: setAdmissionFilter,  opts: ["All Admissions","Inpatient","Outpatient"] },
            { v: genderFilter,     set: setGenderFilter,     opts: ["All Genders","Male","Female"] },
          ].map((f, i) => (
            <select key={i} value={f.v} onChange={e => f.set(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-neutral-500 dark:border-slate-700 rounded-4 text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
          <div className="border-l border-neutral-500 dark:border-slate-700 pl-3">
            <Button variant="ghost" size="md" icon={Download} onClick={handleExportPatients}>Export</Button>
          </div>
        </div>
      </Card>

      {/* Patient Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-500 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800/50">
                {["Patient Name","MRN","Age/Gender","Status","Primary Diagnosis","Department","Last Visit","Coding Status","Actions"].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-neutral-700 dark:text-slate-300 uppercase tracking-wider ${h === "Actions" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.length > 0 ? paginatedPatients.map((patient, index) => {
                const topEnc      = patientEncounterMap[String(patient.id)];
                const codingBadge = topEnc ? CODING_STATUS_BADGE[topEnc.status] : null;

                return (
                  <tr
                    key={patient.id}
                    onClick={() => navigate(`/encounters/${patient.id}`)}
                    className={`border-b border-neutral-400 dark:border-slate-700/50 hover:bg-primary-50/30 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                      index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-neutral-50/50 dark:bg-slate-800/30"
                    }`}
                  >
                    {/* Patient Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {patient.name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <span className="text-sm font-medium text-neutral-900 dark:text-slate-200">{patient.name}</span>
                      </div>
                    </td>

                    {/* MRN */}
                    <td className="px-4 py-3 text-xs font-mono text-neutral-600 dark:text-slate-400 tracking-wider">
                      {patient.mrn}
                    </td>

                    {/* Age/Gender */}
                    <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">
                      {patient.age}y / {patient.gender?.charAt(0)}
                    </td>

                    {/* Patient Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={patient.status === 'Active' ? 'success' : 'default'} label={patient.status} />
                    </td>

                    {/* Primary Diagnosis */}
                    <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300 truncate max-w-[180px]" title={patient.primaryDiagnosis}>
                      {patient.primaryDiagnosis}
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">
                      {patient.department}
                    </td>

                    {/* Last Visit */}
                    <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">
                      {topEnc?.encounterDate?.split('T')[0] || patient.lastVisit}
                    </td>

                    {/* Coding Status — clickable badge */}
                    <td className="px-4 py-3">
                      {codingBadge ? (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/coding/${patient.id}`); }}
                          title={`Go to Coding Workbench for ${patient.name}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-4 border text-[11px] font-semibold hover:opacity-80 transition-opacity ${codingBadge.cls}`}
                        >
                          <Activity className="w-3 h-3" />
                          {codingBadge.label}
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-400 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setNotesPatient(patient); }}
                          className="p-1.5 rounded-2 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
                          title="Clinical Notes & Tags"
                        >
                          <MoreVertical className="w-4 h-4 text-neutral-600 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (window.confirm(`Archive ${patient.name}? They will be removed from the active workspace and can be restored later from Records.`)) {
                              dispatch(archivePatient(patient.id));
                              logPatientArchived(patient.mrn, patient.name);
                            }
                          }}
                          className="p-1.5 rounded-2 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
                          title="Archive Patient"
                        >
                          <Archive className="w-4 h-4 text-neutral-600 dark:text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="9" className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-slate-400">
                    No patients found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-100 dark:bg-slate-800/50 border-t border-neutral-500 dark:border-slate-700">
          <span className="text-sm text-neutral-800 dark:text-slate-300">
            Showing {filteredPatients.length === 0 ? 0 : Math.min((currentPage - 1) * itemsPerPage + 1, filteredPatients.length)}–
            {Math.min(currentPage * itemsPerPage, filteredPatients.length)} of {filteredPatients.length} patients
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className={`w-8 h-8 flex items-center justify-center border border-neutral-500 dark:border-slate-700 rounded-2 ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-300'}`}>
              ←
            </button>
            <button className="w-8 h-8 flex items-center justify-center border border-neutral-500 dark:border-slate-700 rounded-2 bg-primary-500 text-white text-xs font-bold">
              {currentPage}
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))} disabled={currentPage >= (totalPages || 1)}
              className={`w-8 h-8 flex items-center justify-center border border-neutral-500 dark:border-slate-700 rounded-2 ${currentPage >= (totalPages || 1) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-300'}`}>
              →
            </button>
          </div>
        </div>
      </Card>

      <AddPatientModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      {/* Clinical Notes Drawer */}
      {notesPatient && (
        <PatientNotesDrawer
          patient={notesPatient}
          onClose={() => setNotesPatient(null)}
        />
      )}
    </div>
  );
}
