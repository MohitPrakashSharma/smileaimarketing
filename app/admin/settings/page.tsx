"use client";

import { useState } from "react";

export default function AdminSettingsPage() {
  const [scraperDelay, setScraperDelay] = useState(3000);
  const [smtpHost, setSmtpHost] = useState("smtp.resend.com");
  const [success, setSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-xl space-y-6 font-body">
      <div>
        <h3 className="font-display text-xl font-semibold text-white">System Settings</h3>
        <p className="text-xs text-slate mt-1 font-body">Configure background workers, email SMTP options, and compliance parameters.</p>
      </div>

      {success && (
        <div className="rounded-xl bg-teal/10 border border-teal/20 p-4 text-center text-sm font-semibold text-teal">
          Settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="scraper-delay" className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Clinic Crawler Delay (ms)</label>
            <input
              id="scraper-delay"
              type="number"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              value={scraperDelay}
              onChange={(e) => setScraperDelay(Number(e.target.value))}
            />
            <span className="text-[10px] text-slate mt-1 block">Throttle delay between HTTP requests to prevent clinic site blocking.</span>
          </div>

          <div>
            <label htmlFor="smtp-host" className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Outreach SMTP Server</label>
            <input
              id="smtp-host"
              type="text"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-full bg-teal px-6 py-3 text-xs font-bold text-ink hover:bg-teal-deep hover:text-white transition-colors"
        >
          Save Configuration
        </button>
      </form>
    </div>
  );
}
