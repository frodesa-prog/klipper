"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  BLADE_CHANGE: "Knivbladbytte",
  SERVICE: "Service",
  CLEANING: "Rengjøring",
  OTHER: "Annet",
};

export default function AddMaintenanceForm({ mowerId }: { mowerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("BLADE_CHANGE");
  const [notes, setNotes] = useState("");
  const [performedAt, setPerformedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mowerId,
        type,
        notes: notes || undefined,
        performedAt: new Date(performedAt).toISOString(),
      }),
    });
    setSaving(false);
    setOpen(false);
    setNotes("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-100 transition-colors"
      >
        + Legg til hendelse
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-4"
    >
      <h3 className="font-semibold text-gray-100">Ny vedlikehendelse</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100"
          >
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Utført</label>
          <input
            type="datetime-local"
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Notater (valgfritt)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {saving ? "Lagrer…" : "Lagre"}
        </button>
      </div>
    </form>
  );
}
