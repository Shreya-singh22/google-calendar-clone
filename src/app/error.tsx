'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[App Error]', error); }, [error]);

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-[#202124]">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Something went wrong</h2>
      <pre className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 max-w-2xl overflow-auto whitespace-pre-wrap">
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
