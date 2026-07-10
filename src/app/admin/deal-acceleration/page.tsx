"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface LoomEngagementEvent {
  id: string;
  client_key: string;
  prospect_id: string;
  timestamp: string;
  user_agent?: string;
  referrer?: string;
}

interface ClientData {
  id: string;
  company_name: string;
  contact_email: string;
  contact_name: string;
}

export default function DealAccelerationTracker() {
  const [loomEvents, setLoomEvents] = useState<LoomEngagementEvent[]>([]);
  const [clientsData, setClientsData] = useState<Map<string, ClientData>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  useEffect(() => {
    fetchLoomEvents();
  }, [timeRange]);

  async function fetchLoomEvents() {
    setLoading(true);

    try {
      // Calculate date range
      const now = new Date();
      let since = new Date();
      if (timeRange === "24h") since.setHours(now.getHours() - 24);
      else if (timeRange === "7d") since.setDate(now.getDate() - 7);
      else since.setDate(now.getDate() - 30);

      // loom_view_events has no anon/authenticated RLS read policy — fetch
      // via the service-role admin endpoint instead of the browser client.
      const res = await fetch(
        `/api/admin/loom-events?since=${encodeURIComponent(since.toISOString())}`
      );
      if (!res.ok) {
        console.error("Error fetching Loom events:", await res.text());
        return;
      }

      const { events, clients } = await res.json();
      setLoomEvents(events || []);

      const clientMap = new Map();
      (clients || []).forEach((client: ClientData) => {
        clientMap.set(client.id, client);
      });
      setClientsData(clientMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  const getClientInfo = (prospectId: string) => {
    return (
      clientsData.get(prospectId) || {
        company_name: "Unknown",
        contact_email: "N/A",
      }
    );
  };

  const totalOpens = loomEvents.length;
  const uniqueProspects = new Set(loomEvents.map((e) => e.prospect_id)).size;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0A0908] mb-2">
          Deal Acceleration Tracker
        </h1>
        <p className="text-[#B0A89E]">
          Real-time monitoring of prospect Loom engagement
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6">
        {(["24h", "7d", "30d"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg transition-all ${
              timeRange === range
                ? "bg-[#D4A853] text-[#0A0908] font-semibold"
                : "bg-[#F5F0EB] text-[#0A0908] hover:bg-[#E8E0D5]"
            }`}
          >
            {range === "24h" ? "Last 24h" : range === "7d" ? "Last 7 days" : "Last 30 days"}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#D4A853] to-[#B0A89E] p-6 rounded-lg"
        >
          <p className="text-sm text-[#0A0908] opacity-80">Total Loom Opens</p>
          <p className="text-3xl font-bold text-[#0A0908]">{totalOpens}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-[#B0A89E] to-[#E8E0D5] p-6 rounded-lg"
        >
          <p className="text-sm text-[#0A0908] opacity-80">Unique Prospects</p>
          <p className="text-3xl font-bold text-[#0A0908]">{uniqueProspects}</p>
        </motion.div>
      </div>

      {/* Events Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg overflow-hidden border border-[#E8E0D5]"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F5F0EB] border-b border-[#E8E0D5]">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-[#0A0908]">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-[#0A0908]">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-[#0A0908]">
                  Loom Opened
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-[#0A0908]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-[#B0A89E]">
                    Loading...
                  </td>
                </tr>
              ) : loomEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-[#B0A89E]">
                    No Loom views in this time period
                  </td>
                </tr>
              ) : (
                loomEvents.map((event, index) => {
                  const client = getClientInfo(event.prospect_id);
                  const timeAgo = getTimeAgo(new Date(event.timestamp));

                  return (
                    <motion.tr
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-[#E8E0D5] hover:bg-[#F5F0EB] transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-[#0A0908] font-medium">
                        {client.company_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#B0A89E]">
                        {client.contact_email}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#B0A89E]">
                        {timeAgo}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#D4A853] text-[#0A0908]">
                          🎬 Engaged
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Action Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-[#0A0908] to-[#1a1816] p-6 rounded-lg border border-[#D4A853]"
      >
        <h3 className="text-lg font-bold text-[#D4A853] mb-2">Next Steps</h3>
        <ul className="text-[#F5F0EB] space-y-2 text-sm">
          <li>✓ Prospect has viewed their diagnostic Loom</li>
          <li>✓ Ernesto received pre-discovery value mapping alert</li>
          <li>✓ Prepare follow-up with personalized talking points</li>
          <li>✓ Check Command Center for inferred bottlenecks</li>
        </ul>
      </motion.div>
    </div>
  );
}

/**
 * Format time ago (e.g., "2 hours ago")
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return "Just now";
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo}d ago`;
}
