import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import webPush from "web-push";
import cron from "node-cron";
import fs from "fs-extra";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ File to store scheduled tasks persistently
const DATA_FILE = "./scheduledTasks.json";

// -------------------- Load persisted tasks --------------------
let scheduledTasks = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    scheduledTasks = JSON.parse(fs.readFileSync(DATA_FILE));
    console.log(`💾 Loaded ${scheduledTasks.length} scheduled tasks from file`);
  }
} catch (err) {
  console.error("Failed to load scheduledTasks.json:", err);
}

const saveTasks = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(scheduledTasks, null, 2));
    console.log("💾 scheduledTasks.json updated");
  } catch (err) {
    console.error("Failed to save scheduledTasks.json:", err);
  }
};

// -------------------- VAPID Configuration --------------------
webPush.setVapidDetails(
  "mailto:you@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// -------------------- Data Structures --------------------
let subscriptions = [];

// -------------------- Routes --------------------

// ✅ Subscribe a user
app.post("/push/subscribe", (req, res) => {
  const sub = req.body;
  const exists = subscriptions.some((s) => s.endpoint === sub.endpoint);
  if (!exists) subscriptions.push(sub);

  console.log("🟢 New subscriber added:", sub.endpoint);
  res.status(201).json({ message: "Subscribed successfully!" });
});

// ✅ Immediate push (manual / instant trigger)
app.post("/push/send", async (req, res) => {
  const payload = JSON.stringify(req.body);
  try {
    await Promise.all(
      subscriptions.map((sub) =>
        webPush.sendNotification(sub, payload, { TTL: 60, urgency: "high" })
      )
    );
    console.log("✅ Immediate push sent:", req.body.title);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Push error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Schedule future task
app.post("/push/schedule", (req, res) => {
  const { subscription, title, body, time, taskId } = req.body;

  if (!subscription || !time || !taskId)
    return res.status(400).json({ error: "Missing fields" });

  const taskTime = new Date(time);
  const now = new Date();
  const diff = taskTime - now;

  // Remove any existing task with same ID (reschedule logic)
  scheduledTasks = scheduledTasks.filter((t) => t.id !== taskId);

  // If task is within 5 minutes, send immediately
  if (diff <= 5 * 60 * 1000 && diff > 0) {
    (async () => {
      try {
        await webPush.sendNotification(
          subscription,
          JSON.stringify({ title, body }),
          { TTL: 60, urgency: "high" }
        );
        console.log(`⚡ Sent immediate reminder: ${title}`);
      } catch (err) {
        console.error("Push error:", err);
      }
    })();
    return res.status(200).json({ message: "Sent immediately" });
  }

  // Otherwise, schedule for future
  scheduledTasks.push({ id: taskId, subscription, title, body, time: taskTime });
  saveTasks();

  console.log(`🕒 Task scheduled: ${title} → ${taskTime.toLocaleString()}`);
  res.status(201).json({ message: "Task scheduled" });
});

// ✅ Cancel scheduled task
app.post("/push/cancel", (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: "Missing taskId" });

  const before = scheduledTasks.length;
  scheduledTasks = scheduledTasks.filter((t) => t.id !== taskId);
  const after = scheduledTasks.length;

  saveTasks();
  console.log(`🗑️ Canceled ${before - after} scheduled task(s) for ID: ${taskId}`);
  res.json({ success: true, removed: before - after });
});

// ✅ Health check endpoint
app.get("/", (req, res) => {
  res.send("✅ Weighted To-Do Push Server running successfully 🚀");
});

// -------------------- CRON JOB --------------------
// Runs every minute to send due tasks
cron.schedule("* * * * *", async () => {
  const now = new Date();
  const remaining = [];

  for (const task of scheduledTasks) {
    const taskTime = new Date(task.time);
    const diff = taskTime - now;

    if (diff <= 60 * 1000 && diff >= -30 * 1000) {
      try {
        await webPush.sendNotification(
          task.subscription,
          JSON.stringify({ title: task.title, body: task.body }),
          { TTL: 60, urgency: "high" }
        );
        console.log("✅ Reminder sent:", task.title);
      } catch (err) {
        console.error("❌ Failed to send scheduled reminder:", err);
      }
    } else if (diff > 60 * 1000) {
      remaining.push(task);
    }
  }

  scheduledTasks = remaining;
  saveTasks();
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Push server running on port ${PORT}`)
);
