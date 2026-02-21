-- Add semester to subjects if your table doesn't have it:
-- ALTER TABLE subjects ADD COLUMN semester INT NULL;

INSERT INTO subjects (subject_name, semester) VALUES
('Web Technology', 2),
('Operating Systems', 2),
('Data Structures', 2),
('Mathematics', 2),
('Python', 3),
('DBMS', 3),
('Design and Algorithm', 3),
('Software Engineering', 3);
