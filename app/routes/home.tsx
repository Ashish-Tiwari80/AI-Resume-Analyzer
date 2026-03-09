import Navbar from "~/components/Navbar";
import type { Route } from "./+types/home";
import ResumeCard from "~/components/ResumeCard";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate } from "react-router";
import toast from "react-hot-toast";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    {
      name: "description",
      content: "AI-powered resume analysis and feedback.",
    },
  ];
}

export default function Home() {
  const { auth, kv, fs } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  const handleDelete = async (resume: Resume) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this resume? This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      if (resume.imagePath) {
        try {
          await fs.delete(resume.imagePath);
        } catch {}
      }

      if (resume.resumePath) {
        try {
          await fs.delete(resume.resumePath);
        } catch {}
      }
      try {
        await kv.delete(`resume:${resume.id}`);
      } catch {}

      setResumes((prev) => prev.filter((r) => r.id !== resume.id));
      toast.success("Resume deleted successfully");
      
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  useEffect(() => {
    if (!auth.isAuthenticated) navigate("/auth?next=/");
  }, [auth.isAuthenticated]);

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      const resumes = (await kv.list("resume:*", true)) as KVItem[];

      const parsedResumes: Resume[] = [];

      for (const item of resumes) {
        try {
          const resume = JSON.parse(item.value) as Resume;

          if (!resume.feedback || typeof resume.feedback !== "object") continue;

          try {
            if (resume.imagePath) {
              await fs.read(resume.imagePath);
            }
            if (resume.resumePath) {
              await fs.read(resume.resumePath);
            }
          } catch {
            await kv.delete(`resume:${resume.id}`);
            continue;
          }

          parsedResumes.push(resume);
        } catch {}
      }

      setResumes(parsedResumes);
      setLoadingResumes(false);
    };

    loadResumes();
  }, []);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <div className="sticky top-2 z-50">
        <Navbar />
      </div>
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Track your Applications & Resume Ratings</h1>
          {!loadingResumes && resumes?.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback.</h2>
          ) : (
            <h2>Review your submissions and check AI-powered feedback.</h2>
          )}
        </div>
        {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {!loadingResumes && resumes.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link
              to="/upload"
              className="primary-button w-fit text-xl font-semibold"
            >
              Upload Resume
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
