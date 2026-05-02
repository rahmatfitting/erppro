const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_db',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  });
  
  console.log("Connected to DB, creating project tables...");

  // 1. projects
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      project_code VARCHAR(50) NOT NULL UNIQUE,
      project_name VARCHAR(255) NOT NULL,
      client_id INT NULL,
      location VARCHAR(255) NULL,
      start_date DATE NULL,
      end_date DATE NULL,
      status VARCHAR(50) DEFAULT 'planning', /* planning, ongoing, finished */
      budget_total DECIMAL(15,2) DEFAULT 0.00,
      progress_percentage DECIMAL(5,2) DEFAULT 0.00,
      dibuat_oleh VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // 2. project_timelines
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS project_timelines (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      title VARCHAR(255) NOT NULL, /* Pondasi, Struktur, dll */
      description TEXT NULL,
      start_date DATE NULL,
      end_date DATE NULL,
      progress_percentage DECIMAL(5,2) DEFAULT 0.00,
      status VARCHAR(50) DEFAULT 'pending', /* pending, ongoing, done */
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_project (project_id)
      -- FOREIGN KEY (project_id) REFERENCES projects(nomor) ON DELETE CASCADE
    )
  `);

  // 3. progress_reports
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS progress_reports (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      timeline_id INT NULL,
      report_date DATE NOT NULL,
      progress_percentage DECIMAL(5,2) DEFAULT 0.00,
      description TEXT NULL,
      weather VARCHAR(100) NULL,
      issues TEXT NULL,
      created_by VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_project (project_id),
      INDEX idx_timeline (timeline_id)
      -- FOREIGN KEY (project_id) REFERENCES projects(nomor) ON DELETE CASCADE,
      -- FOREIGN KEY (timeline_id) REFERENCES project_timelines(nomor) ON DELETE CASCADE
    )
  `);

  // 4. field_documentations
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS field_documentations (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      progress_report_id INT NULL,
      file_url VARCHAR(500) NOT NULL,
      file_type VARCHAR(50) DEFAULT 'image',
      description TEXT NULL,
      uploaded_by VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_project (project_id),
      INDEX idx_report (progress_report_id)
      -- FOREIGN KEY (project_id) REFERENCES projects(nomor) ON DELETE CASCADE,
      -- FOREIGN KEY (progress_report_id) REFERENCES progress_reports(nomor) ON DELETE CASCADE
    )
  `);

  // 5. subcontractors
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS subcontractors (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NULL,
      specialization VARCHAR(150) NULL,
      address TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // 6. project_subcontractors
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS project_subcontractors (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      subcontractor_id INT NOT NULL,
      role VARCHAR(150) NULL,
      start_date DATE NULL,
      end_date DATE NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_project (project_id),
      INDEX idx_subcon (subcontractor_id)
      -- FOREIGN KEY (project_id) REFERENCES projects(nomor) ON DELETE CASCADE,
      -- FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(nomor) ON DELETE CASCADE
    )
  `);

  console.log("Project tables successfully created.");
  connection.end();
}

run().catch(console.error);
