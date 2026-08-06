import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import StatusBadge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { CreditCard, CheckCircle2, Clock, Search, ChevronRight, Calendar, DollarSign, Loader2 } from 'lucide-react';
import Input from '../../../components/ui/Input';
import apiClient from '../../../services/api/apiClient';
import { useSelector } from 'react-redux';
import { selectAllPatients, fetchPatients, selectPatientStatus } from '../../../store/slices/patientSlice';
import { useDispatch } from 'react-redux';
import { useAllEncounters } from '../../../common/hooks/useEncounters';
import { toast } from 'react-toastify';

const STATUS_CONFIG = {
  BILLING_READY: { label: 'Ready to Bill', status: 'warning' },
  BILLED: { label: 'Billed & Archived', status: 'success' },
};

export default function BillingPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Use the same hooks that work correctly in PatientManagementPage
  const allPatients = useSelector(selectAllPatients);
  const patientStatus = useSelector(selectPatientStatus);
  const { encounters: allEncounters, loading } = useAllEncounters();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('BILLING_READY');
  const [processing, setProcessing] = useState(null);
  // Encounter ids marked billed in this session — lets the list update
  // immediately without a disruptive full-page reload.
  const [billedOverrides, setBilledOverrides] = useState(() => new Set());

  useEffect(() => {
    if (patientStatus === 'idle') dispatch(fetchPatients());
  }, [patientStatus, dispatch]);

  // Build patient lookup map
  const patients = useMemo(() => {
    const map = {};
    allPatients.forEach(p => { map[String(p.id)] = p; });
    return map;
  }, [allPatients]);

  // Filter only billing-relevant encounters
  const encounters = useMemo(() =>
    allEncounters
      .filter(e => e.status === 'BILLING_READY' || e.status === 'BILLED')
      .map(e => billedOverrides.has(e.id) ? { ...e, status: 'BILLED' } : e),
    [allEncounters, billedOverrides]
  );

  const handleMarkBilled = async (encounter) => {
    setProcessing(encounter.id);
    try {
      await apiClient.put(`/encounters/${encounter.id}/status`, { status: 'BILLED' });
      // Reflect the change locally instead of a full page reload so the
      // toast is actually visible and search/filter state isn't lost.
      setBilledOverrides(prev => new Set(prev).add(encounter.id));
      toast.success('Encounter marked as billed and archived!');
    } catch (err) {
      toast.error('Failed to update billing status');
    } finally {
      setProcessing(null);
    }
  };

  const filtered = useMemo(() => {
    return encounters.filter(e => {
      const patient = patients[String(e.patientId)];
      const name = patient?.name || '';
      const mrn = patient?.mrn || '';
      const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          mrn.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilter = filter === 'ALL' || e.status === filter;
      return matchSearch && matchFilter;
    });
  }, [encounters, patients, searchTerm, filter]);

  const readyCount = encounters.filter(e => e.status === 'BILLING_READY').length;
  const billedCount = encounters.filter(e => e.status === 'BILLED').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Billing Management
          </h1>
          <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
            Review encounters ready for billing and track completed claims
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ready to Bill', value: readyCount, icon: Clock, color: 'text-warning-500' },
          { label: 'Billed & Archived', value: billedCount, icon: CheckCircle2, color: 'text-success-500' },
          { label: 'Total Claims', value: encounters.length, icon: DollarSign, color: 'text-primary-500' },
        ].map(s => (
          <Card key={s.label} padding="md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-800 dark:text-slate-400">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card padding="md" className="flex items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search patient name or MRN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={Search}
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'BILLING_READY', label: 'Ready to Bill' },
            { key: 'BILLED', label: 'Billed' },
            { key: 'ALL', label: 'All' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-6 text-xs font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Encounter List */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No encounters found"
            description="No encounters found for the selected filter."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800/50">
                {['Patient', 'MRN', 'Encounter Date', 'Department', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-neutral-600 dark:text-slate-400 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((enc, idx) => {
                const patient = patients[String(enc.patientId)];
                const cfg = STATUS_CONFIG[enc.status];
                const isBilling = processing === enc.id;

                return (
                  <tr
                    key={enc.id}
                    className={`border-b border-neutral-100 dark:border-slate-700/50 hover:bg-primary-50/30 dark:hover:bg-slate-800 transition-colors ${
                      idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-neutral-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    {/* Patient */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold flex-shrink-0">
                          {patient?.name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <span className="text-sm font-medium text-neutral-900 dark:text-slate-200">
                          {patient?.name || 'Unknown'}
                        </span>
                      </div>
                    </td>

                    {/* MRN */}
                    <td className="px-4 py-3 text-xs font-mono text-neutral-500 dark:text-slate-400">
                      {patient?.mrn || '—'}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {enc.encounterDate?.split('T')[0] || '—'}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-slate-300">
                      {patient?.department || '—'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {cfg && <StatusBadge status={cfg.status} label={cfg.label} />}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={ChevronRight}
                          onClick={() => navigate(`/encounters/${enc.patientId}`)}
                        >
                          View
                        </Button>
                        {enc.status === 'BILLING_READY' && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkBilled(enc)}
                            disabled={isBilling}
                            className={isBilling ? 'opacity-70' : ''}
                          >
                            {isBilling ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" /> Billing Done
                              </>
                            )}
                          </Button>
                        )}
                        {enc.status === 'BILLED' && (
                          <span className="text-xs text-success-600 dark:text-success-500 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Archived
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
