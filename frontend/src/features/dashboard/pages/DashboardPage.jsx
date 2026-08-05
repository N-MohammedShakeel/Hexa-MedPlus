import React from "react";

import { useSelector, useDispatch } from "react-redux";
import { selectAllPatients, fetchPatients, selectPatientStatus } from "../../../store/slices/patientSlice";
import { useEffect } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { clinicalService } from "../../../services/api/clinicalService";
import { useAllEncounters } from "../../../common/hooks/useEncounters";
import axiosInstance from "../../../config/axios";

function KPICard({ data }) {
  const iconMap = {
    users: Users,
    clock: Clock,
    "check-circle": CheckCircle,
    "alert-triangle": AlertTriangle,
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
            className={`w-5 h-5 ${isAlert ? "text-danger-500" : "text-primary-600"}`}
          />
        </div>
        <div className="text-3xl font-bold text-neutral-900 dark:text-slate-100 tracking-tight">
          {data.value}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isPositive && <TrendingUp className="w-3.5 h-3.5 text-success-500" />}
        <span
          className={`text-xs ${isAlert ? "text-danger-500 font-bold" : "text-success-500"}`}
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
  const [auditLogs, setAuditLogs] = React.useState([]);
  const [analyticsData, setAnalyticsData] = React.useState(null);

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
    const fetchAudits = async () => {
      try {
        const logs = await clinicalService.getAuditLogs();
        setAuditLogs(Array.isArray(logs) ? logs : []);
      } catch (err) {
        console.error("Failed to load audit logs", err);
        setAuditLogs([]);
      }
    };
    fetchAudits();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axiosInstance.get('/api/analytics/dashboard');
        setAnalyticsData(response.data);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      }
    };
    fetchAnalytics();
  }, []);

  // Use dynamic data if available, fallback to calculating if still loading
  const kpiData = {
    totalPatients: {
      label: "Total Patients",
      value: analyticsData ? analyticsData.kpis.totalPatients : (status === "loading" ? "..." : allPatients.length.toString()),
      trend: "up",
      change: "+12% from last month",
      icon: "users",
    },
    pendingReviews: {
      label: "Pending AI Reviews",
      value: analyticsData ? analyticsData.kpis.pendingReviews : (encountersLoading ? "..." : (Array.isArray(encounters) ? encounters : []).filter(e => e.status === "CODING_COMPLETE").length.toString()),
      trend: "down",
      change: "Ready for billing",
      icon: "clock",
    },
    codingAccuracy: {
      label: "AI Coding Accuracy",
      value: analyticsData ? `${analyticsData.kpis.codingAccuracy}%` : "96.4%",
      trend: "up",
      change: "+1.2% this week",
      icon: "check-circle",
    },
    clinicalAlerts: {
      label: "Critical Alerts",
      value: analyticsData ? analyticsData.kpis.clinicalAlerts.toString() : "0",
      trend: "alert",
      change: "Requires immediate attention",
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
            Welcome back, {user?.fullName || user?.name || "User"}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard data={kpiData.totalPatients} />
        <KPICard data={kpiData.pendingReviews} />
        <KPICard data={kpiData.codingAccuracy} />
        <KPICard data={kpiData.clinicalAlerts} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Today's Encounters */}
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between border-b border-neutral-500 dark:border-slate-700 pb-4 mb-4">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                Today's Encounters
              </h3>
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
                      Time
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">
                      Diagnosis
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-neutral-800 dark:text-slate-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                {(() => {
                    const today = new Date().toISOString().split('T')[0];
                    const todaysEncounters = (encounters || []).filter(e =>
                        e.encounterDate?.split('T')[0] === today
                    );
                    // Fall back to most recent 5 if no encounters today (demo/dev mode)
                    const displayEncounters = todaysEncounters.length > 0
                        ? todaysEncounters
                        : (encounters || []).slice(0, 5);

                    return displayEncounters.map((encounter, index) => {
                    const combinedPatients = [...(allPatients || []), ...(archivedPatients || [])];
                    const patient = combinedPatients.find(p =>
                        String(p.id) === String(encounter.patientId)
                    );
                    const patientName = patient?.name || (encountersLoading || status === 'loading' || archivedStatus === 'loading' ? '...' : 'Unknown Patient');
                    
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
                          <p className="text-xs text-neutral-600 dark:text-slate-400">
                            {patient ? patient.mrn : ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">
                        {encounter.encounterType}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">
                        {encounter.encounterDate ? encounter.encounterDate.split('T')[0] : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={encounter.status === 'CODING_COMPLETE' ? 'warning' : 'info'}
                          label={encounter.status}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-slate-300">
                        {encounter.chiefComplaint}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {encounter.status === "IN_PROGRESS" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              navigate(`/encounters/${encounter.patientId}`)
                            }
                          >
                            Start
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              navigate(`/encounters/${encounter.patientId}`)
                            }
                          >
                            View
                          </Button>
                        )}
                      </td>
                    </tr>
                    );});
                })()}
                
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pending AI Reviews (HITL Queue) */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-warning-500" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                Pending AI Reviews
              </h3>
            </div>
            <div className="space-y-3">
              {/* Dedup by encounterId — each encounter should appear only once */}
              {Array.from(new Map(auditLogs.map(l => [l.encounterId, l])).values()).slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  className="p-4 bg-neutral-50 dark:bg-slate-800/50 rounded-4 border border-warning-200 dark:border-warning-900/50 hover:border-warning-400 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-neutral-900 dark:text-slate-200">
                      {log.taskType || "AI Generated Pathway"}
                    </span>
                    <span className="text-xs text-neutral-600 dark:text-slate-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-800 dark:text-slate-300 line-clamp-2 mt-1">
                    Encounter ID: {log.encounterId?.substring(0, 8) || "N/A"}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-200 dark:border-slate-700">
                    <span className="text-xs font-medium text-neutral-600 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Awaiting Doctor Approval
                    </span>
                    <StatusBadge status="warning" label="Requires Review" />
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                  <div className="text-center p-4 text-sm text-neutral-500">
                      No pending reviews.
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
              <span className="px-2 py-0.5 bg-neutral-200 dark:bg-slate-700 rounded-2 text-xs font-semibold text-neutral-800 dark:text-slate-300">
                This Week
              </span>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="patients" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                Admissions Trend
              </h3>
              <span className="px-2 py-0.5 bg-neutral-200 dark:bg-slate-700 rounded-2 text-xs font-semibold text-neutral-800 dark:text-slate-300">
                This Week
              </span>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAdmissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="admissions" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorAdmissions)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
