import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import webPush from "web-push";
import cron from "node-cron";


dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Set VAPID keys
webPush.setVapidDetails(
  "mailto:you@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

let subscriptions = [];

// Store subscription
app.post("/push/subscribe", (req, res) => {
  const sub = req.body;
  subscriptions.push(sub);
  res.status(201).json({ message: "Subscribed successfully!" });
});

// Send push notification
app.post("/push/send", async (req, res) => {
  const payload = JSON.stringify(req.body);
  try {
    await Promise.all(
      subscriptions.map((sub) =>
        webPush.sendNotification(sub, payload, { TTL: 60, urgency: "high" })
      )
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Push error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Temporary in-memory task list (for demo)
let scheduledTasks = [];

// API to register a task reminder
app.post("/push/schedule", (req, res) => {
  const { subscription, title, body, time } = req.body;
  if (!subscription || !time) return res.status(400).json({ error: "Missing fields" });
  
  scheduledTasks.push({ subscription, title, body, time });
  res.status(201).json({ message: "Task scheduled" });
});

// Check every minute for due tasks
cron.schedule("* * * * *", async () => {
  const now = new Date();

  scheduledTasks = scheduledTasks.filter(async (task) => {
    const taskTime = new Date(task.time);
    const diff = taskTime - now;

    if (diff <= 60000 && diff >= 0) { // due within 1 minute
      try {
        await webPush.sendNotification(
          task.subscription,
          JSON.stringify({ title: task.title, body: task.body }),
          { TTL: 60, urgency: "high" }
        );
        console.log("✅ Task reminder sent:", task.title);
        return false; // remove after sending
      } catch (err) {
        console.error("Push error:", err);
        return false;
      }
    }

    return true;
  });
});


app.listen(4000, () => console.log("Push server running on port 4000"));
