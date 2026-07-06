import ATS from "~/components/ATS";
import Details from "~/components/Details";
import Summary from "~/components/Summary";

interface Tip {
  type: "good" | "improve";
  tip: string;
  explanation: string;
}

interface Category {
  score: number;
  tips: Tip[];
}

export interface FreeFeedback {
  overallScore: number;
  toneAndStyle: Category;
  content: Category;
  structure: Category;
  skills: Category;
  ATS: {
    score: number;
    tips: { type: "good" | "improve"; tip: string }[];
  };
}

interface FreeAnalysisResultProps {
  feedback: FreeFeedback;
  fileName: string;
  onReset: () => void;
  onSignIn: () => void;
}

const FreeAnalysisResult = ({
  feedback,
  fileName,
  onReset,
  onSignIn,
}: FreeAnalysisResultProps) => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700 w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/images/pdf.png" alt="pdf" className="w-6 h-6 shrink-0" />
          <p className="text-sm text-gray-500 truncate">{fileName}</p>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0 flex items-center gap-1"
        >
          <img src="/icons/back.svg" alt="back" className="w-3 h-3" />
          Analyse another
        </button>
      </div>

      <Summary feedback={feedback as unknown as Feedback} />

      <ATS score={feedback.ATS.score} suggestions={feedback.ATS.tips} />

      <Details feedback={feedback as unknown as Feedback} />

      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 flex flex-col sm:flex-row items-center gap-4 justify-between shadow-sm">
        <div className="text-center sm:text-left flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-lg">
            Want the full picture?
          </p>
          <p className="text-gray-500 text-sm mt-0.5">
            Sign in to match against a job description, track history, and get
            model comparisons.
          </p>
        </div>
        <button
          onClick={onSignIn}
          className="primary-button shrink-0 whitespace-nowrap w-auto"
        >
          Sign in — it's free
        </button>
      </div>
    </div>
  );
};

export default FreeAnalysisResult;
