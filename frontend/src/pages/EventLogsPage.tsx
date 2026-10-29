import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  CheckCheck,
  Download,
  CheckCircle2
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { EventLog } from '../types';
import { fetchEvents, ackEvent, ackAllEvents, EXPORT_URLS } from '../services/api';

export const EventLogsPage: React.FC = () => {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const filterSev = severityFilter === 'ALL' ? undefined : severityFilter;
      const data = await fetchEvents(150, filterSev);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [severityFilter]);

  const handleAck = async (id: number) => {
    try {
      await ackEvent(id);
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, acknowledged: true } : e))
      );
    } catch (err) {
      console.error('Ack error:', err);
    }
  };

  const handleAckAll = async () => {
    try {
      await ackAllEvents();
      setEvents((prev) => prev.map((e) => ({ ...e, acknowledged: true })));
    } catch (err) {
      console.error('Ack all error:', err);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.description.toLowerCase().includes(q) ||
      e.action_taken.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-sans font-extrabold text-slate-900 uppercase tracking-wider">
              Safety & Anomaly Event Log
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Persistent event ledger recorded to SQLite with operator acknowledgement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAckAll}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-sans font-semibold transition-all"
          >
            <CheckCheck className="w-4 h-4 text-blue-600" />
            Acknowledge All
          </button>
          <a
            href={EXPORT_URLS.eventsCsv}
            download="twincore_events.csv"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs font-sans transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-card flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        {/* Severity Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {['ALL', 'CRITICAL', 'WARNING', 'NORMAL', 'OFFLINE'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${
                severityFilter === sev
                  ? 'bg-white text-blue-700 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search description, action, source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-sans font-bold">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Action Taken</th>
                <th className="py-3 px-4 text-right">Acknowledgement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((ev) => (
                  <tr
                    key={ev.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      !ev.acknowledged && ev.severity === 'CRITICAL'
                        ? 'bg-rose-50/40'
                        : !ev.acknowledged && ev.severity === 'WARNING'
                        ? 'bg-amber-50/40'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-400 font-bold">#{ev.id}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={ev.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{ev.category}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{ev.source}</td>
                    <td className="py-3 px-4 text-slate-900 font-sans max-w-xs truncate font-medium">
                      {ev.description}
                    </td>
                    <td className="py-3 px-4 text-blue-700 font-mono font-semibold">{ev.action_taken}</td>
                    <td className="py-3 px-4 text-right">
                      {ev.acknowledged ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Acked
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAck(ev.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-sans font-semibold transition"
                        >
                          Ack
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    {loading ? 'Loading events...' : 'No events matching selected filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
