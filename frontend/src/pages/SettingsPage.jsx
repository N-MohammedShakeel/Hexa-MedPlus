import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clinicalService } from "../services/api/clinicalService";
import { selectTheme, setTheme } from "../store/slices/themeSlice";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import StatusBadge from "../components/ui/Badge";
import {
  User,
  Shield,
  Bell,
  Cpu,
  Database,
  Key,
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
          ? "bg-neutral-200 text-neutral-900"
          : "text-neutral-800 hover:bg-neutral-50"
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
      <h3 className="text-xl font-semibold text-neutral-900 border-b border-neutral-500 pb-4">
        Profile Settings
      </h3>

      {/* Avatar Upload */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-12 bg-info-100 border-2 border-primary-500 flex items-center justify-center text-2xl font-bold text-primary-600">
            {user?.fullName ? user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : "US"}
          </div>
          <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-600 rounded-12 flex items-center justify-center shadow-md">
            <Palette className="w-3 h-3 text-white" />
          </button>
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-800">Upload Photo</p>
          <p className="text-xs text-neutral-600">JPG, PNG. Max 2MB</p>
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
          <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
            Hospital / Facility
          </label>
          <select className="w-full py-2 px-3 bg-white border border-neutral-500 rounded-4 text-sm text-neutral-900" value={user?.facility || ""} disabled>
            <option value="Hexa MedPlus Central">Hexa MedPlus Central</option>
            <option value="City General Hospital">City General Hospital</option>
            <option value="Metro Health Clinic">Metro Health Clinic</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
            Department
          </label>
          <select className="w-full py-2 px-3 bg-white border border-neutral-500 rounded-4 text-sm text-neutral-900" value={user?.department || ""} disabled>
            <option value="Oncology">Oncology</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Endocrinology">Endocrinology</option>
            <option value="Neurology">Neurology</option>
          </select>
        </div>
      </div>

      {/* Bio */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
            Clinical Bio / Notes
          </label>
          <textarea
            className="w-full bg-white border border-neutral-500 rounded-4 text-sm p-3 focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={3}
            defaultValue={user?.bio || ""}
            readOnly
          ></textarea>
        </div>

      {/* Save Button */}
      <div className="border-t border-neutral-500 pt-6 flex justify-end gap-4">
        <Button variant="secondary">Cancel</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}



function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 border-b border-neutral-500 pb-4">
        Notifications
      </h3>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-neutral-500 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800">
              Push notifications when AI processing completes
            </label>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-neutral-500 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800">
              Email digest of daily activities
            </label>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-neutral-500 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800">
              Alert on clinical alerts
            </label>
          </label>
        </div>
      </div>

      <div className="border-t border-neutral-500 pt-6 flex justify-end">
        <Button>Save Preferences</Button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 border-b border-neutral-500 pb-4">
        Security
      </h3>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-neutral-500 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800">
              Two-factor authentication
            </label>
          </label>
          <p className="text-xs text-neutral-600 ml-6">
            Add an extra layer of security
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-neutral-500 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800">
              Session timeout: 30 minutes
            </label>
          </label>
          <p className="text-xs text-neutral-600 ml-6">
            Auto-logout after inactivity
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-neutral-500 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-xs font-semibold text-neutral-800">
              IP Whitelisting for API access
            </label>
          </label>
          <p className="text-xs text-neutral-600 ml-6">
            Restrict API access to approved IPs only
          </p>
        </div>
      </div>

      <div className="border-t border-neutral-500 pt-6 flex justify-end">
        <Button>Update Security</Button>
      </div>
    </div>
  );
}

function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 border-b border-neutral-500 pb-4">
        Integrations
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-neutral-300 rounded-lg bg-neutral-50">
          <div>
            <h4 className="text-sm font-bold text-neutral-900">EHR System (Epic)</h4>
            <p className="text-xs text-neutral-600">Connected to main hospital database</p>
          </div>
          <Button variant="secondary" size="sm">Configure</Button>
        </div>
        <div className="flex items-center justify-between p-4 border border-neutral-300 rounded-lg bg-white">
          <div>
            <h4 className="text-sm font-bold text-neutral-900">PACS / Imaging</h4>
            <p className="text-xs text-neutral-600">Not connected</p>
          </div>
          <Button size="sm">Connect</Button>
        </div>
        <div className="flex items-center justify-between p-4 border border-neutral-300 rounded-lg bg-white">
          <div>
            <h4 className="text-sm font-bold text-neutral-900">Lab Information System (LIS)</h4>
            <p className="text-xs text-neutral-600">Not connected</p>
          </div>
          <Button size="sm">Connect</Button>
        </div>
      </div>
    </div>
  );
}

function DataManagementSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 border-b border-neutral-500 pb-4">
        Data Management
      </h3>
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900 mb-1">Export Patient Data</h4>
          <p className="text-xs text-neutral-600 mb-3">Download a CSV of all patient records</p>
          <Button variant="secondary" icon={FileText}>Export CSV</Button>
        </div>
        <div className="pt-4 border-t border-neutral-200">
          <h4 className="text-sm font-bold text-neutral-900 mb-1">Data Retention Policy</h4>
          <p className="text-xs text-neutral-600 mb-3">Configure how long patient data is stored</p>
          <select className="w-full max-w-xs py-2 px-3 bg-white border border-neutral-500 rounded-4 text-sm text-neutral-900">
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
      <h3 className="text-xl font-semibold text-neutral-900 border-b border-neutral-500 pb-4 dark:text-white dark:border-neutral-700">
        Appearance
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-3 dark:text-neutral-300">
            Theme Preference
          </label>
          <div className="flex gap-4">
            <label className={`border rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 ${theme === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400' : 'border-neutral-300 dark:border-neutral-700'}`}>
              <input type="radio" name="theme" value="light" className="hidden" onChange={() => dispatch(setTheme('light'))} checked={theme === 'light'} />
              <div className="w-16 h-12 bg-white border border-neutral-200 rounded shadow-sm"></div>
              <span className="text-xs font-medium dark:text-neutral-200">Light</span>
            </label>
            <label className={`border rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 ${theme === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400' : 'border-neutral-300 dark:border-neutral-700'}`}>
              <input type="radio" name="theme" value="dark" className="hidden" onChange={() => dispatch(setTheme('dark'))} checked={theme === 'dark'} />
              <div className="w-16 h-12 bg-neutral-900 border border-neutral-700 rounded shadow-sm"></div>
              <span className="text-xs font-medium dark:text-neutral-200">Dark</span>
            </label>
            <label className={`border rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 ${theme === 'system' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400' : 'border-neutral-300 dark:border-neutral-700'}`}>
              <input type="radio" name="theme" value="system" className="hidden" onChange={() => dispatch(setTheme('system'))} checked={theme === 'system'} />
              <div className="w-16 h-12 bg-gradient-to-r from-white to-neutral-900 border border-neutral-300 rounded shadow-sm"></div>
              <span className="text-xs font-medium dark:text-neutral-200">System</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiPreferencesSettings() {
  const [model, setModel] = useState("auto");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPreference = async () => {
      try {
        const data = await clinicalService.getAiPreferences();
        setModel(data.model);
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
      await clinicalService.updateAiPreferences(model);
      alert("AI Preference updated successfully!");
    } catch (e) {
      alert("Failed to update AI preference.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900 border-b border-neutral-500 pb-4 dark:text-white dark:border-neutral-700">
        AI Preferences
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-3 dark:text-neutral-300">
            Preferred LLM Model
          </label>
          <div className="space-y-2">
            {[
              { id: "auto", label: "Auto / Fallback Mode (Default)" },
              { id: "qwen", label: "Qwen 2.5 (Custom via Ngrok)" },
              { id: "nvidia", label: "NVIDIA Llama 3.1" },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 p-3 border border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800">
                <input
                  type="radio"
                  name="aimodel"
                  value={opt.id}
                  checked={model === opt.id}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-200">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-500 pt-6 flex justify-end">
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
      <div className="w-[240px] border-r border-neutral-500 bg-white p-6">
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
      <div className="flex-1 bg-white border border-neutral-500 rounded-4 shadow-card p-8 overflow-y-auto">
        {sections[activeSection]}
      </div>
    </div>
  );
}
