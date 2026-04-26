"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteEventButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Slett denne hendelsen?")) return;
    setLoading(true);
    await fetch(`/api/maintenance/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
    >
      {loading ? "…" : "Slett"}
    </button>
  );
}
