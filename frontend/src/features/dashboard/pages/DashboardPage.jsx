import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectAllPatients, fetchPatients, selectPatientStatus } from "../../../store/slices/patientSlice";
import StatusBadge from "../../../components/ui/Badge";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import {
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Brain,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { useAllEncounters } from "../../../common/hooks/useEncounters";
import axiosInstance from "../../../config/axios";
import apiClient from "../../../services/api/apiClient";
import { selectTheme } from "../../../store/slices/themeSlice";

const CHART_ACCENT = "#0052CC"; // primary-500

function KPICard({ data }) {
  const iconMap = {
    users: Users,
    clock: Clock,
    "check-circle": CheckCircle,
    "alert-triangle": Brain,
  };
  const Icon = iconMap[data.icon] || Users;

  const isAlert = data.trend === "alert";
  const isPositive = data.trend === "up";

  return (
    <Card className="flex flex-col justify-between h-[136px] relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-800 dark:text-slate-400">
            {data.label}
          </span>
          <Icon
            className={`w-5 h-5 ${isAlert ? "text-primary-500" : "text-primary-600"}`}
          />
        </div>
        <div className="text-3xl font-bold text-neutral-900 dark:text-slate-100 tracking-tight">
          {data.value}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isPositive && <TrendingUp className="w-3.5 h-3.5 text-success-500" />}
        <span
          className={`text-xs ${isAlert ? "text-primary-600 dark:text-primary-400 font-semibold" : "text-neutral-500 dark:text-neutral-400"}`}
        >
          {data.change}
        </span>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const allPatients = useSelector(selectAllPatients);
  const status = useSelector(selectPatientStatus);
  const archivedPatients = useSelector(state => state.patients.archivedList);
  const archivedStatus = useSelector(state => state.patients.archivedStatus);

  const { encounters, loading: encountersLoading } = useAllEncounters();
  const { user } = useSelector(state => state.auth);
  const theme = useSelector(selectTheme);
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [visionResults, setVisionResults] = useState([]);
  const [protocolsCount, setProtocolsCount] = useState(0);

  const chartChrome = {
    grid: isDark ? "#434654" : "#ECEEF0",
    tick: isDark ? "#737685" : "#505F76",
    tooltipBg: isDark ? "#191C1E" : "#FFFFFF",
    tooltipBorder: isDark ? "#434654" : "#ECEEF0",
    tooltipText: isDark ? "#F2F4F6" : "#191C1E",
  };

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchPatients());
    }
  }, [status, dispatch]);

  useEffect(() => {
    if (archivedStatus === "idle") {
      import("../../../store/slices/patientSlice").then(({ fetchArchivedPatients }) => {
        dispatch(fetchArchivedPatients());
      });
    }
  }, [archivedStatus, dispatch]);

  useEffect(() => {
    // Load Vision AI analysis results for pending reviews queue
    apiClient.get("/ai/vision/results")
      .then(res => setVisionResults(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.warn("Failed to load vision results for dashboard", err));

    // Load active RAG guidelines count
    apiClient.get("/ai/rag/status")
      .then(res => {
        setProtocolsCount(res.data?.documentCount || 0);
      })
      .catch(_ => {});

    // Load dashboard analytics
    axiosInstance.get("/api/analytics/dashboard")
      .then(res => setAnalyticsData(res.data))
      .catch(err => console.warn("Failed to fetch analytics", err));
  }, []);

  // Filter Active Patients ONLY (exclude archived)
  const activePatients = (allPatients || []).filter(p => !p.archived && p.status !== "ARCHIVED");
  const activePatientIds = new Set(activePatients.map(p => String(p.id)));
  const activePatientMrns = new Set(activePatients.map(p => p.mrn));

  // Filter Encounters belonging ONLY to Active Patients
  const activeEncounters = (encounters || []).filter(e => activePatientIds.has(String(e.patientId)));

  // Filter Unverified Vision AI documents for Active Patients
  const unverifiedVisionDocs = visionResults.filter(v => activePatientMrns.has(v.patientMrn) && !v.verified);

  // Active care episodes (encounters in progress or coding complete)
  const pendingEncounters = activeEncounters.filter(e => e.status !== "BILLED");

  // Dynamic KPI Data
  const kpiData = {
    totalPatients: {
      label: "Active Patients",
      value: status === "loading" ? "..." : activePatients.length.toString(),
      trend: "up",
      change: `${archivedPatients?.length || 0} archived patients`,
      icon: "users",
    },
    activeEpisodes: {
      label: "Active Encounters",
      value: encountersLoading ? "..." : activeEncounters.length.toString(),
      trend: "up",
      change: `${pendingEncounters.length} open episode(s)`,
      icon: "clock",
    },
    pendingReviews: {
      label: "Pending AI Reviews",
      value: (unverifiedVisionDocs.length + pendingEncounters.length).toString(),
      trend: "up",
      change: "Requires doctor verification",
      icon: "check-circle",
    },
    knowledgeBase: {
      label: "RAG Clinical Knowledge",
      value: `${protocolsCount} Active`,
      trend: "alert",
      change: "Hospital RAG guidelines active",
      icon: "alert-triangle",
    },
  };
  
  // Format data for Recharts
  const barChartData = analyticsData?.charts?.patientVisits || [];
  const areaChartData = analyticsData?.charts?.admissionsTrend || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-neutral-800 dark:text-slate-400 mt-1">
            Welcome back, {user?.fullName || user?.name || "Dr. N. Mohammed Shakeel, MD"}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard data={kpiData.totalPatients} />
        <KPICard data={kpiData.activeEpisodes} />
        <KPICard data={kpiData.pendingReviews} />
        <KPICard data={kpiData.knowledgeBase} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Today's Active Encounters & Pending Reviews */}
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between border-b border-neutral-500 dark:border-slate-700 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                  Today's Encounters
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Showing active care episodes only (archived records excluded)
                </p>
              </div>
              <button 
                onClick={() => navigate("/patients")} 
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-500 dark:border-slate-700 bg-neutral-100 dark:bg-slate-800/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">
                      Patient
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">
                      Time / Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">
                      Chief Complaint
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                {(() => {
                    const today = new Date().toISOString().split('T')[0];
                    const todaysEncounters = activeEncounters.filter(e =>
                        e.encounterDate?.split('T')[0] === today
                    );
                    const displayEncounters = todaysEncounters.length > 0
                        ? todaysEncounters
                        : activeEncounters.slice(0, 5);

                    if (displayEncounters.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                            No active encounters found.
                          </td>
                        </tr>
                      );
                    }

                    return displayEncounters.map((encounter, index) => {
                    const patient = activePatients.find(p =>
                        String(p.id) === String(encounter.patientId)
                    );
                    const patientName = patient ? (patient.name || `${patient.firstName} ${patient.lastName}`) : 'Active Patient';
                    
                    return (
                    <tr
                      key={encounter.id}
                      className={`border-b border-neutral-400 dark:border-slate-700/50 ${
                        index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-neutral-50 dark:bg-slate-800/30"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-slate-200">
                            {patientName}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-slate-400 font-mono">
                            {patient ? patient.mrn : ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">
                        {encounter.encounterType || 'Outpatient'}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">
                        {encounter.encounterDate ? encounter.encounterDate.split('T')[0] : 'Today'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={encounter.status === 'CODING_COMPLETE' ? 'warning' : encounter.status === 'BILLED' ? 'success' : 'info'}
                          label={encounter.status}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">
                        {encounter.chiefComplaint || 'Consultation'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant={encounter.status === "IN_PROGRESS" ? "secondary" : "primary"}
                          size="sm"
                          onClick={() => navigate(`/encounters/${encounter.patientId}`)}
                        >
                          {encounter.status === "IN_PROGRESS" ? "Resume" : "View"}
                        </Button>
                      </td>
                    </tr>
                    );});
                })()}
                
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pending AI Reviews (Real HITL Queue with Patient Name & MRN) */}
          <Card>
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-warning-500" />
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                    Pending AI Reviews & Verification
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Unverified Vision AI documents & open clinical items
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-warning-600 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 px-2.5 py-1 rounded-full">
                {unverifiedVisionDocs.length + pendingEncounters.length} Pending
              </span>
            </div>

            <div className="space-y-3">
              {/* 1. Unverified Vision AI Documents */}
              {unverifiedVisionDocs.map((doc) => {
                const patient = activePatients.find(p => p.mrn === doc.patientMrn);
                const patientName = patient ? (patient.name || `${patient.firstName} ${patient.lastName}`) : doc.patientMrn;
                return (
                  <div
                    key={doc.id}
                    className="p-4 bg-white dark:bg-neutral-900 rounded-8 border border-warning-200 dark:border-warning-900/50 hover:border-warning-400 transition-colors shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary-500 shrink-0" />
                        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {patientName}
                        </span>
                        <span className="text-xs font-mono text-neutral-400">
                          ({doc.patientMrn})
                        </span>
                      </div>
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Vision AI Analysis: <span className="font-semibold text-primary-600 dark:text-primary-400">{doc.aiHeading || doc.documentType || 'Medical Image'}</span>
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Analyzed: {doc.analyzedAt ? new Date(doc.analyzedAt).toLocaleString() : 'Recently'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status="warning" label="Requires Verification" />
                      <Button
                        size="sm"
                        onClick={() => patient ? navigate(`/encounters/${patient.id}`) : navigate('/patients')}
                      >
                        Review & Verify
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* 2. Open / In Progress Encounters */}
              {pendingEncounters.slice(0, 3).map((enc) => {
                const patient = activePatients.find(p => String(p.id) === String(enc.patientId));
                const patientName = patient ? (patient.name || `${patient.firstName} ${patient.lastName}`) : 'Active Patient';
                return (
                  <div
                    key={enc.id}
                    className="p-4 bg-white dark:bg-neutral-900 rounded-8 border border-neutral-200 dark:border-neutral-800 hover:border-primary-400 transition-colors shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-warning-500 shrink-0" />
                        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {patientName}
                        </span>
                        <span className="text-xs font-mono text-neutral-400">
                          ({patient?.mrn || ''})
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Encounter: {enc.encounterType || 'Outpatient'} — <span className="italic">{enc.chiefComplaint || 'Consultation'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status="info" label={enc.status} />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/encounters/${enc.patientId}`)}
                      >
                        Open Workspace
                      </Button>
                    </div>
                  </div>
                );
              })}

              {unverifiedVisionDocs.length === 0 && pendingEncounters.length === 0 && (
                <div className="text-center py-6 text-sm text-neutral-500 dark:text-neutral-400">
                  <CheckCircle className="w-8 h-8 text-success-500 mx-auto mb-2" />
                  All AI reviews and patient encounters are up to date!
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Charts */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                Patient Visits
              </h3>
              <span className="px-2 py-0.5 bg-neutral-200 dark:bg-slate-700 rounded-6 text-xs font-semibold text-neutral-800 dark:text-slate-300">
                This Week
              </span>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="none" vertical={false} stroke={chartChrome.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartChrome.tick }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartChrome.tick }} />
                  <RechartsTooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: `1px solid ${chartChrome.tooltipBorder}`,
                      background: chartChrome.tooltipBg,
                      color: chartChrome.tooltipText,
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="patients" fill={CHART_ACCENT} radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                Admissions Trend
              </h3>
              <span className="px-2 py-0.5 bg-neutral-200 dark:bg-slate-700 rounded-6 text-xs font-semibold text-neutral-800 dark:text-slate-300">
                This Week
              </span>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAdmissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="none" vertical={false} stroke={chartChrome.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartChrome.tick }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartChrome.tick }} />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: `1px solid ${chartChrome.tooltipBorder}`,
                      background: chartChrome.tooltipBg,
                      color: chartChrome.tooltipText,
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="admissions" stroke={CHART_ACCENT} strokeWidth={2} fillOpacity={1} fill="url(#colorAdmissions)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
