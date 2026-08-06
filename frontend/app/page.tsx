"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:5201";

type Label = { id: number; name: string; sortOrder: number; isActive: boolean };

export default function Home() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/labels`)
      .then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      })
      .then(setLabels)
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return <p className="p-4 text-red-600">Bağlantı Sorunu: {error}</p>;

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <h1 className="mb-4 text-2xl font-bold">Satış</h1>

      {/* grid-cols-2 = iki sütun; annenin parmağı için büyük hedefler */}
      <div className="grid grid-cols-2 gap-3">
        {labels.map((l) => (
          <button
            key={l.id} // React'in listedeki elemanları ayırt etme kimliği
            className="rounded-2xl bg-white p-6 text-2xl font-bold shadow active:bg-blue-100"
          >
            {l.name}
          </button>
        ))}
      </div>
    </main>
  );
}
