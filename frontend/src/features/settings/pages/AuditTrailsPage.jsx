import React, { useState } from "react";
import StatusBadge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import {
  Search,
  Download,
  ChevronDown,
  Eye,
  Clock,
  AlertTriangle,
  FileText,
  Loader2
} from "lucide-react";
import Input from "../../../components/ui/Input";
import { clinicalService } from "../../../services/api/clinicalService";
import { downloadAuditsCsv } from "../../../services/api/auditService";


const actionTypeConfig = {
  "AI Generated": { color: "bg-info-50 text-info-500", Icon: FileText },
  "AI Suggested": { color: "bg-info-50 text-info-500", Icon: FileText },
  Approved: { color: "bg-success-50 text-success-500", Icon: FileText },
  Rejected: { color: "bg-danger-50 text-danger-500", Icon: FileText },
  Modified: { color: "bg-neutral-300 text-neutral-800", Icon: FileText },
  Viewed: { color: "bg-neutral-300 text-neutral-800", Icon: Eye },
};

const categoryConfig = {
  PHI_ACCESS:    { color: "bg-purple-50 text-purple-700 border-purple-200", label: "PHI Access" },
  AUTH:          { color: "bg-blue-50 text-blue-700 border-blue-200",   label: "Authentication" },
  CLINICAL_DATA: { color: "bg-green-50 text-green-700 border-green-200", label: "Clinical Data" },
  LIFECYCLE:     { color: "bg-amber-50 text-amber-700 border-amber-200", label: "Lifecycle" },
  DATA_EXPORT:   { color: "bg-orange-50 text-orange-700 border-orange-200", label: "Data Export" },
  AI:            { color: "bg-info-50 text-info-700 border-info-200",   label: "AI" },
};

export default function AuditTrailsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [actionFilter, setActionFilter] = useState("All Actions");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [componentFilter, setComponentFilter] = useState("All Components");
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
    const matchesComponent =
      componentFilter === "All Components" || log.component === componentFilter;
    const matchesUser =
      !userFilter || log.user.toLowerCase().includes(userFilter.toLowerCase());
    return matchesSearch && matchesAction && matchesCategory && matchesComponent && matchesUser;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedLogs = filteredLogs.slice(pageStart, pageStart + PAGE_SIZE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, categoryFilter, componentFilter, userFilter]);

  const handleDownloadAllAudits = async () => {
    setIsDownloading(true);
    try { await downloadAuditsCsv(); } finally { setIsDownloading(false); }
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

  const getStatusColor = (status) => {
    switch (status) {
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Audit Trails
          </h1>
          <p className="text-sm text-neutral-800 mt-1">
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
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-semibold text-neutral-700 mb-1">Event Category</label>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-neutral-400 dark:border-slate-700 rounded-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            leftIcon={Search}
          />
        </div>
      </Card>

      {/* Audit Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
            <p className="text-sm text-neutral-600">Loading audit trails...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
            <thead>
                <tr className="border-b border-neutral-500 bg-neutral-100 dark:bg-slate-800/50">
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
                const config =
                  actionTypeConfig[log.action] || actionTypeConfig["Viewed"];
                const Icon = config.Icon;
                const isExpanded = expandedRow === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`border-b border-neutral-400 hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        isExpanded ? "bg-neutral-50 dark:bg-slate-800/50" : ""
                      }`}
                      onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-sm text-neutral-900 dark:text-slate-200 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const cfg = categoryConfig[log.eventCategory] || categoryConfig['AI'];
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-info-100 flex items-center justify-center text-xs font-bold text-info-500">
                            {log.userInitials}
                          </div>
                          <span className="text-sm text-neutral-900 dark:text-slate-200">
                            {log.user}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-2 text-xs font-medium ${(actionTypeConfig[log.action] || actionTypeConfig["Viewed"]).color}`}>
                          <Icon className="w-3 h-3" />
                          {log.action.replace(/_/g, " ")}
                        </div>
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
                            className={`w-4 h-4 text-neutral-600 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && log.hasDiff && (
                      <tr>
                        <td colSpan="7" className="px-0">
                          <div className="bg-neutral-50 border-l-4 border-primary-500 p-4">
                            <div className="flex gap-6">
                              <div className="flex-1">
                                <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-3">
                                  Previous Value
                                </h4>
                                <div className="bg-neutral-300 rounded-2 p-4 min-h-[80px] overflow-y-auto">
                                  <p className="text-xs font-medium text-neutral-800 tracking-wider leading-5">
                                    {log.previousValue}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-3">
                                  New Value (Modified by User)
                                </h4>
                                <div className="bg-neutral-300 border border-neutral-500 rounded-2 p-4 min-h-[80px] overflow-y-auto">
                                  <p className="text-xs font-medium text-neutral-800 tracking-wider leading-5">
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

        <div className="flex items-center justify-between px-4 py-3 bg-neutral-100 border-t border-neutral-500">
          <span className="text-sm text-neutral-800">
            Showing {filteredLogs.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length} records
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center border border-neutral-500 rounded-2 disabled:opacity-50 hover:bg-neutral-200 transition-colors"
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 flex items-center justify-center border border-neutral-500 rounded-2 text-xs font-bold transition-colors ${
                  page === currentPage ? "bg-primary-500 text-white" : "hover:bg-neutral-200"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center border border-neutral-500 rounded-2 disabled:opacity-50 hover:bg-neutral-200 transition-colors"
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
