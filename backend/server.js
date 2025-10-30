import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import webPush from "web-push";
import fs from "fs-extra";
import schedule from "node-schedule";

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
  console.error("❌ Failed to load scheduledTasks.json:", err);
}

// Helper: Save tasks to file
const saveTasks = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(scheduledTasks, null, 2));
    console.log("💾 scheduledTasks.json updated");
  } catch (err) {
    console.error("❌ Failed to save scheduledTasks.json:", err);
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

// ✅ Send push immediately (manual test)
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

// ✅ Schedule future task (main logic)
app.post("/push/schedule", (req, res) => {
  const { subscription, title, body, time, taskId } = req.body;
  if (!subscription || !time || !taskId)
    return res.status(400).json({ error: "Missing fields" });

  const taskTime = new Date(time);
  const now = new Date();
  const diff = taskTime - now;

  // Remove old task if rescheduling
  scheduledTasks = scheduledTasks.filter((t) => t.id !== taskId);

  // 🕒 Skip if past time
  if (diff <= 0)
    return res.status(400).json({ error: "Cannot schedule past tasks" });

  // Save task and persist
  const newTask = { id: taskId, subscription, title, body, time: taskTime };
  scheduledTasks.push(newTask);
  saveTasks();

  // Register with node-schedule
  registerTaskJob(newTask);

  console.log(`📅 Scheduled task: "${title}" → ${taskTime.toLocaleString()}`);
  res.status(201).json({ message: "Task scheduled" });
});

// ✅ Cancel a scheduled task
app.post("/push/cancel", (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: "Missing taskId" });

  const before = scheduledTasks.length;
  scheduledTasks = scheduledTasks.filter((t) => t.id !== taskId);
  saveTasks();

  // Also cancel in node-schedule
  const existingJob = schedule.scheduledJobs[taskId];
  if (existingJob) {
    existingJob.cancel();
    console.log(`🗑️ Canceled scheduled job: ${taskId}`);
  }

  res.json({ success: true, removed: before - scheduledTasks.length });
});

// ✅ Health check endpoint
app.get("/", (req, res) => {
  res.send("✅ Weighted To-Do Push Server running successfully 🚀");
});

// -------------------- Node-Schedule Setup --------------------

// Register a single task job
const registerTaskJob = (task) => {
  const taskTime = new Date(task.time);
  const now = new Date();

  if (taskTime <= now) {
    console.log(`⚠️ Skipped expired task: ${task.title}`);
    return;
  }

  schedule.scheduleJob(task.id, taskTime, async () => {
    try {
      await webPush.sendNotification(
        task.subscription,
        JSON.stringify({ title: task.title, body: task.body }),
        { TTL: 60, urgency: "high" }
      );
      console.log(`✅ Sent reminder "${task.title}" at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error(`❌ Failed to send "${task.title}":`, err);
    }

    // Remove task after sending
    scheduledTasks = scheduledTasks.filter((t) => t.id !== task.id);
    saveTasks();
  });

  console.log(`⏰ Job registered: "${task.title}" at ${taskTime.toLocaleString()}`);
};

// Re-register all tasks on startup
const registerAllScheduledJobs = () => {
  console.log(`🕒 Re-registering ${scheduledTasks.length} tasks...`);
  for (const task of scheduledTasks) {
    registerTaskJob(task);
  }
};

// Call once when server starts
registerAllScheduledJobs();

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Push server running on port ${PORT}`));
