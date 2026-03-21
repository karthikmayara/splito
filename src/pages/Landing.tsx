import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, XCircle, AlertCircle, Smartphone, Shield, ChevronRight, Github } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-green-500/30 overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl drop-shadow-md">💸</span>
            <span className="font-bold tracking-tight text-white text-xl">Splito</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-full transition-colors"
          >
            Login / Open App
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-500/15 via-[#0f172a] to-[#0f172a] -z-10"></div>
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Now with UPI Integration
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-100 leading-[1.1]">
            Split bills with roommates.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
              Settle up in one tap via UPI.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            No app download. Works on any phone. Free forever.<br />
            Ditch the ads and paywalls of other apps.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black text-lg font-bold px-8 py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-green-500/25"
            >
              Get Started Free <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-6 bg-slate-900/50 border-y border-slate-800/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl point-events-none"></div>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">How Splito Works</h2>
            <p className="text-slate-400">Everything you need to manage shared expenses seamlessly.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-800/60 transition-colors">
              <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                <UsersIcon className="text-blue-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-100">1. Instant Groups</h3>
              <p className="text-slate-400 leading-relaxed">Create a group in seconds and invite friends instantly via WhatsApp shared links. No app installations required.</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-800/60 transition-colors">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-6">
                <CalculatorIcon className="text-amber-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-100">2. Precise Splits</h3>
              <p className="text-slate-400 leading-relaxed">Add expenses using equal, percentage, or exact division. Splito mathematically minimizes total transactions to the exact paisa.</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 hover:bg-slate-800/60 transition-colors transform md:-translate-y-4">
              <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Smartphone className="text-green-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-100">3. Tap to Pay</h3>
              <p className="text-slate-400 leading-relaxed">No calculating. We automatically generate highly secure UPI deep links so you can settle up instantly via PhonePe, GPay, or Paytm.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">The smarter choice</h2>
            <p className="text-slate-400">Why thousands are migrating to Splito.</p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm shadow-xl">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="p-6 font-semibold text-slate-400 w-1/3">Feature</th>
                  <th className="p-6 font-bold text-white text-lg bg-green-500/5 w-1/3">Splito</th>
                  <th className="p-6 font-semibold text-slate-500 w-1/3">Alternatives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                <TableRow label="UPI Deep Links" splito="Native & Secure" alt={<span className="text-slate-500">Not supported</span>} splitoIcon="check" altIcon="cross" />
                <TableRow label="Paywalls" splito="Free Forever" alt={<span className="text-slate-500">Paid tiers for features</span>} splitoIcon="check" altIcon="cross" />
                <TableRow label="App Download" splito="Instant PWA via Link" alt={<span className="text-slate-500">App store required</span>} splitoIcon="check" altIcon="cross" />
                <TableRow label="Ads" splito="Zero Ads" alt={<span className="text-slate-500">Intrusive ads</span>} splitoIcon="check" altIcon="cross" />
                <TableRow label="Paisa-precise routing" splito="Mathematical precision" alt={<span className="text-slate-500">Often rounds up</span>} splitoIcon="check" altIcon="alert" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Founder Story ── */}
      <section className="py-24 px-6 bg-slate-900/50 border-y border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 tracking-tight">Built for Indian roommates.</h2>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 md:p-12 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl point-events-none"></div>
            <p className="text-slate-300 mb-6 leading-relaxed relative z-10 text-lg">
              "I built Splito because I was tired of using expense apps that felt sluggish, pushed premium paywalls, and forced me to manually switch back and forth to PhonePe just to settle a ₹150 chai bill with my flatmates. 
            </p>
            <p className="text-slate-300 mb-8 leading-relaxed relative z-10 text-lg">
              Splito is designed exactly how an expense splitter in India should work: it's perfectly accurate to the paisa, completely free, and natively drops you right into your UPI app to pay with zero friction."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-green-500/20">K</div>
              <div>
                <p className="font-bold text-white text-base">Karthik</p>
                <p className="text-sm text-green-400 font-medium">Creator of Splito</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA & Footer ── */}
      <footer className="pt-24 pb-8 px-6 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight mb-8">Ready to end the math debates?</h2>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-200 text-black text-lg font-bold px-10 py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-white/10"
          >
            Open Splito Now <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-slate-500 text-xs md:text-sm">
          <p className="mb-4 md:mb-0">
            Built with React 18, Firebase, and Tailwind CSS. Hosted on Firebase. Security Rules strictly enforce data isolation.
          </p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
              <Shield size={16} /> Privacy First
            </span>
            <a href="https://github.com/karthikmayara/SPLITTO" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-slate-300 transition-colors">
              <Github size={16} /> Open Source
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function TableRow({ label, splito, alt, splitoIcon, altIcon }: any) {
  return (
    <tr className="transition-colors hover:bg-slate-800/20">
      <td className="p-6 font-medium text-slate-300">{label}</td>
      <td className="p-6 font-semibold text-green-400 bg-green-500/[0.02]">
        <div className="flex items-center gap-2">
          {splitoIcon === 'check' && <CheckCircle2 size={18} />}
          {splitoIcon === 'alert' && <AlertCircle size={18} />}
          {splito}
        </div>
      </td>
      <td className="p-6 font-medium text-slate-400">
        <div className="flex items-center gap-2">
          {altIcon === 'cross' && <XCircle size={18} className="text-red-400/70" />}
          {altIcon === 'alert' && <AlertCircle size={18} className="text-amber-400/70" />}
          {alt}
        </div>
      </td>
    </tr>
  )
}

// Inline SVGs for speed
function UsersIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function CalculatorIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
}
