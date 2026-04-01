const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const cors = require("cors");

const app = express();
const db = new sqlite3.Database("./database.db");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const upload = multer({ dest: "uploads/" });

// таблица заявок
db.run(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    system_type TEXT,
    description TEXT,
    photo TEXT,
    status TEXT DEFAULT 'Новая',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// таблица комментариев
db.run(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// создать заявку
app.post("/api/requests", upload.single("photo"), (req, res) => {
  const { school_id, system_type, description } = req.body;
  const photo = req.file ? req.file.filename : null;

  db.run(
    `INSERT INTO requests (school_id, system_type, description, photo) VALUES (?, ?, ?, ?)`,
    [school_id, system_type, description, photo],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

// получить заявки
app.get("/api/requests/:school_id", (req, res) => {
  db.all(
    `SELECT * FROM requests WHERE school_id = ? ORDER BY created_at DESC`,
    [req.params.school_id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// смена статуса
app.put("/api/status/:id", (req, res) => {
  const { status } = req.body;

  db.run(
    `UPDATE requests SET status = ? WHERE id = ?`,
    [status, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// удалить заявку (только архив)
app.delete("/api/requests/:id", (req, res) => {
  const id = req.params.id;

  db.get(`SELECT status FROM requests WHERE id = ?`, [id], (err, row) => {
    if (!row || row.status !== "Архив") {
      return res.status(400).json({ error: "Можно удалить только архив" });
    }

    db.run(`DELETE FROM requests WHERE id = ?`, [id], function (err) {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    });
  });
});

// получить комментарии
app.get("/api/comments/:request_id", (req, res) => {
  db.all(
    `SELECT * FROM comments WHERE request_id = ? ORDER BY created_at ASC`,
    [req.params.request_id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

// добавить комментарий
app.post("/api/comments", (req, res) => {
  const { request_id, text } = req.body;

  db.run(
    `INSERT INTO comments (request_id, text) VALUES (?, ?)`,
    [request_id, text],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

app.listen(3000, () => console.log("Server started on port 3000"));