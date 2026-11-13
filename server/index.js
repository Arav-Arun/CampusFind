const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const { sequelize } = require("./db");
const { errorHandler } = require("./middleware");

const app = express();

app.set("trust proxy", 1); // behind Vercel's proxy: needed for correct client IPs in rate limits
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" })); // uploads go through multer, so JSON bodies stay small

app.use("/api/auth", require("./routes/auth"));
app.use("/api/items", require("./routes/items"));
app.use("/api/claims", require("./routes/claims"));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

// On Vercel the app is exported as a function; locally we listen directly.
if (!process.env.VERCEL) {
  const port = process.env.PORT || 5001;
  sequelize
    .authenticate()
    .then(() => app.listen(port, () => console.log(`API listening on http://localhost:${port}`)))
    .catch((err) => {
      console.error("Database connection failed:", err.message);
      process.exit(1);
    });
}

module.exports = app;
