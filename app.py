from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import os
import psycopg2
import time
from psycopg2 import pool
from supabase import create_client
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import uuid
import requests
from google import genai
from google.genai import types
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev_secret_key')
Compress(app)

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri="memory://"
)
request_log = {}
# ---------- Supabase ----------
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------- DB (Connection Pool) ----------
db_pool = pool.SimpleConnectionPool(1, 10, os.environ.get("DATABASE_URL"))

def get_db():
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        return conn
    except:
        return psycopg2.connect(os.environ.get("DATABASE_URL"))

def return_db(conn):
    db_pool.putconn(conn)

def init_db():
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'user'
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS subjects (
                subject_id SERIAL PRIMARY KEY,
                subject_name VARCHAR(255) NOT NULL,
                semester INTEGER
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS question_papers (
                paper_id SERIAL PRIMARY KEY,
                subject_id INTEGER REFERENCES subjects(subject_id),
                year INTEGER,
                file_name VARCHAR(255),
                file_path VARCHAR(255),
                exam_type VARCHAR(100),
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                file_url TEXT,
                public_id TEXT,
                ai_analysis TEXT
            );
        """)
        conn.commit()

        cur.execute("SELECT COUNT(*) FROM users")
        count = cur.fetchone()[0]
        if count == 0:
            default_username = os.environ.get('ADMIN_USER', 'admin')
            default_password = os.environ.get('ADMIN_PASS', 'admin123')
            hash_val = generate_password_hash(default_password)
            cur.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
                (default_username, hash_val, 'admin')
            )
            conn.commit()
            print(f"Created default admin: {default_username}")
    finally:
        cur.close()
        return_db(conn)

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
        return_db(conn)

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
            flash('Administrator access required.')
            return redirect(url_for('home'))
        return f(*args, **kwargs)
    return decorated

# ---------- Utility ----------

ALLOWED_EXTENSIONS = {"pdf"}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def analyze_with_gemini(pdf_url, subject_name):
    import tempfile, os as _os

    r = requests.get(pdf_url, timeout=15)
    r.raise_for_status()

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        tmp.write(r.content)
        tmp_path = tmp.name

    prompt = f"""You are an exam preparation assistant for {subject_name}.
Analyze this previous year question paper and predict the most likely questions for the next exam.
Respond with:
1. Top 10 predicted questions (numbered)
2. Key topics to focus on (bullet points)
3. Question pattern observations (2-3 lines)"""

    try:
        # Upload PDF
        with open(tmp_path, 'rb') as f:
            uploaded = client.files.upload(
                file=f,
                config=types.UploadFileConfig(mime_type='application/pdf')
            )

        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=[uploaded, prompt]
        )

        # Cleanup
        try:
            client.files.delete(name=uploaded.name)
        except:
            pass

        return response.text
    finally:
        _os.unlink(tmp_path)

def get_subjects():
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT subject_id, subject_name, semester FROM subjects ORDER BY semester, subject_name"
        )
        rows = cur.fetchall()
        return [{"subject_id": r[0], "subject_name": r[1], "semester": r[2]} for r in rows]
    finally:
        cur.close()
        return_db(conn)

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
        return_db(conn)
    return render_template("index.html", paper_count=paper_count)

@app.route("/upload", methods=["GET", "POST"])
@login_required
@admin_required
def upload_page():
    if request.method == "POST":
        conn = get_db()
        cur = conn.cursor()
        try:
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
                return render_template("upload.html", error="Subject not found.", subjects=get_subjects())
            subject_id, subject_name = row[0], row[1]

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

            unique_name = f"{subject_id}/{year_int}/{uuid.uuid4()}.pdf"
            supabase.storage.from_(SUPABASE_BUCKET).upload(
                unique_name,
                file.read(),
                file_options={"content-type": "application/pdf"}
            )
            file_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(unique_name)

            original_filename = secure_filename(file.filename)
            cur.execute(
                """
                INSERT INTO question_papers
                (subject_id, year, file_name, file_url, exam_type, public_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING paper_id
                """,
                (subject_id, year_int, original_filename, file_url, exam_type, unique_name),
            )
            conn.commit()

            flash("Question paper uploaded successfully.")
            return redirect(url_for("upload_page"))

        except Exception as e:
            conn.rollback()
            app.logger.exception("Upload failed")
            return render_template("upload.html", error=str(e), subjects=get_subjects())
        finally:
            cur.close()
            return_db(conn)

    return render_template("upload.html", subjects=get_subjects())

@app.route("/papers")
def view_papers():
    conn = get_db()
    cur = conn.cursor()
    papers = []
    try:
        cur.execute(
            """
            SELECT s.subject_name, s.semester, q.year, q.file_url, q.exam_type, q.paper_id,
                   CASE WHEN q.ai_analysis IS NOT NULL THEN true ELSE false END as is_analysed
            FROM question_papers q
            JOIN subjects s ON q.subject_id = s.subject_id
            ORDER BY q.year DESC, s.subject_name
            """
        )
        rows = cur.fetchall()
        for subject_name, semester, year, file_url, exam_type, paper_id, is_analysed in rows:
            papers.append({
                "subject": subject_name,
                "year": year,
                "semester": semester,
                "department": "",
                "examType": exam_type or "—",
                "file_url": file_url,
                "paper_id": paper_id,
                "is_analysed": is_analysed
            })
        subjects = get_subjects()
        years = sorted({p["year"] for p in papers}, reverse=True) if papers else []
        return render_template("view.html", papers=papers, subjects=subjects, years=years)
    except Exception as e:
        app.logger.exception("Failed to load papers")
        return f"Database error: {e}", 500
    finally:
        cur.close()
        return_db(conn)

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/analyze/<int:paper_id>")
def analyze_paper(paper_id):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT q.file_url, q.exam_type, q.year, s.subject_name, q.ai_analysis
            FROM question_papers q
            JOIN subjects s ON q.subject_id = s.subject_id
            WHERE q.paper_id = %s
        """, (paper_id,))
        row = cur.fetchone()

        if not row:
            return jsonify({"error": "Paper not found"}), 404

        file_url, exam_type, year, subject_name, ai_analysis = row

        # ✅ 1. RETURN CACHED RESULT (NO LIMIT)
        if ai_analysis:
            return jsonify({
                "subject": subject_name,
                "year": year,
                "exam_type": exam_type,
                "predictions": ai_analysis,
                "cached": True
            })

        # 🔒 2. RATE LIMIT (ONLY FOR NEW ANALYSIS)
        user_ip = request.remote_addr
        now = time.time()

        request_log.setdefault(user_ip, [])

        # keep only last 1 hour (3600 seconds)
        request_log[user_ip] = [t for t in request_log[user_ip] if now - t < 3600]

        if len(request_log[user_ip]) >= 3:
            return jsonify({
                "error": "Too many requests. You can analyse only 3 papers per hour. Please try later."
            }), 429

        # record this request
        request_log[user_ip].append(now)

        # 🤖 3. CALL GEMINI
        try:
            predictions = analyze_with_gemini(file_url, subject_name)
        except Exception as e:
            err = str(e).lower()

            if "quota" in err or "rate" in err or "429" in err or "resource_exhausted" in err:
                return jsonify({
                    "error": "Daily analysis limit reached. Please try again tomorrow. 😊"
                }), 429

            if "503" in err or "unavailable" in err or "high demand" in err:
                return jsonify({
                    "error": "AI servers are busy right now. Please try again in a few minutes. 🙏"
                }), 503

            app.logger.exception("Gemini analysis failed")
            return jsonify({
                "error": "Analysis failed. Please try again later."
            }), 500

        # 💾 4. SAVE RESULT (CACHE)
        try:
            cur.execute(
                "UPDATE question_papers SET ai_analysis = %s WHERE paper_id = %s",
                (predictions, paper_id)
            )
            conn.commit()
        except Exception:
            app.logger.exception("Failed to cache analysis")
            conn.rollback()

        # 📤 5. RETURN RESULT
        return jsonify({
            "subject": subject_name,
            "year": year,
            "exam_type": exam_type,
            "predictions": predictions,
            "cached": False
        })

    except Exception:
        app.logger.exception("analyze_paper failed")
        return jsonify({
            "error": "Analysis failed. Please try again later."
        }), 500

    finally:
        cur.close()
        return_db(conn)

# ---------- Admin: refresh analysis ----------
@app.route("/analyze/<int:paper_id>/refresh")
@login_required
@admin_required
def refresh_analysis(paper_id):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE question_papers SET ai_analysis = NULL WHERE paper_id = %s",
            (paper_id,)
        )
        conn.commit()
        return jsonify({"message": "Cache cleared. Next analyse will regenerate."})
    finally:
        cur.close()
        return_db(conn)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)), debug=False)