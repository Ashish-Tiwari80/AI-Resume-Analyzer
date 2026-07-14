import { usePuterStore } from "~/lib/puter";
import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import FileUploader from "~/components/FileUploader";
import FreeAnalysisResult, {
  type FreeFeedback,
} from "~/components/Freeanalysisresult";

export const meta = () => [
  { title: "Resumind | Auth" },
  { name: "description", content: "Log in or try a free resume scan" },
];

const BENEFITS = [
  {
    icon: "/icons/check.svg",
    title: "Save your history",
    desc: "Every analysis stored. Track your score improvements over time.",
  },
  {
    icon: "/icons/check.svg",
    title: "JD matching",
    desc: "Paste a job description and get a role-specific match score.",
  },
  {
    icon: "/icons/check.svg",
    title: "Deep breakdown",
    desc: "Full section-by-section scoring across tone, content, structure, and skills.",
  },
  {
    icon: "/icons/check.svg",
    title: "Multiple AI models",
    desc: "Compare feedback from Claude, GPT-4, and Gemini side by side.",
  },
];

const HOW_IT_WORKS = [
  { label: "Upload your resume", detail: "Drop in a PDF, nothing is stored" },
  { label: "AI Model reads it", detail: "Tone, structure, skills & ATS fit" },
  { label: "Get your score", detail: "Plus concrete lines to fix" },
];

const SCORE_PILLARS = [
  {
    title: "ATS parse rate",
    desc: "We simulate how tracking systems like Workday and Greenhouse read your file — section headings, dates, contact info, and file structure.",
  },
  {
    title: "Content quality",
    desc: "The AI model flags vague bullet points, missing numbers, and weak action verbs — the same things a recruiter notices in the first few seconds.",
  },
  {
    title: "Keyword & skill fit",
    desc: "Hard skills, soft skills, and role-specific keywords are checked against your target title, so nothing important is missing.",
  },
];

type StepKey = "read" | "extract" | "analyze";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "read", label: "Reading your PDF" },
  { key: "extract", label: "Extracting text" },
  { key: "analyze", label: "Analysing with AI Model" },
];

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Use the worker bundled WITH the package — no CDN, no version mismatch
  const workerUrl = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.toString();

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
    );
  }

  return pages.join("\n\n").trim();
}

type Stage = "idle" | "loading" | "result" | "error";

// ---- Compact step tracker for the loading state ----
const StepTracker = ({ activeStep }: { activeStep: StepKey }) => {
  const activeIndex = STEPS.findIndex((s) => s.key === activeStep);

  return (
    <div className="flex flex-col gap-2 w-full max-w-[220px] mx-auto">
      {STEPS.map((step, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <div key={step.key} className="flex items-center gap-2.5">
            <div
              className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 border-2 transition-colors duration-300
                ${done ? "bg-indigo-500 border-indigo-500" : ""}
                ${current ? "border-indigo-500" : ""}
                ${!done && !current ? "border-gray-200" : ""}`}
            >
              {done ? (
                <svg
                  viewBox="0 0 24 24"
                  className="w-3 h-3 text-white"
                  fill="none"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : current ? (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
              )}
            </div>
            <span
              className={`text-xs transition-colors duration-300
                ${done ? "text-gray-400 line-through decoration-gray-300" : ""}
                ${current ? "text-gray-800 font-medium" : ""}
                ${!done && !current ? "text-gray-300" : ""}`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const Auth = () => {
  const { isLoading, auth } = usePuterStore();
  const location = useLocation();
  const next = location.search.split("next=")[1] || "/";
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>("idle");
  const [feedback, setFeedback] = useState<FreeFeedback | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [activeStep, setActiveStep] = useState<StepKey>("read");

  const loginRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const checksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (auth.isAuthenticated) navigate(next);
  }, [auth.isAuthenticated, next]);

  const handleFileSelect = useCallback(async (file: File | null) => {
    if (!file) return;

    setFileName(file.name);
    setStage("loading");
    setActiveStep("read");
    setFeedback(null);

    try {
      setActiveStep("extract");
      const text = await extractTextFromPDF(file);

      if (text.trim().length < 100) {
        throw new Error(
          "Could not extract enough text. Make sure your PDF is not a scanned image.",
        );
      }

      setActiveStep("analyze");

      const res = await fetch(`${process.env.BACKEND_API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: text }),
      });

      const responseText = await res.text();

      let result: FreeFeedback | null = null;
      if (responseText) {
        try {
          result = JSON.parse(responseText) as FreeFeedback;
        } catch {
          throw new Error("The analysis service returned an invalid response.");
        }
      }

      if (!res.ok) {
        throw new Error(
          (result as { error?: string } | null)?.error ||
            `Server error ${res.status}`,
        );
      }

      if (!result) {
        throw new Error("The analysis service returned an empty response.");
      }

      setFeedback(result);
      setStage("result");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setStage("error");
    }
  }, []);

  const reset = () => {
    setStage("idle");
    setFeedback(null);
    setErrorMsg("");
    setFileName("");
    setActiveStep("read");
  };

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover bg-fixed min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <span className="text-3xl text-gradient font-black tracking-tight">
            Resumind
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-500">
            <button
              onClick={() => scrollTo(howItWorksRef)}
              className="hover:text-gray-900 transition-colors"
            >
              How it works
            </button>
            <button
              onClick={() => scrollTo(checksRef)}
              className="hover:text-gray-900 transition-colors"
            >
              What we check
            </button>
          </nav>
          <button
            onClick={auth.signIn}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700
              transition-colors duration-150 hover:border-indigo-300 hover:text-indigo-600"
          >
            <p>Sign In</p>
          </button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-14 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div className="animate-in fade-in slide-in-from-left-2 duration-500 fill-mode-both">
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
              Free · No sign-in required
            </span>
            {stage !== "idle" && (
              <button
                onClick={reset}
                className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Start over
              </button>
            )}
          </div>

          <h1 className="text-3xl md:text-[2.5rem] leading-[1.1] font-black text-gray-900 tracking-tight">
            Is your resume ready for your next job application?
          </h1>
          <p className="text-gray-500 text-sm md:text-base mt-3 max-w-md">
            Upload your resume and let the AI model score it like an ATS would —
            tone, structure, skills, and keyword fit, with fixes you can act on
            today.
          </p>

          <div className="mt-6">
            {stage === "idle" && (
              <div className="gradient-border transition-shadow duration-300 hover:shadow-lg animate-in fade-in duration-500 max-w-md">
                <div className="bg-white rounded-2xl p-4">
                  <FileUploader onFileSelect={handleFileSelect} />
                </div>
              </div>
            )}

            {stage === "loading" && (
              <div className="flex flex-col items-center gap-5 py-8 md:py-10 animate-in fade-in duration-300 bg-white/70 backdrop-blur rounded-2xl border border-gray-100 max-w-md">
                <div className="relative h-11 w-11">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                </div>
                <StepTracker activeStep={activeStep} />
                <p className="text-[11px] text-gray-400">{fileName}</p>
              </div>
            )}

            {stage === "error" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center animate-in fade-in zoom-in-95 duration-300 max-w-md">
                <img
                  src="/icons/ats-bad.svg"
                  alt="error"
                  className="w-8 h-8 mx-auto mb-2"
                />
                <p className="font-semibold text-red-700 text-sm mb-1">
                  Analysis failed
                </p>
                <p className="text-xs text-red-500">{errorMsg}</p>
                <button
                  onClick={reset}
                  className="mt-3 rounded-lg border border-red-200 px-4 py-1.5 text-xs text-red-600 
                  transition-all duration-150 hover:bg-red-100 hover:scale-[1.03] active:scale-[0.98]"
                >
                  Try again
                </button>
              </div>
            )}

            {stage === "result" && feedback && (
              <FreeAnalysisResult
                feedback={feedback}
                fileName={fileName}
                onReset={reset}
                onSignIn={() => scrollTo(loginRef)}
                part="left"
              />
            )}
          </div>

          <p className="text-[11px] text-gray-400 mt-4">
            PDF only · Nothing is stored · Results in under a minute
          </p>
        </div>

        <div className="lg:sticky lg:top-24">
          <div className="hidden lg:block animate-in fade-in slide-in-from-right-2 duration-500 delay-150 fill-mode-both">
            <img
              src="/images/ats-checker.svg"
              alt="ATS checker"
              className="w-full mx-auto"
            />
          </div>

          {stage === "result" && feedback && (
            <div className="mt-6 lg:mt-8">
              <FreeAnalysisResult
                feedback={feedback}
                fileName={fileName}
                onReset={reset}
                onSignIn={() => scrollTo(loginRef)}
                part="right"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        ref={howItWorksRef}
        className="border-y border-gray-100 bg-white py-12 md:py-16 scroll-mt-16"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-8">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.label} className="flex items-start gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 text-white text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-gray-800 leading-tight">
                    {step.label}
                  </p>
                  <p className="text-sm text-gray-400 leading-snug mt-1">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT WE CHECK ── */}
      <section
        ref={checksRef}
        className="max-w-6xl mx-auto px-4 md:px-8 py-14 md:py-16 scroll-mt-16"
      >
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">
          How Resumind scores your resume
        </h2>
        <p className="text-gray-500 text-sm md:text-base mt-2 max-w-2xl">
          When you apply, there's a good chance an applicant tracking system
          reads your resume before a person does. Resumind checks your resume
          the same way, then explains what to fix in plain terms.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {SCORE_PILLARS.map((pillar, i) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-gray-100 bg-white p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="text-xs font-semibold text-indigo-500">
                0{i + 1}
              </span>
              <p className="font-semibold text-gray-800 mt-1">{pillar.title}</p>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {pillar.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Login + benefits ── */}
      <section
        ref={loginRef}
        className="border-t border-gray-100 bg-white py-14 md:py-16 scroll-mt-16"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              Want more than a quick score?
            </h2>
            <p className="text-gray-500 text-sm mb-6 max-w-md">
              Sign in to keep every analysis, match your resume against a real
              job description, and compare feedback across models.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="group flex items-start gap-2 rounded-xl border border-gray-100 bg-white p-4
                    transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 shrink-0 transition-colors duration-200 group-hover:bg-indigo-100">
                    <img src={b.icon} alt="check" className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm leading-tight">
                      {b.title}
                    </p>
                    <p className="text-gray-500 text-xs mt-1 leading-snug">
                      {b.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="gradient-border shadow-md transition-shadow duration-300 hover:shadow-lg lg:max-w-sm lg:justify-self-end w-full">
            <section className="flex flex-col gap-4 bg-white rounded-2xl p-5 md:p-6">
              <div className="flex flex-col items-center gap-1 text-center">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  Welcome
                </h2>
                <h3 className="text-xs md:text-sm text-gray-500">
                  Log in to continue your job journey
                </h3>
              </div>
              <div>
                {isLoading ? (
                  <button className="auth-button animate-pulse">
                    <p>Signing you in…</p>
                  </button>
                ) : auth.isAuthenticated ? (
                  <button className="auth-button" onClick={auth.signOut}>
                    <p>Log Out</p>
                  </button>
                ) : (
                  <button
                    className="auth-button transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                    onClick={auth.signIn}
                  >
                    <p>Log In</p>
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-6xl mx-auto px-4 md:px-8 text-center text-[11px] text-gray-400">
          RESUMIND · Built for students and job seekers to improve their resumes. &copy; 2026 by AASHISH.
        </div>
      </footer>
    </main>
  );
};

export default Auth;
