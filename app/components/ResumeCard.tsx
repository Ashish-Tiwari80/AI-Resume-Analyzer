import { Link } from "react-router";
import ScoreCircle from "./ScoreCircle";
import { useEffect, useState, type MouseEvent } from "react";
import { usePuterStore } from "~/lib/puter";

interface ResumeCardProps {
  resume: Resume;
  onDelete?: (resume: Resume) => void;
}

const ResumeCard = ({
  resume,
  onDelete,
}: ResumeCardProps) => {
  const { fs } = usePuterStore();
  const [resumeUrl, setResumeUrl] = useState("");

  const { id, companyName, jobTitle, feedback, imagePath } = resume;

  useEffect(() => {
    let url: string | null = null;
  const loadResumes = async () => {
    try {
      const blob = await fs.read(imagePath);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      setResumeUrl(url);
    } catch {}
  };

  loadResumes();

  return () => {
    if (url) URL.revokeObjectURL(url);
  };
}, [imagePath]);

  const handleDeleteClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onDelete) return;

    onDelete(resume);
  };

  return (
    <div className="relative">
      {onDelete && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 z-20 bg-white/80 backdrop-blur rounded-full w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-500 transition"
          title="Delete resume"
        >
          ✕
        </button>
      )}
      <Link
        to={`/resume/${id}`}
        className="resume-card animate-in fade-in duration-1000"
      >
        <div className="resume-card-header">
        <div className="flex flex-col gap-2">
          {companyName && (
            <h2 className="!text-black font-bold break-words">{companyName}</h2>
          )}
          {jobTitle && (
            <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>
          )}
          {!companyName && !jobTitle && (
            <h2 className="!text-black font-bold">Resume</h2>
          )}
        </div>
        <div className="flex-shrink-0">
          {feedback && typeof feedback === "object" ? (
            <ScoreCircle score={feedback.overallScore ?? 0} />
          ) : (
            <ScoreCircle score={0} />
          )}
        </div>
      </div>
      {resumeUrl && (
        <div className="gradient-border animate-in fade-in duration-1000">
          <div className="w-full h-full">
            <img
              src={resumeUrl}
              alt="resume"
              className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
            />
          </div>
        </div>
      )}
    </Link>
    </div>
  );
};

export default ResumeCard;
