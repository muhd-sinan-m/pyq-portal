# 📚 PYQ Portal — Previous Year Question Papers

> **Built by BCA students, for BCA students.**  
> A free, fast, and always-available archive of previous year question papers — designed to make every junior student's exam preparation a little easier.

<br/>

![PYQ Portal](https://img.shields.io/badge/Live-pyqportal.app-2563EB?style=for-the-badge&logo=google-chrome&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.x-000000?style=for-the-badge&logo=flask&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Render](https://img.shields.io/badge/Hosted_on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

<br/>

## 🌐 Live Demo

**[pyqportal.app](https://pyqportal.app)** — Open. Free. No login required to browse.

<br/>

## 📸 Screenshots

### 🏠 Home Page
![Home Page](screenshots/home.png)

### 📂 Browse Papers — Semester View
![Browse Page](screenshots/browse.png)

### 📄 Inside a Semester — Exam Type View
![Semester View](screenshots/semester.png)

### 👨‍💻 About Page — Meet the Developers
![About Page](screenshots/about.png)

<br/>

## ✨ Features

- 📁 **Semester-based folder navigation** — Papers organized by Semester 1 to 6
- 📋 **Exam type filtering** — Browse SEA I, SEA II, and ISA papers separately
- 🔍 **Search and filter** — Filter by subject, year, semester or search by keyword
- 📄 **Inline PDF preview** — View papers directly in browser — no forced downloads
- 📱 **Fully mobile responsive** — Works perfectly on all screen sizes
- 🔒 **Admin-only upload** — Secure admin panel to upload and manage papers
- ⚡ **Always available** — Hosted 24/7, no sleeping, no delays
- 🆓 **Completely free** — No login needed to browse and download

<br/>

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python · Flask |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage |
| Frontend | HTML · CSS · JavaScript |
| Production Server | Gunicorn |
| Hosting | Render |
| Fonts | Plus Jakarta Sans · Space Grotesk |

<br/>

## 🗂️ Project Structure

```
pyq-portal/
├── app.py                  # Main Flask application
├── requirements.txt        # Python dependencies
├── Procfile               # Gunicorn start command
├── runtime.txt            # Python version
├── static/
│   ├── style.css          # Main styles
│   ├── style-combined.css # Component styles
│   ├── script.js          # Shared scripts
│   ├── indexjs.js         # Home page scripts
│   ├── viewjs.js          # Browse page scripts
│   └── uploadjs.js        # Upload page scripts
└── templates/
    ├── index.html         # Home page
    ├── view.html          # Browse papers page
    ├── upload.html        # Admin upload page
    ├── about.html         # About page
    └── login.html         # Admin login page
```

<br/>

## ⚙️ Environment Variables

Create a `.env` file in the project root (never commit this to GitHub):

```env
DATABASE_URL=postgresql://postgres:PASSWORD@host:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_public_key
SUPABASE_BUCKET=question-papers
SECRET_KEY=your_secret_key
ADMIN_USER=admin
ADMIN_PASS=your_admin_password
```

<br/>

## 🚀 Local Development

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/pyq-portal.git
cd pyq-portal
```

**2. Create virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate       # Mac/Linux
venv\Scripts\activate          # Windows
```

**3. Install dependencies**
```bash
pip install -r requirements.txt
```

**4. Set up environment variables**
```bash
cp .env.example .env
# Fill in your values in .env
```

**5. Run the app**
```bash
python app.py
```

Open `http://localhost:10000` in your browser.

<br/>

## 🗄️ Database Setup

This project uses **Supabase PostgreSQL**. Tables are created automatically on first run via `init_db()`.

**Manual setup (if needed) — run in Supabase SQL Editor:**

```sql
CREATE TABLE subjects (
    subject_id SERIAL PRIMARY KEY,
    subject_name VARCHAR(255) NOT NULL,
    semester INTEGER
);

CREATE TABLE question_papers (
    paper_id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(subject_id),
    year INTEGER,
    file_name VARCHAR(255),
    exam_type VARCHAR(100),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_url TEXT,
    public_id TEXT
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'admin'
);
```

**Enable Supabase Storage policies:**
```sql
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'question-papers');

CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'question-papers');
```

<br/>

## ☁️ Deployment (Render)

**1.** Push your code to GitHub

**2.** Create a new Web Service on [render.com](https://render.com)

**3.** Connect your GitHub repository

**4.** Set these in Render → Environment:
```
DATABASE_URL, SUPABASE_URL, SUPABASE_KEY,
SUPABASE_BUCKET, SECRET_KEY, ADMIN_USER, ADMIN_PASS
```

**5.** Set Start Command:
```
gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120 --keep-alive 5
```

**6.** Deploy — your portal will be live at your Render URL!

> 💡 **Tip:** Use [UptimeRobot](https://uptimerobot.com) (free) to ping your site every 5 minutes and prevent Render free tier from sleeping.

<br/>

## 📋 Admin Guide

**Login:** Go to `/login` and enter your admin credentials.

**Upload a paper:**
1. Login as admin
2. Click **Upload** in the navigation
3. Select subject, year, semester, exam type
4. Upload PDF file (max 10MB)
5. Click **Upload Paper**

**Change admin password:**
```python
from werkzeug.security import generate_password_hash
print(generate_password_hash('YourNewPassword'))
```
Run this locally, copy the hash, then update in Supabase:
```sql
UPDATE users SET password_hash = 'YOUR_HASH' WHERE username = 'admin';
```

<br/>

## 👨‍💻 Developers

This portal was built by two **BCA 3rd Year students** from Marian College Kuttikkanam — as a real-world project to help their juniors study smarter.

<table>
  <tr>
    <td align="center">
      <strong>Muhammed Sinan M</strong><br/>
      Full Stack Developer & Architect<br/>
      <sub>Flask · Python · PostgreSQL · Supabase · HTML/CSS</sub><br/>
      <sub>Designed and built the entire backend system, database architecture, storage integration and deployment</sub>
    </td>
    <td align="center">
      <strong>Daniel George VM</strong><br/>
      Frontend Developer & UI Designer<br/>
      <sub>JavaScript · CSS · UI Design · UX · Figma</sub><br/>
      <sub>Crafted the user experience and visual design — making the portal intuitive and beautiful across all devices</sub>
    </td>
  </tr>
</table>

> 📍 **Marian College Kuttikkanam** (Autonomous) · BCA Department · Kerala, India · Batch 2023–2026

<br/>

## 🎯 Why We Built This

As BCA students ourselves, we experienced the frustration firsthand — previous year question papers were **scattered, hard to find, and unavailable** exactly when we needed them most.

We built PYQ Portal to change that. A clean, fast, and permanently free archive — so that every junior student at Marian College has one less thing to worry about before exams.

> *"We believe every student deserves access to quality study resources — without barriers, without cost."*

<br/>

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

<br/>

## 🙏 Acknowledgements

- **Marian College Kuttikkanam** — for being an institution that encourages students to build real things
- **Supabase** — for the generous free tier that makes this project possible
- **Render** — for free hosting that keeps the portal always alive
- **All BCA seniors** — who uploaded their papers to help future students

<br/>

---

<p align="center">
  Made with ❤️ by BCA Students · Marian College Kuttikkanam · 2026
</p>

<p align="center">
  <a href="https://pyqportal.app">🌐 Live Site</a>
</p>
