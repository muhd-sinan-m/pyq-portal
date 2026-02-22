from flask import Flask, render_template, request, redirect, url_for, send_from_directory, flash, session
import os
import re
import time
import mysql.connector
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from supabase import create_client
import uuid


app = Flask(__name__)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
app.secret_key = os.environ.get('SECRET_KEY', 'dev_secret_key')
db = mysql.connector.connect(
    host=os.environ.get("DB_HOST"),
    user=os.environ.get("DB_USER"),
    password=os.environ.get("DB_PASSWORD"),
    database=os.environ.get("DB_NAME"),
    port=int(os.environ.get("DB_PORT", 3306))
)
cursor = db.cursor()

# ensure user table exists
cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
)
db.commit()

# --------------------------------------------------
# user authentication helpers
# --------------------------------------------------

def get_user_by_username(username):
    cursor.execute("SELECT user_id, username, password_hash, role FROM users WHERE username = %s", (username,))
    return cursor.fetchone()


def create_user(username, password, role="user"):
    """Helper to create a new user; password will be hashed."""
    hash_val = generate_password_hash(password)
    with db.cursor() as cur:
        cur.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
            (username, hash_val, role),
        )
    db.commit()

# create a default administrator account if the table is empty
cursor.execute("SELECT COUNT(*) FROM users")
count = cursor.fetchone()[0] or 0
if count == 0:
    default_username = os.environ.get('ADMIN_USER', 'admin')
    default_password = os.environ.get('ADMIN_PASS', 'admin123')
    create_user(default_username, default_password, role='admin')
    print(f"created default admin account {default_username}/{default_password}")


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

# --------------------------------------------------

@app.route("/")
def home():
    try:
        cursor.execute("SELECT COUNT(*) FROM question_papers")
        paper_count = cursor.fetchone()[0] or 0
    except Exception:
        paper_count = 0
    return render_template("index.html", paper_count=paper_count)


ALLOWED_EXTENSIONS = {"pdf"}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def format_file_size(bytes_size):
    """Format bytes as human-readable size (e.g. 1.5 MB)."""
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
    """Return list of dicts: subject_id, subject_name, semester (if column exists)."""
    try:
        cursor.execute(
            "SELECT subject_id, subject_name, semester FROM subjects ORDER BY semester, subject_name"
        )
        rows = cursor.fetchall()
        return [{"subject_id": r[0], "subject_name": r[1], "semester": r[2]} for r in rows]
    except Exception:
        cursor.execute("SELECT subject_id, subject_name FROM subjects ORDER BY subject_name")
        rows = cursor.fetchall()
        return [{"subject_id": r[0], "subject_name": r[1], "semester": None} for r in rows]


# -------- authentication helpers --------

def login_required(f):
    """Decorator to ensure a user is logged in; redirects to login page if not."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator that allows only users with role 'admin'."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get('role') != 'admin':
            flash('Administrator access required to view that page.')
            return redirect(url_for('home'))
        return f(*args, **kwargs)
    return decorated


@app.route("/upload", methods=["GET", "POST"])
@login_required
@admin_required
def upload_page():
    if request.method == "POST":
        # FIX 1: Removed unused file_path_abs variable
        try:
            # Subject must be from subjects table (dropdown sends subject_id)
            subject_raw = request.form.get("subject_id")
            if not subject_raw or subject_raw.strip() == "":
                return render_template("upload.html", error="Subject is required", subjects=get_subjects())
            try:
                subject_id = int(subject_raw)
            except ValueError:
                return render_template("upload.html", error="Invalid subject", subjects=get_subjects())

            # Ensure subject exists in subjects table
            cursor.execute("SELECT subject_id, subject_name FROM subjects WHERE subject_id = %s", (subject_id,))
            row = cursor.fetchone()
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

            file = request.files.get("file")
            if not file or not file.filename:
                return render_template("upload.html", error="No file provided", subjects=get_subjects())
            if not allowed_file(file.filename):
                return render_template("upload.html", error="Only PDF files are allowed", subjects=get_subjects())

            exam_type = request.form.get("examType") or request.form.get("exam_type") or ""

            # FIX 1: Supabase upload block is now correctly indented inside try:
            file_ext = file.filename.rsplit(".", 1)[1].lower()
            unique_name = f"{subject_id}/{year_int}/{uuid.uuid4()}.{file_ext}"

            supabase.storage.from_(SUPABASE_BUCKET).upload(
                unique_name,
                file.read(),
                file_options={"content-type": "application/pdf"}
            )

            file_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(unique_name)

            # FIX 1: DB insert block is now correctly indented inside try:
            with db.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO question_papers
                    (subject_id, year, file_name, file_url, exam_type)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (subject_id, year_int, file.filename, file_url, exam_type),
                )
            db.commit()

            flash("Your question paper has been uploaded successfully.")
            return redirect(url_for("upload_page"))

        except Exception as e:
            db.rollback()
            app.logger.exception("Upload failed")
            # FIX 1: Removed useless file_path_abs local file cleanup (Supabase handles storage)
            return render_template("upload.html", error=str(e), subjects=get_subjects())

    return render_template("upload.html", subjects=get_subjects())


@app.route("/papers")
def view_papers():
    """
    List available question papers using the fixed question_papers schema:
    paper_id, subject_id, year, file_name, file_url, upload_date.
    Semester comes from the subjects table.
    """
    papers = []
    cursor.execute(
        """
        SELECT s.subject_name, s.semester, q.year, q.file_url, q.exam_type
        FROM question_papers q
        JOIN subjects s ON q.subject_id = s.subject_id
        ORDER BY q.year DESC, s.subject_name
        """
    )
    rows = cursor.fetchall()

    # FIX 2: Corrected indentation on the for loop (was indented with extra spaces)
    for subject_name, semester, year, file_url, exam_type in rows:
        papers.append(
            {
                "subject": subject_name,
                "year": year,
                "semester": semester,
                "department": "",
                "examType": exam_type or "—",
                "file_url": file_url,
            }
        )

    # Filters: load all subjects from subjects table (not only those with papers)
    subjects = get_subjects()
    years = sorted({p["year"] for p in papers}, reverse=True) if papers else []

    return render_template("view.html", papers=papers, subjects=subjects, years=years)


# FIX 3: REMOVED /uploads/<path:filename> route entirely
# Supabase serves files directly via HTTPS public URLs — no local serving needed.


if __name__ == "__main__":
    app.run(debug=True)
