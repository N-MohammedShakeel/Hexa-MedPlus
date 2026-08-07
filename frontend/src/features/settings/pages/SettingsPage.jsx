import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clinicalService } from "../../../services/api/clinicalService";
import { logRecordExported } from "../../../services/api/auditService";
import { selectTheme, setTheme } from "../../../store/slices/themeSlice";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import StatusBadge from "../../../components/ui/Badge";
import { notifySuccess, notifyError } from "../../../common/utils/toast";
import {
  User,
  Shield,
  Bell,
  Cpu,
  Database,
  FileText,
  Palette,
} from "lucide-react";

const settingsNavItems = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Database },
  { id: "data-management", label: "Data Management", icon: FileText },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "ai-preferences", label: "AI Preferences", icon: Cpu },
];

function SettingsNavItem({ item, isActive, onClick }) {
  return (
    <button
      onClick={() => onClick(item.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-4 text-xs font-semibold transition-colors ${
        isActive
          ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white"
          : "text-neutral-800 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      }`}
    >
      <item.icon className="w-4 h-4" />
      {item.label}
    </button>
  );
}

function ProfileSettings() {
  const { user } = useSelector(state => state.auth);
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-500 dark:border-neutral-700 pb-4">
        Profile Settings
      </h3>

      {/* Avatar Upload */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-12 bg-info-100 dark:bg-info-900/30 border-2 border-primary-500 flex items-center justify-center text-2xl font-bold text-primary-600 dark:text-primary-400">
            {user?.fullName ? user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : "US"}
          </div>
          <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center shadow-md">
            <Palette className="w-3 h-3 text-white" />
          </button>
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-300">Upload Photo</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-500">JPG, PNG. Max 2MB</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input label="Full Name & Title" value={user?.fullName || "Unknown User"} readOnly />
        </div>
        <div>
          <Input label="NMC/ABDM ID" value={user?.registrationNumber || user?.hprId || user?.employeeId || "N/A"} readOnly />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-300 mb-1.5">
            Hospital / Facility
          </label>
          <select className="w-full py-2 px-3 bg-white dark:bg-neutral-800 border border-neutral-500 dark:border-neutral-700 rounded-4 text-sm text-neutral-900 dark:text-neutral-200" value={user?.facility || ""} disabled>
            <option value="Hexa MedPlus Central">Hexa MedPlus Central</option>
            <option value="City General Hospital">City General Hospital</option>
            <option value="Metro Health Clinic">Metro Health Clinic</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-300 mb-1.5">
            Department
          </label>
          <select className="w-full py-2 px-3 bg-white dark:bg-neutral-800 border border-neutral-500 dark:border-neutral-700 rounded-4 text-sm text-neutral-900 dark:text-neutral-200" value={user?.department || ""} disabled>
            <option value="Oncology">Oncology</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Endocrinology">Endocrinology</option>
            <option value="Neurology">Neurology</option>
          </select>
        </div>
      </div>

      {/* Bio */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-300 mb-1.5">
            Clinical Bio / Notes
          </label>
          <textarea
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-500 dark:border-neutral-700 rounded-4 text-sm p-3 text-neutral-900 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={3}
            defaultValue={user?.bio || ""}
            readOnly
          ></textarea>
        </div>

      {/* Save Button - profile fields above are read-only (managed by hospital admin), so
          there is nothing for these actions to persist yet. Left decorative pending a
          product decision on self-service profile editing + a backend endpoint. */}
      <div className="border-t border-neutral-500 dark:border-neutral-700 pt-6 flex justify-end gap-4">
        <Button variant="secondary">Cancel</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}



function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-500 dark:border-neutral-700 pb-4">
        Notifications
      </h3>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-neutral-500 dark:border-neutral-700 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-300">
              Push notifications when AI processing completes
            </label>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-neutral-500 dark:border-neutral-700 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-300">
              Email digest of daily activities
            </label>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-neutral-500 dark:border-neutral-700 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-300">
              Alert on clinical alerts
            </label>
          </label>
        </div>
      </div>

      {/* Save Preferences has no backend endpoint to persist notification settings to yet -
          left decorative pending a product decision. */}
      <div className="border-t border-neutral-500 dark:border-neutral-700 pt-6 flex justify-end">
        <Button>Save Preferences</Button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-500 dark:border-neutral-700 pb-4">
        Security
      </h3>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-neutral-500 dark:border-neutral-700 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-300">
              Two-factor authentication
            </label>
          </label>
          <p className="text-xs text-neutral-600 dark:text-neutral-500 ml-6">
            Add an extra layer of security
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-neutral-500 dark:border-neutral-700 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-300">
              Session timeout: 30 minutes
            </label>
          </label>
          <p className="text-xs text-neutral-600 dark:text-neutral-500 ml-6">
            Auto-logout after inactivity
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-neutral-500 dark:border-neutral-700 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-300">
              IP Whitelisting for API access
            </label>
          </label>
          <p className="text-xs text-neutral-600 dark:text-neutral-500 ml-6">
            Restrict API access to approved IPs only
          </p>
        </div>
      </div>

      {/* Update Security has no backend endpoint to persist these toggles to yet -
          left decorative pending a product decision. */}
      <div className="border-t border-neutral-500 dark:border-neutral-700 pt-6 flex justify-end">
        <Button>Update Security</Button>
      </div>
    </div>
  );
}

function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-500 dark:border-neutral-700 pb-4">
        Integrations
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-neutral-300 dark:border-neutral-700 rounded-8 bg-neutral-50 dark:bg-neutral-800/50">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">EHR System (Epic)</h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Connected to main hospital database</p>
            <StatusBadge status="success" label="Connected" className="mt-1.5" />
          </div>
          {/* Configure requires an unspecified admin flow for the Epic integration -
              left decorative pending a product decision. */}
          <Button variant="secondary" size="sm">Configure</Button>
        </div>
        <div className="flex items-center justify-between p-4 border border-neutral-300 dark:border-neutral-700 rounded-8 bg-white dark:bg-neutral-900">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">PACS / Imaging</h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Not connected</p>
            <StatusBadge status="neutral" label="Not Connected" className="mt-1.5" />
          </div>
          {/* Connect requires a third-party PACS integration flow that does not exist yet -
              left decorative pending a product decision. */}
          <Button size="sm">Connect</Button>
        </div>
        <div className="flex items-center justify-between p-4 border border-neutral-300 dark:border-neutral-700 rounded-8 bg-white dark:bg-neutral-900">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Lab Information System (LIS)</h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Not connected</p>
            <StatusBadge status="neutral" label="Not Connected" className="mt-1.5" />
          </div>
          {/* Connect requires a third-party LIS integration flow that does not exist yet -
              left decorative pending a product decision. */}
          <Button size="sm">Connect</Button>
        </div>
      </div>
    </div>
  );
}

function DataManagementSettings() {
  const [exporting, setExporting] = useState(false);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const patients = await clinicalService.getPatients();
      const headers = ["MRN", "Name", "Age", "Gender", "Department", "Status", "Last Visit"];
      const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const rows = (patients || []).map((p) => [
        p.mrn,
        `${p.firstName || ""} ${p.lastName || ""}`.trim(),
        p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : "",
        p.gender || "",
        p.department || "",
        p.status || "",
        p.admissionDate ? p.admissionDate.split("T")[0] : "",
      ].map(escapeCsv).join(","));
      const csv = [headers.map(escapeCsv).join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `patient-records-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      logRecordExported("Patient Records CSV", rows.length);
      notifySuccess(`Exported ${rows.length} patient record${rows.length === 1 ? "" : "s"} to CSV.`);
    } catch (error) {
      console.error("Failed to export patient data:", error);
      notifyError("Failed to export patient data.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-500 dark:border-neutral-700 pb-4">
        Data Management
      </h3>
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">Export Patient Data</h4>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">Download a CSV of all patient records</p>
          <Button variant="secondary" icon={FileText} onClick={handleExportCsv} disabled={exporting}>
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">Data Retention Policy</h4>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">Configure how long patient data is stored</p>
          {/* No backend endpoint exists yet to persist a retention policy - left decorative
              pending a product decision on compliance requirements. */}
          <select className="w-full max-w-xs py-2 px-3 bg-white dark:bg-neutral-800 border border-neutral-500 dark:border-neutral-700 rounded-4 text-sm text-neutral-900 dark:text-neutral-200">
            <option>7 Years (Compliance)</option>
            <option>10 Years</option>
            <option>Indefinitely</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-500 dark:border-neutral-700 pb-4">
        Appearance
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-300 mb-3">
            Theme Preference
          </label>
          <div className="flex gap-4">
            <label className={`border rounded-6 p-4 cursor-pointer flex flex-col items-center gap-2 ${theme === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400' : 'border-neutral-300 dark:border-neutral-700'}`}>
              <input type="radio" name="theme" value="light" className="hidden" onChange={() => dispatch(setTheme('light'))} checked={theme === 'light'} />
              <div className="w-16 h-12 bg-white border border-neutral-200 rounded-4 shadow-sm"></div>
              <span className="text-xs font-medium dark:text-neutral-200">Light</span>
            </label>
            <label className={`border rounded-6 p-4 cursor-pointer flex flex-col items-center gap-2 ${theme === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400' : 'border-neutral-300 dark:border-neutral-700'}`}>
              <input type="radio" name="theme" value="dark" className="hidden" onChange={() => dispatch(setTheme('dark'))} checked={theme === 'dark'} />
              <div className="w-16 h-12 bg-neutral-900 border border-neutral-700 rounded-4 shadow-sm"></div>
              <span className="text-xs font-medium dark:text-neutral-200">Dark</span>
            </label>
            <label className={`border rounded-6 p-4 cursor-pointer flex flex-col items-center gap-2 ${theme === 'system' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400' : 'border-neutral-300 dark:border-neutral-700'}`}>
              <input type="radio" name="theme" value="system" className="hidden" onChange={() => dispatch(setTheme('system'))} checked={theme === 'system'} />
              <div className="w-16 h-12 border border-neutral-300 rounded-4 shadow-sm overflow-hidden flex">
                <div className="w-1/2 h-full bg-white"></div>
                <div className="w-1/2 h-full bg-neutral-900"></div>
              </div>
              <span className="text-xs font-medium dark:text-neutral-200">System</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiPreferencesSettings() {
  const [llmModel, setLlmModel] = useState("aws_nova_pro");
  const [visionModel, setVisionModel] = useState("aws_nova_pro");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPreference = async () => {
      try {
        const data = await clinicalService.getAiPreferences();
        setLlmModel(data.llm_model || data.model || "aws_nova_pro");
        setVisionModel(data.vision_model || "aws_nova_pro");
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPreference();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await clinicalService.updateAiPreferences({
        llm_model: llmModel,
        vision_model: visionModel,
      });
      notifySuccess("AI Model Preferences saved successfully!");
    } catch (e) {
      notifyError("Failed to update AI preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-neutral-600 dark:text-neutral-400">Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-700 pb-3">
          AI Model Preferences
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Configure preferred AI models for Clinical Reasoning (LLM) and Document/Imaging OCR (Vision AI).
        </p>
      </div>

      {/* 1. Clinical Reasoning LLM Model */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
          Clinical Reasoning & SOAP LLM Model
        </label>
        <div className="grid grid-cols-1 gap-2">
          {[
            { id: "aws_nova_pro", label: "Amazon Nova Pro (AWS Bedrock) (Default)", desc: "apac.amazon.nova-pro-v1:0 — Multimodal Flagship ($0.80/1M tokens)" },
            { id: "aws_nova", label: "Amazon Nova Lite (AWS Bedrock)", desc: "apac.amazon.nova-lite-v1:0 — Fast low-cost multimodal LLM ($0.06/1M tokens)" },
            { id: "nvidia", label: "Meta LLaMA 3.1 8B", desc: "Meta LLaMA 3.1 8B Instruct via NVIDIA NIM" },
            { id: "qwen", label: "Qwen 2.5 14B (Custom via Ngrok)", desc: "Local Qwen 2.5 14B model endpoint" },
          ].map((opt) => (
            <label
              key={opt.id}
              className={`flex items-start gap-3 p-3.5 border rounded-8 cursor-pointer transition-all ${
                llmModel === opt.id
                  ? "border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 ring-1 ring-primary-500"
                  : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              <input
                type="radio"
                name="llmModel"
                value={opt.id}
                checked={llmModel === opt.id}
                onChange={(e) => setLlmModel(e.target.value)}
                className="w-4 h-4 mt-0.5 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{opt.label}</span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 2. Vision AI & OCR Model */}
      <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <label className="block text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
          Vision AI & Document OCR Model
        </label>
        <div className="grid grid-cols-1 gap-2">
          {[
            { id: "aws_nova_pro", label: "Amazon Nova Pro (AWS Bedrock) (Default)", desc: "apac.amazon.nova-pro-v1:0 — Flagship multimodal document & imaging analysis" },
            { id: "aws_nova", label: "Amazon Nova Lite (AWS Bedrock)", desc: "apac.amazon.nova-lite-v1:0 — Ultra low-cost OCR & imaging ($0.06/1M tokens)" },
            { id: "nvidia", label: "Meta LLaMA 3.2 90B Vision", desc: "Llama 3.2 90B Vision Instruct via NVIDIA NIM" },
          ].map((opt) => (
            <label
              key={opt.id}
              className={`flex items-start gap-3 p-3.5 border rounded-8 cursor-pointer transition-all ${
                visionModel === opt.id
                  ? "border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 ring-1 ring-primary-500"
                  : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              <input
                type="radio"
                name="visionModel"
                value={opt.id}
                checked={visionModel === opt.id}
                onChange={(e) => setVisionModel(e.target.value)}
                className="w-4 h-4 mt-0.5 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{opt.label}</span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");

  const sections = {
    profile: <ProfileSettings />,
    notifications: <NotificationsSettings />,
    security: <SecuritySettings />,
    integrations: <IntegrationsSettings />,
    "data-management": <DataManagementSettings />,
    appearance: <AppearanceSettings />,
    "ai-preferences": <AiPreferencesSettings />,
  };

  return (
    <div className="flex h-[calc(100vh-64px)] animate-fade-in">
      {/* Settings Sidebar */}
      <div className="w-[240px] border-r border-neutral-500 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
        <nav className="space-y-1">
          {settingsNavItems.map((item) => (
            <SettingsNavItem
              key={item.id}
              item={item}
              isActive={activeSection === item.id}
              onClick={() => setActiveSection(item.id)}
            />
          ))}
        </nav>
      </div>

      {/* Settings Detail */}
      <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-500 dark:border-neutral-800 rounded-8 shadow-card p-8 overflow-y-auto">
        {sections[activeSection]}
      </div>
    </div>
  );
}
