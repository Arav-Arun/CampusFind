const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const { sequelize } = require("./db");
const { errorHandler } = require("./middleware");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/items", require("./routes/items"));
app.use("/api/claims", require("./routes/claims"));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

if (!process.env.VERCEL) {
  const port = process.env.PORT || 5001;
  sequelize
    .authenticate()
    .then(() => app.listen(port, () => console.log(`API running on http://localhost:${port}`)))
    .catch((err) => {
      console.error("Database connection failed:", err.message);
      process.exit(1);
    });
}

module.exports = app;
