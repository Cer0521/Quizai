export default function AdsComponent() {
  return (
    <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-amber-700 font-semibold">Sponsored</p>
      <h4 className="text-sm font-bold text-amber-900 mt-1">Boost your classes with QuizCraft Pro</h4>
      <p className="text-xs text-amber-800 mt-1">Unlock unlimited quizzes, analytics, and blueprint-based generation.</p>
      <a href="/pricing" className="inline-block mt-3 text-xs font-semibold text-amber-900 underline">Upgrade now</a>
    </div>
  )
}
