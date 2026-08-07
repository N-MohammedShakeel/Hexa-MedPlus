import React, { useState } from "react";
import StatusBadge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import EmptyState from "../../../components/ui/EmptyState";
import {
  Search,
  Download,
  ChevronDown,
  FileText,
  Loader2
} from "lucide-react";
import Input from "../../../components/ui/Input";
import { clinicalService } from "../../../services/api/clinicalService";
import { downloadAuditsCsv } from "../../../services/api/auditService";
import { notifyError } from "../../../common/utils/toast";


const categoryLabels = {
  PHI_ACCESS: "PHI Access",
  AUTH: "Authentication",
  CLINICAL_DATA: "Clinical Data",
  LIFECYCLE: "Lifecycle",
  DATA_EXPORT: "Data Export",
  AI: "AI",
};

const categoryStatus = {
  PHI_ACCESS: "danger",
  AUTH: "info",
  CLINICAL_DATA: "success",
  LIFECYCLE: "warning",
  DATA_EXPORT: "warning",
  AI: "info",
};

const getActionStatus = (action) => {
  switch (action) {
    case "Approved":
      return "success";
    case "AI Generated":
    case "AI Suggested":
      return "info";
    case "Rejected":
      return "danger";
    default:
      return "neutral";
  }
};

export default function AuditTrailsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [userFilter, setUserFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const PAGE_SIZE = 20;

  React.useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await clinicalService.getAuditLogs();
        const mappedLogs = data.map(log => ({
          id: log.id,
          timestamp: log.createdAt,
          user: log.actorName || "AI Engine",
          userInitials: (log.actorName || "AI").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          action: log.taskType || "PROCESSING",
          eventCategory: log.eventCategory || "AI",
          component: log.eventCategory === 'AI' ? 'AI Engine Service' : log.eventCategory || "System",
          patientMrn: log.patientMrn || "",
          details: log.details || `Encounter: ${log.encounterId || 'N/A'}`,
          status: "Completed",
          statusColor: "success",
          hasDiff: !!(log.prompt && log.response),
          previousValue: log.prompt,
          newValue: log.response
        }));
        setLogs(mappedLogs);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
        notifyError("Failed to load audit trails.");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.patientMrn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.component.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction =
      actionFilter === "All Actions" || log.action === actionFilter;
    const matchesCategory =
      categoryFilter === "All Categories" || log.eventCategory === categoryFilter;
    const matchesUser =
      !userFilter || log.user.toLowerCase().includes(userFilter.toLowerCase());
    return matchesSearch && matchesAction && matchesCategory && matchesUser;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedLogs = filteredLogs.slice(pageStart, pageStart + PAGE_SIZE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, categoryFilter, userFilter]);

  const handleDownloadAllAudits = async () => {
    setIsDownloading(true);
    try {
      await downloadAuditsCsv();
    } catch (error) {
      notifyError("Failed to download audit trail CSV.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ["Timestamp", "User", "Action", "Details", "Component", "Status"];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((log) => [
      formatDate(log.timestamp),
      log.user,
      log.action,
      log.details,
      log.component,
      log.status,
    ].map(escapeCsv).join(","));
    const csv = [headers.map(escapeCsv).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown Date";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Unknown Date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Audit Trails
          </h1>
          <p className="text-sm text-neutral-800 dark:text-slate-400 mt-1">
            Track all system activities and AI decisions for HIPAA compliance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={Download} onClick={handleExportCsv} disabled={filteredLogs.length === 0}>
            Export Filtered CSV
          </Button>
          <Button variant="primary" icon={Download} onClick={handleDownloadAllAudits} disabled={isDownloading}>
            {isDownloading ? "Downloading..." : "Download All Audits"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="md" className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Search"
            placeholder="Search by user, details, or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            leftIcon={Search}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Event Category</label>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-neutral-400 dark:border-slate-700 rounded-4 text-sm text-neutral-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option>All Categories</option>
            <option value="PHI_ACCESS">PHI Access</option>
            <option value="AUTH">Authentication</option>
            <option value="CLINICAL_DATA">Clinical Data</option>
            <option value="LIFECYCLE">Lifecycle</option>
            <option value="DATA_EXPORT">Data Export</option>
            <option value="AI">AI</option>
          </select>
        </div>
        <div className="flex-1">
          <Input
            label="Action Type"
            placeholder="All Actions"
            value={actionFilter === "All Actions" ? "" : actionFilter}
            onChange={(e) => setActionFilter(e.target.value || "All Actions")}
          />
        </div>
        <div className="w-48">
          <Input
            label="User / Actor"
            placeholder="Search user..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            onClear={() => setUserFilter('')}
            leftIcon={Search}
          />
        </div>
      </Card>

      {/* Audit Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
            <p className="text-sm text-neutral-600 dark:text-slate-400">Loading audit trails...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No audit logs found"
            description="Try adjusting your search term or filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
            <thead>
                <tr className="border-b border-neutral-500 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">Actor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">Patient MRN</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">Details</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300"></th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.map((log) => {
                const isExpanded = expandedRow === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`border-b border-neutral-400 dark:border-slate-700/50 hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        isExpanded ? "bg-neutral-50 dark:bg-slate-800/50" : ""
                      }`}
                      onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-sm text-neutral-900 dark:text-slate-200 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={categoryStatus[log.eventCategory] || categoryStatus.AI}
                          label={categoryLabels[log.eventCategory] || categoryLabels.AI}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-info-100 dark:bg-info-900/30 flex items-center justify-center text-xs font-bold text-info-500 dark:text-info-400">
                            {log.userInitials}
                          </div>
                          <span className="text-sm text-neutral-900 dark:text-slate-200">
                            {log.user}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={getActionStatus(log.action)}
                          label={log.action.replace(/_/g, " ")}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-neutral-600 dark:text-slate-400">
                        {log.patientMrn || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-neutral-800 dark:text-slate-300">
                        {log.details.length > 60 ? log.details.substring(0, 60) + "..." : log.details}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-1.5 rounded-2 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors">
                          <ChevronDown
                            className={`w-4 h-4 text-neutral-600 dark:text-slate-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && log.hasDiff && (
                      <tr>
                        <td colSpan="7" className="px-0">
                          <div className="bg-neutral-50 dark:bg-slate-900/50 border-l-4 border-primary-500 p-4">
                            <div className="flex gap-6">
                              <div className="flex-1">
                                <h4 className="text-xs font-semibold text-neutral-900 dark:text-slate-200 uppercase tracking-wider mb-3">
                                  Previous Value
                                </h4>
                                <div className="bg-neutral-300 dark:bg-slate-800 rounded-2 p-4 min-h-[80px] overflow-y-auto">
                                  <p className="text-xs font-medium text-neutral-800 dark:text-slate-300 tracking-wider leading-5">
                                    {log.previousValue}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-xs font-semibold text-neutral-900 dark:text-slate-200 uppercase tracking-wider mb-3">
                                  New Value (Modified by User)
                                </h4>
                                <div className="bg-neutral-300 dark:bg-slate-800 border border-neutral-500 dark:border-slate-700 rounded-2 p-4 min-h-[80px] overflow-y-auto">
                                  <p className="text-xs font-medium text-neutral-800 dark:text-slate-300 tracking-wider leading-5">
                                    {log.newValue}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-neutral-100 dark:bg-slate-800/50 border-t border-neutral-500 dark:border-slate-700">
          <span className="text-sm text-neutral-800 dark:text-slate-300">
            Showing {filteredLogs.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length} records
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center border border-neutral-500 dark:border-slate-700 rounded-2 disabled:opacity-50 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 flex items-center justify-center border border-neutral-500 dark:border-slate-700 rounded-2 text-xs font-bold transition-colors ${
                  page === currentPage ? "bg-primary-500 text-white" : "hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-300"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center border border-neutral-500 dark:border-slate-700 rounded-2 disabled:opacity-50 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-colors"
            >
              →
            </button>
          </div>
        </div>
        </>
        )}
      </Card>
    </div>
  );
}
