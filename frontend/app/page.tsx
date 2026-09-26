import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Car,
  ShieldCheck,
  BellRing,
  Eye,
  CheckCircle,
  Clock,
  Compass,
} from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import Logo from "@/components/Logo";

function LinkedinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function GithubIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 sm:gap-20 pb-12 w-full max-w-full overflow-hidden">
      {/* 
        HERO SECTION: Clear, Simple, Welcoming
      */}
      <section className="pt-10 sm:pt-14 md:pt-20 flex flex-col items-center text-center px-2 sm:px-0">
        <FadeIn className="max-w-3xl space-y-6">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs sm:text-sm font-semibold text-primary">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            Residential Colony Awareness
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground balance leading-tight">
            Connecting Neighbor Cameras,{" "}
            <span className="text-primary block sm:inline mt-1 sm:mt-0">One Plate at a Time.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto balance leading-relaxed">
            Most houses have security cameras that only watch their own gate. GridWatch connects them so neighbors know when an unfamiliar vehicle enters, moves down the street, and stays in the colony.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm sm:text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Open Live Dashboard
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/timeline"
              className="w-full sm:w-auto inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted px-6 py-3 text-sm sm:text-base font-semibold text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Compass size={18} className="text-primary" />
              Trace Vehicle Journey
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* 
        WHY IT HELPS: 3 Plain-Language Resident Benefits
      */}
      <section className="bg-card border border-border rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm relative overflow-hidden">
        <FadeIn>
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              Why Colonies Need Connected Cameras
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Simple community awareness instead of isolated, forgotten cameras.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Benefit 1 */}
            <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl bg-muted/20 sm:bg-transparent">
              <div className="p-3.5 rounded-2xl bg-primary/10 text-primary">
                <Eye size={26} />
              </div>
              <h3 className="text-base sm:text-lg font-bold">Shared Street View</h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Cameras work together across streets so there are no blind spots when a car drives past.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl bg-muted/20 sm:bg-transparent">
              <div className="p-3.5 rounded-2xl bg-safe/10 text-safe">
                <CheckCircle size={26} />
              </div>
              <h3 className="text-base sm:text-lg font-bold">Recognizes Neighbors</h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Registered resident vehicles pass by quietly without triggering any alerts.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl bg-muted/20 sm:bg-transparent">
              <div className="p-3.5 rounded-2xl bg-verify/10 text-verify">
                <Clock size={26} />
              </div>
              <h3 className="text-base sm:text-lg font-bold">Notifies on Lingering Cars</h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                If an unknown vehicle stays around for too long, neighbors get a calm alert to verify it.
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* 
        HOW IT WORKS: 4 Plain Steps
      */}
      <section>
        <FadeIn delay={100}>
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">How It Works</h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Automatic, continuous protection in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Step 1 */}
            <div className="flex flex-col p-5 bg-card border border-border rounded-2xl shadow-xs">
              <div className="mb-3.5 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary">
                <Camera size={22} />
              </div>
              <h3 className="text-base font-bold mb-1.5">1. Cameras Watch</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Cameras at entry gates and colony streets record passing vehicles.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col p-5 bg-card border border-border rounded-2xl shadow-xs">
              <div className="mb-3.5 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary">
                <Car size={22} />
              </div>
              <h3 className="text-base font-bold mb-1.5">2. Plates Read</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                License plates are detected automatically as vehicles enter the view.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col p-5 bg-card border border-border rounded-2xl shadow-xs">
              <div className="mb-3.5 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-safe/10 text-safe">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-base font-bold mb-1.5">3. Auto Checked</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Plates are checked against the colony catalogue of resident cars.
              </p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col p-5 bg-card border border-border rounded-2xl shadow-xs">
              <div className="mb-3.5 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-verify/10 text-verify">
                <BellRing size={22} />
              </div>
              <h3 className="text-base font-bold mb-1.5">4. Residents Alerted</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                If an unknown vehicle stays around, neighbors receive an alert to verify.
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* 
        THE TEAM / BUILT BY SECTION: Batool Zafar first, then Muhammad Hashim
      */}
      <section className="border-t border-border pt-12 pb-4">
        <FadeIn delay={150}>
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">The Team</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1.5">
              Built for Imaginathon by <strong className="text-foreground font-semibold">Banao.pk</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Batool Zafar Card */}
            <div className="flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
              <div className="space-y-1.5">
                <span className="inline-block rounded-full bg-verify/10 text-verify px-3 py-0.5 text-xs font-semibold">
                  Computer Vision & Backend
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight pt-1">
                  Batool Zafar
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Engineered vehicle detection, multi-camera tracking, license plate OCR, and dwell analytics.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-4 mt-3 border-t border-border/60">
                <a
                  href="https://www.linkedin.com/in/batool-zafar-141596298/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  title="Batool Zafar on LinkedIn"
                  aria-label="Batool Zafar on LinkedIn"
                >
                  <LinkedinIcon className="h-4 w-4" />
                </a>

                <a
                  href="https://github.com/batool-zafar123"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  title="Batool Zafar on GitHub"
                  aria-label="Batool Zafar on GitHub"
                >
                  <GithubIcon className="h-4 w-4" />
                </a>

                <span className="text-xs text-muted-foreground font-medium pl-1">
                  Connect & Profile
                </span>
              </div>
            </div>

            {/* Muhammad Hashim Card */}
            <div className="flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
              <div className="space-y-1.5">
                <span className="inline-block rounded-full bg-primary/10 text-primary px-3 py-0.5 text-xs font-semibold">
                  Frontend & UI
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight pt-1">
                  Muhammad Hashim
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Designed frontend architecture, responsive layouts, vehicle journey timelines, and camera feeds.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-4 mt-3 border-t border-border/60">
                <a
                  href="https://www.linkedin.com/in/muhammad-hashim-naeem/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  title="Muhammad Hashim on LinkedIn"
                  aria-label="Muhammad Hashim on LinkedIn"
                >
                  <LinkedinIcon className="h-4 w-4" />
                </a>

                <a
                  href="https://github.com/Muhammad-Hashim-16"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  title="Muhammad Hashim on GitHub"
                  aria-label="Muhammad Hashim on GitHub"
                >
                  <GithubIcon className="h-4 w-4" />
                </a>

                <span className="text-xs text-muted-foreground font-medium pl-1">
                  Connect & Profile
                </span>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* 
        CLEAN MINIMAL FOOTER 
      */}
      <footer className="border-t border-border pt-6 pb-2 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 font-bold text-sm text-foreground">
          <Logo size={20} className="text-primary" />
          <span>GridWatch – Faisalabad</span>
        </div>

        <p className="text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Residential vehicle awareness platform. Built for Imaginathon by Banao.pk.
        </p>
      </footer>
    </div>
  );
}
