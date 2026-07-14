# 🤖 AI Resume Analyzer

An AI-powered web application that analyzes resumes and provides intelligent feedback to help users improve their chances of passing Applicant Tracking Systems (ATS) and getting shortlisted for jobs.

The application allows users to upload resumes, receive AI-generated analysis, view an ATS score, and download feedback reports. A **free, no-sign-in analysis mode** is also available for a quick first look before creating an account.

[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://ai-resume-analyzer-three-taupe.vercel.app/)

---

## 🚀 Features

* 📄 **Resume Upload** – Upload resume files directly through the web interface
* 🤖 **AI Resume Analysis** – AI evaluates resume content, structure, and skills
* 📊 **ATS Score Generation** – Shows how well the resume performs with ATS systems
* 💡 **Detailed Feedback** – Suggestions for improving resume quality
* 🔐 **User Authentication** – Login and session management using Puter.js
* ☁️ **Cloud Storage** – Resume files stored securely with Puter.js
* 👤 **User Profile** – Profile section with logout functionality
* 🆓 **Free Instant Analysis** – Analyze a resume without signing in, no account required

---

## 🆓 Free Analysis (No Sign-In Required)
 
Try the analyzer instantly without creating an account:
 
1. Go to the **Free Analysis** page from the homepage
2. Upload a resume (PDF)
3. Get an instant AI-generated score and feedback — no login, no storage

This mode is ideal for a quick check before signing up for the full experience (resume history, job description matching, and saved reports).
 
---

## 🛠 Tech Stack

**Frontend**

* React
* TypeScript
* Tailwind CSS
* React Router
* `pdfjs-dist` (client-side PDF text extraction)

**State Management**

* Zustand

**Backend** (free, no-sign-in analysis)
 
* Express.js (Node.js)
* Google Gemini API (`gemini-2.5-flash`)
* Deployed as a separate Vercel project from the frontend

**Planned / In Progress** (full authenticated tier)
 
* Clerk (Authentication)
* Neon DB + Drizzle ORM (Database)
* Cloudinary (Resume file storage)

**Services**

* Puter.js (Authentication, Storage, AI)

**Tools**

* Vite
* Git & GitHub
* Vercel (frontend + backend, deployed separately)

---

## 📂 Project Structure

```
AI-Resume-Analyzer
│
├── app
│   ├── components
│   ├── routes
│   ├── constants
│   ├── types
│   └── root.tsx
│
├── public
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## ⚙️ Installation & Setup

### Clone the Repository

```
git clone https://github.com/Ashish-Tiwari80/AI-Resume-Analyzer.git
```

### Navigate to the Project Folder

```
cd AI-Resume-Analyzer
```

### Install Dependencies

```
npm install
```

### Start Development Server

```
npm run dev
```

The application will run on:

```
http://localhost:5173
```

---

## 📸 Screenshots

### Auth Page
![Auth Page](screenshots/Auth_page.png)

### Home Page
![Home Page](screenshots/home.png)

### Resume Upload
![Upload Resume](screenshots/upload.png)

### AI Resume Analysis
![AI Analysis](screenshots/analysis.png)


---

## 🎯 Use Cases

* Students preparing resumes for internships
* Job seekers optimizing resumes for ATS systems
* Developers learning AI-powered web applications

---

## 🔮 Future Improvements

* Keyword optimization suggestions
* Resume history tracking
* Advanced analytics dashboard

---

## 👨‍💻 Author

Ashish Tiwari

GitHub:
https://github.com/Ashish-Tiwari80

---

## 📜 License

This project is open-source and available under the MIT License.
