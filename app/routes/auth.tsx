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

      const res = await fetch("/api/analyze", {
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

  const scrollToLogin = () =>
    loginRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover bg-fixed min-h-screen lg:h-screen lg:overflow-hidden flex flex-col">

      <div className="shrink-0 px-4 md:px-8 pt-0 pb-4 md:pt-0 md:pb-4 text-center animate-in fade-in slide-in-from-top-2 duration-500">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
          Resumind
        </h1>
        <p className="text-gray-500 text-xs md:text-sm mt-1 max-w-lg mx-auto">
          Upload your resume and let the AI model score it like an ATS would — tone,
          structure, skills, and keyword fit, with fixes you can act on today.
        </p>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 px-4 md:px-8 pb-4 lg:pb-6">
        {/* ── LEFT: Free Gemini analyser ── */}
        <section className="min-h-0 flex flex-col items-center lg:overflow-y-auto lg:pr-1 animate-in fade-in slide-in-from-left-2 duration-500 delay-100 fill-mode-both">
          <div className="flex items-center justify-between mb-3 shrink-0 w-full max-w-md">
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

          {stage === "idle" && (
            <>
              {/* How it works — compact horizontal steps */}
              <div className="flex flex-col gap-3.5 mb-6 w-full max-w-md">
                {HOW_IT_WORKS.map((step, i) => (
                  <div key={step.label} className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-tight">
                        {step.label}
                      </p>
                      <p className="text-xs text-gray-400 leading-snug">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="gradient-border transition-shadow duration-300 hover:shadow-lg animate-in fade-in duration-500 max-w-md w-full">
                <div className="bg-white rounded-2xl p-4">
                  <FileUploader onFileSelect={handleFileSelect} />
                </div>
              </div>
            </>
          )}

          {stage === "loading" && (
            <div className="flex flex-col items-center gap-5 py-8 md:py-10 animate-in fade-in duration-300 bg-white/70 backdrop-blur rounded-2xl border border-gray-100 w-full max-w-md">
              <div className="relative h-11 w-11">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              </div>
              <StepTracker activeStep={activeStep} />
              <p className="text-[11px] text-gray-400">{fileName}</p>
            </div>
          )}

          {stage === "error" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-md">
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
            <div className="lg:pb-2 w-full">
              <FreeAnalysisResult
                feedback={feedback}
                fileName={fileName}
                onReset={reset}
                onSignIn={scrollToLogin}
              />
            </div>
          )}

          {stage === "idle" && (
            <button
              onClick={scrollToLogin}
              className="lg:hidden mt-3 text-[11px] text-gray-400 hover:text-gray-600 transition-colors self-center"
            >
              Prefer to sign in first? ↓
            </button>
          )}
        </section>

        {/* ── RIGHT: Login + benefits ── */}
        <section
          ref={loginRef}
          className="min-h-0 flex flex-col gap-3 lg:overflow-y-auto lg:pl-1 animate-in fade-in slide-in-from-right-2 duration-500 delay-150 fill-mode-both"
        >
          <div className="grid grid-cols-2 gap-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="group flex items-start gap-2 rounded-xl border border-gray-100 bg-white/80 backdrop-blur p-4
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

          <div className="gradient-border shadow-md transition-shadow duration-300 hover:shadow-lg">
            <section className="flex flex-col gap-4 bg-white rounded-2xl p-5 md:p-6">
              <div className="flex flex-col items-center gap-1 text-center">
                <h1 className="text-lg md:text-xl font-bold text-gray-900">
                  Welcome
                </h1>
                <h2 className="text-xs md:text-sm text-gray-500">
                  Log in to continue your job journey
                </h2>
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
        </section>
      </div>
    </main>
  );
};

export default Auth;
