export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 pb-16">
      <div className="mb-8">
        <div className="h-9 w-32 rounded-md bg-slate-100 animate-pulse" />
        <div className="mt-2 h-4 w-24 rounded bg-slate-100 animate-pulse" />
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 list-none p-0 m-0">
        {['a', 'b', 'c', 'd', 'e', 'f'].map((k) => (
          <li key={k}>
            <div className="rounded-lg border p-5 h-44 flex flex-col gap-3">
              <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
              <div className="h-5 w-3/4 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-slate-100 animate-pulse" />
              <div className="flex gap-2 mt-auto">
                <div className="h-5 w-12 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-slate-100 animate-pulse" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
