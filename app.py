from flask import Flask, render_template, request, redirect, url_for, flash, session
import os
import mysql.connector
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from supabase import create_client
import uuid


app = Flask(__name__)

# ---------- Supabase ----------
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set as environment variables")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app.secret_key = os.environ.get('SECRET_KEY', 'dev_secret_key')


# ---------- DB helpers ----------

def get_db():
    """Return a fresh MySQL connection every time."""
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST"),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
        database=os.environ.get("DB_NAME"),
        port=int(os.environ.get("DB_PORT", 3306))
    )


def init_db():
    """Create tables and default admin on first run."""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'user'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        conn.commit()

        cur.execute("SELECT COUNT(*) FROM users")
        count = cur.fetchone()[0] or 0
        if count == 0:
            default_username = os.environ.get('ADMIN_USER', 'admin')
            default_password = os.environ.get('ADMIN_PASS', 'admin123')
            hash_val = generate_password_hash(default_password)
            cur.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
                (default_username, hash_val, 'admin')
            )
            conn.commit()
            print(f"Created default admin account: {default_username}")
    finally:
        cur.close()
        conn.close()


init_db()


# ---------- Auth helpers ----------

def get_user_by_username(username):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT user_id, username, password_hash, role FROM users WHERE username = %s",
            (username,)
        )
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


def create_user(username, password, role="user"):
    hash_val = generate_password_hash(password)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
            (username, hash_val, role)
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get('role') != 'admin':
            flash('Administrator access required to view that page.')
            return redirect(url_for('home'))
        return f(*args, **kwargs)
    return decorated


# ---------- Utility ----------

ALLOWED_EXTENSIONS = {"pdf"}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def format_file_size(bytes_size):
    if bytes_size is None or bytes_size == 0:
        return "0 B"
    for unit in ("B", "KB", "MB", "GB"):
        if bytes_size < 1024:
            n = round(bytes_size, 1)
            s = str(int(n)) if n == int(n) else f"{n:.1f}"
            return f"{s} {unit}"
        bytes_size /= 1024
    return f"{round(bytes_size, 1)} TB"


def get_subjects():
    """Return fresh list of subjects from DB every time — always up to date."""
    conn = get_db()
    cur = conn.cursor()
    try:
        try:
            cur.execute(
                "SELECT subject_id, subject_name, semester FROM subjects ORDER BY semester, subject_name"
            )
            rows = cur.fetchall()
            return [{"subject_id": r[0], "subject_name": r[1], "semester": r[2]} for r in rows]
        except Exception:
            cur.execute(
                "SELECT subject_id, subject_name FROM subjects ORDER BY subject_name"
            )
            rows = cur.fetchall()
            return [{"subject_id": r[0], "subject_name": r[1], "semester": None} for r in rows]
    finally:
        cur.close()
        conn.close()


# ---------- Routes ----------

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if not username or not password:
            error = "Username and password are required"
        else:
            row = get_user_by_username(username)
            if row and check_password_hash(row[2], password):
                session.clear()
                session["user_id"] = row[0]
                session["username"] = row[1]
                session["role"] = row[3]
                next_page = request.args.get("next")
                return redirect(next_page or url_for("home"))
            error = "Invalid username or password"
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))


@app.route("/")
def home():
    paper_count = 0
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM question_papers")
        paper_count = cur.fetchone()[0] or 0
    except Exception:
        pass
    finally:
        cur.close()
        conn.close()
    return render_template("index.html", paper_count=paper_count)


@app.route("/upload", methods=["GET", "POST"])
@login_required
@admin_required
def upload_page():
    if request.method == "POST":
        conn = get_db()
        cur = conn.cursor()
        try:
            # Subject
            subject_raw = request.form.get("subject_id")
            if not subject_raw or subject_raw.strip() == "":
                return render_template("upload.html", error="Subject is required", subjects=get_subjects())
            try:
                subject_id = int(subject_raw)
            except ValueError:
                return render_template("upload.html", error="Invalid subject", subjects=get_subjects())

            cur.execute(
                "SELECT subject_id, subject_name FROM subjects WHERE subject_id = %s",
                (subject_id,)
            )
            row = cur.fetchone()
            if not row:
                return render_template("upload.html", error="Subject not found. Please choose from the list.", subjects=get_subjects())
            subject_id, subject_name = row[0], row[1]

            # Year
            year = request.form.get("year")
            try:
                if not year or not str(year).strip():
                    raise ValueError("Year is required")
                year_int = int(str(year).split("-", 1)[0].strip()) if "-" in str(year) else int(year)
            except (ValueError, TypeError) as exc:
                return render_template("upload.html", error=f"Invalid year: {exc}", subjects=get_subjects())

            # File
            file = request.files.get("file")
            if not file or not file.filename:
                return render_template("upload.html", error="No file provided", subjects=get_subjects())
            if not allowed_file(file.filename):
                return render_template("upload.html", error="Only PDF files are allowed", subjects=get_subjects())

            exam_type = request.form.get("examType") or request.form.get("exam_type") or ""

            # Upload to Supabase Storage
            file_ext = file.filename.rsplit(".", 1)[1].lower()
            unique_name = f"{subject_id}/{year_int}/{uuid.uuid4()}.{file_ext}"

            supabase.storage.from_(SUPABASE_BUCKET).upload(
                unique_name,
                file.read(),
                file_options={"content-type": "application/pdf"}
            )

            file_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(unique_name)

            # Save record to MySQL
            cur.execute(
                """
                INSERT INTO question_papers
                (subject_id, year, file_name, file_url, exam_type)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (subject_id, year_int, file.filename, file_url, exam_type),
            )
            conn.commit()

            flash("Your question paper has been uploaded successfully.")
            return redirect(url_for("upload_page"))

        except Exception as e:
            conn.rollback()
            app.logger.exception("Upload failed")
            return render_template("upload.html", error=str(e), subjects=get_subjects())
        finally:
            cur.close()
            conn.close()

    return render_template("upload.html", subjects=get_subjects())


@app.route("/papers")
def view_papers():
    conn = get_db()
    cur = conn.cursor()
    papers = []
    try:
        cur.execute(
            """
            SELECT s.subject_name, s.semester, q.year, q.file_url, q.exam_type
            FROM question_papers q
            JOIN subjects s ON q.subject_id = s.subject_id
            ORDER BY q.year DESC, s.subject_name
            """
        )
        rows = cur.fetchall()
        for subject_name, semester, year, file_url, exam_type in rows:
            papers.append({
                "subject": subject_name,
                "year": year,
                "semester": semester,
                "department": "",
                "examType": exam_type or "—",
                "file_url": file_url,
            })
        subjects = get_subjects()
        years = sorted({p["year"] for p in papers}, reverse=True) if papers else []
        return render_template("view.html", papers=papers, subjects=subjects, years=years)
    except Exception as e:
        app.logger.exception("Failed to load papers")
        return f"Database error: {e}", 500
    finally:
        cur.close()
        conn.close()
@app.route("/about")
def about():
    return render_template("about.html")
    
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)), debug=False)
