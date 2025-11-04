// app/page.tsx
"use client";

import { useState } from "react";

export default function Home() {
  const [likes, setLikes] = useState(0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">📸 Territory Snap</h1>
      <p className="mb-4 text-gray-700">現実の写真で、街を染めよう。</p>
      <button
        onClick={() => setLikes(likes + 1)}
        className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
      >
        ❤️ Like ({likes})
      </button>
    </main>
  );
}
