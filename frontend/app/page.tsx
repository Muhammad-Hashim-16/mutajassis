import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Car,
  ShieldCheck,
  BellRing,
  EyeOff,
  Search,
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
    <div className="flex flex-col gap-20 sm:gap-24 pb-12 w-full max-w-full overflow-hidden">
      {/* 
        HERO SECTION 
      */}
      <section className="pt-12 sm:pt-16 md:pt-24 lg:pt-32 flex flex-col items-center text-center px-2 sm:px-0">
        <FadeIn className="max-w-4xl space-y-6">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs sm:text-sm font-medium text-primary mb-2 sm:mb-4">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            GridWatch Live Demonstration
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground balance">
            Connecting a Neighborhood's Cameras,{" "}
            <span className="text-primary block sm:inline mt-1 sm:mt-0">One Plate at a Time.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto balance leading-relaxed">
            Residential colonies in Faisalabad have independent CCTV cameras with no shared visibility. Tracking an unrecognized vehicle's movement across the neighborhood is manual and reactive. GridWatch automates cross-camera awareness to keep communities informed.
          </p>
          <div className="pt-2 sm:pt-4">
            <Link
              href="/dashboard"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              View Live Dashboard
              <ArrowRight size={20} />
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* 
        PROBLEM SECTION 
      */}
      <section className="bg-card border border-border rounded-3xl p-6 sm:p-8 md:p-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <FadeIn>
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 sm:mb-4">The Invisible Threat</h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              Current security setups in local colonies fail because cameras operate in total isolation.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 p-4 rounded-2xl bg-muted/20 sm:bg-transparent">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-muted text-muted-foreground">
                <EyeOff size={30} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold">Isolated Vision</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Each house's camera only sees its own gate. There is no unified view of who is moving through the neighborhood.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 p-4 rounded-2xl bg-muted/20 sm:bg-transparent">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-muted text-muted-foreground">
                <Search size={30} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold">Reactive Searching</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Footage is only checked <em>after</em> an incident occurs. Tracking a vehicle means manually knocking on neighbors' doors.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 p-4 rounded-2xl bg-muted/20 sm:bg-transparent">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-muted text-muted-foreground">
                <BellRing size={30} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold">No Early Warning</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                If an unrecognized vehicle circles the colony for hours, no one knows. GridWatch replaces blindness with proactive awareness.
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* 
        HOW IT WORKS SECTION 
      */}
      <section>
        <FadeIn delay={100}>
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 sm:mb-4">How It Works</h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              A seamless, automated flow that turns independent cameras into a collaborative awareness network.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Step 1 */}
            <div className="group relative flex flex-col p-5 sm:p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                <Camera size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2">1. Cameras Watch</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Independent cameras across the colony continuously monitor entry points and streets.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group relative flex flex-col p-5 sm:p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500">
                <Car size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2">2. Vehicles Detected</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Each passing vehicle is detected automatically, and its license plate is read when visible.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group relative flex flex-col p-5 sm:p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-safe/10 text-safe">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2">3. Cross-Checked</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Plates are instantly matched against the neighborhood's registered vehicle list.
              </p>
            </div>

            {/* Step 4 */}
            <div className="group relative flex flex-col p-5 sm:p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-verify/10 text-verify">
                <BellRing size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2">4. Residents Notified</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Unrecognized vehicles that linger trigger a neutral awareness alert for verification — never an accusation.
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* 
        CLOSING CTA SECTION 
      */}
      <section className="text-center py-8 sm:py-12 md:py-16">
        <FadeIn delay={150} className="space-y-5 sm:space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to see it in action?</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Experience how seamless vehicle tracking transforms community safety. Check the live dashboard and timeline.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-foreground text-background px-8 py-3.5 text-base font-semibold shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
            >
              Explore Dashboard
            </Link>
          </div>
          <p className="text-xs text-muted-foreground pt-4">
            Built for Imaginathon by <span className="font-semibold text-foreground">Banao.pk</span> — reimagining Faisalabad.
          </p>
        </FadeIn>
      </section>

      {/* 
        THE TEAM / BUILT BY SECTION (Prominent, Dedicated Cards)
      */}
      <section className="border-t border-border/70 pt-14 pb-4">
        <FadeIn delay={200}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
              Imaginathon Team
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">The Team</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mt-2">
              The builders behind the GridWatch residential awareness prototype.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto">
            {/* Batool Zafar Card */}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300">
              <div className="space-y-1.5">
                <span className="inline-block rounded-full bg-verify/10 text-verify px-3 py-0.5 text-xs font-semibold tracking-wide">
                  Computer Vision & Backend
                </span>
                <h3 className="text-xl font-bold text-foreground tracking-tight pt-1">
                  Batool Zafar
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Developed automated vehicle detection, multi-camera tracking logic, plate OCR pipeline, and dwell analytics.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-5 mt-4 border-t border-border/60">
                <a
                  href="https://www.linkedin.com/in/batool-zafar-141596298/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  title="Batool Zafar LinkedIn"
                  aria-label="Batool Zafar on LinkedIn"
                >
                  <LinkedinIcon className="h-5 w-5" />
                </a>

                <a
                  href="https://github.com/batool-zafar123"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  title="Batool Zafar GitHub"
                  aria-label="Batool Zafar on GitHub"
                >
                  <GithubIcon className="h-5 w-5" />
                </a>

                <span className="text-xs text-muted-foreground font-medium pl-1">
                  Connect & Profile
                </span>
              </div>
            </div>

            {/* Muhammad Hashim Card */}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300">
              <div className="space-y-1.5">
                <span className="inline-block rounded-full bg-primary/10 text-primary px-3 py-0.5 text-xs font-semibold tracking-wide">
                  Frontend & UI
                </span>
                <h3 className="text-xl font-bold text-foreground tracking-tight pt-1">
                  Muhammad Hashim
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Led frontend architecture, responsive design system, vehicle timeline visualization, and live feed integration.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-5 mt-4 border-t border-border/60">
                <a
                  href="https://www.linkedin.com/in/muhammad-hashim-naeem/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  title="Muhammad Hashim LinkedIn"
                  aria-label="Muhammad Hashim on LinkedIn"
                >
                  <LinkedinIcon className="h-5 w-5" />
                </a>

                <a
                  href="https://github.com/Muhammad-Hashim-16"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  title="Muhammad Hashim GitHub"
                  aria-label="Muhammad Hashim on GitHub"
                >
                  <GithubIcon className="h-5 w-5" />
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
      <footer className="mt-auto border-t border-border pt-8 pb-4 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 font-bold text-sm sm:text-base text-foreground">
          <Logo size={22} className="text-primary" />
          <span>GridWatch – Faisalabad</span>
        </div>

        <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
          Prototype built in a 48-hour hackathon for Imaginathon by Banao.pk. Camera feeds are simulated using real recorded footage for demonstration purposes. This is a neutral awareness system, not an accusation platform.
        </p>
      </footer>
    </div>
  );
}
