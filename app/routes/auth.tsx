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

const Auth = () => {
  const { isLoading, auth } = usePuterStore();
  const location = useLocation();
  const next = location.search.split("next=")[1] || "/";
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>("idle");
  const [feedback, setFeedback] = useState<FreeFeedback | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [statusText, setStatusText] = useState("");

  const analyzerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (auth.isAuthenticated) navigate(next);
  }, [auth.isAuthenticated, next]);

  const handleFileSelect = useCallback(async (file: File | null) => {
    if (!file) return;

    setFileName(file.name);
    setStage("loading");
    setStatusText("Reading your PDF…");
    setFeedback(null);

    try {
      const text = await extractTextFromPDF(file);

      if (text.trim().length < 100) {
        throw new Error(
          "Could not extract enough text. Make sure your PDF is not a scanned image.",
        );
      }

      setStatusText("Analysing with Gemini…");

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
    setStatusText("");
  };

  const scrollToAnalyzer = () =>
    analyzerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const scrollToLogin = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 gap-10">
        <div className="w-full max-w-2xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 mb-5">
            Why sign in?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="group flex items-start gap-3 rounded-xl border border-gray-100 bg-white/80 backdrop-blur p-4 shadow-sm
                  transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 shrink-0 transition-colors duration-200 group-hover:bg-indigo-100">
                  <img src={b.icon} alt="check" className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    {b.title}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gradient-border shadow-lg transition-shadow duration-300 hover:shadow-xl">
          <section className="flex flex-col gap-8 bg-white rounded-2xl p-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1>Welcome</h1>
              <h2>Log In to Continue Your Job Journey</h2>
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
                <button className="auth-button" onClick={auth.signIn}>
                  <p>Log In</p>
                </button>
              )}
            </div>
          </section>
        </div>

        <button
          onClick={scrollToAnalyzer}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="text-xs font-medium">Or try a free scan first</span>
          <svg
            className="w-4 h-4 animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <div
        ref={analyzerRef}
        className="min-h-screen flex flex-col items-center justify-start px-4 py-16 bg-gray-50/90 backdrop-blur-sm"
      >
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <span className="inline-block rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 mb-3">
              Free · No sign-in required
            </span>
            <h2 className="text-3xl font-bold text-gray-900">
              Instant ATS Score
            </h2>
            <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
              Upload your resume and get a full score breakdown with actionable
              tips — no account needed.
            </p>
          </div>

          {stage === "idle" && (
            <div className="gradient-border transition-shadow duration-300 hover:shadow-lg animate-in fade-in duration-500">
              <div className="bg-white rounded-2xl p-6">
                <FileUploader onFileSelect={handleFileSelect} />
              </div>
            </div>
          )}

          {stage === "loading" && (
            <div className="flex flex-col items-center gap-8 py-16 animate-in fade-in duration-300">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700 animate-pulse">
                  {statusText}
                </p>
                <p className="text-xs text-gray-400 mt-1">{fileName}</p>
              </div>
              <img
                src="/images/resume-scan-2.gif"
                className="w-48 opacity-80"
                alt="scanning"
              />
            </div>
          )}

          {stage === "error" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <img
                src="/icons/ats-bad.svg"
                alt="error"
                className="w-10 h-10 mx-auto mb-3"
              />
              <p className="font-semibold text-red-700 mb-1">Analysis failed</p>
              <p className="text-sm text-red-500">{errorMsg}</p>
              <button
                onClick={reset}
                className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-100 transition-colors"
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
              onSignIn={scrollToLogin}
            />
          )}
        </div>
      </div>
    </main>
  );
};

export default Auth;
