// CSC330 – HW2 - Tiago Freitas

const http = require("http");
const { URL } = require("url");

const availableTimes = {
  Monday:    ["9:00", "10:00", "11:00", "14:00", "15:00"],
  Tuesday:   ["9:00", "10:00", "11:00", "14:00", "15:00"],
  Wednesday: ["9:00", "10:00", "11:00", "14:00", "15:00"],
  Thursday:  ["9:00", "10:00", "11:00", "14:00", "15:00"],
  Friday:    ["9:00", "10:00", "11:00", "14:00", "15:00"],
};
const appointments = []; // { name, day, time }

// ----- Helpers -----
function send(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text + "\n");
}
function reqd(q, keys) {
  for (const k of keys) if (!q[k] || String(q[k]).trim() === "") return `Missing parameter: ${k}`;
  return null;
}
function validDay(d) { return Object.prototype.hasOwnProperty.call(availableTimes, d); }
const norm = (v) => String(v).trim();

// ----- Route handlers -----
function handleSchedule(q, res) {
  const err = reqd(q, ["name", "day", "time"]); if (err) return send(res, 400, err);
  const name = norm(q.name), day = norm(q.day), time = norm(q.time);
  if (!validDay(day)) return send(res, 400, "Invalid day");

  const idx = availableTimes[day].indexOf(time);
  if (idx !== -1) {
    availableTimes[day].splice(idx, 1);
    appointments.push({ name, day, time });
    return send(res, 200, "reserved");            
  }
  return send(res, 200, "not available");         
}

function handleCancel(q, res) {
  const err = reqd(q, ["name", "day", "time"]); if (err) return send(res, 400, err);
  const name = norm(q.name), day = norm(q.day), time = norm(q.time);
  if (!validDay(day)) return send(res, 400, "Invalid day");

  const i = appointments.findIndex(a => a.name === name && a.day === day && a.time === time);
  if (i === -1) return send(res, 200, "Appointment not found");

  appointments.splice(i, 1);
  if (!availableTimes[day].includes(time)) {
    availableTimes[day].push(time);
    availableTimes[day].sort((a,b) => a.localeCompare(b));
  }
  return send(res, 200, "Appointment has been canceled");
}

function handleCheck(q, res) {
  const err = reqd(q, ["day", "time"]); if (err) return send(res, 400, err);
  const day = norm(q.day), time = norm(q.time);
  if (!validDay(day)) return send(res, 400, "Invalid day");

  const free = availableTimes[day].includes(time);
  return send(res, 200, free ? "available" : "not available");
}


const server = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);
    const path = u.pathname;
    const q = Object.fromEntries(u.searchParams.entries());

    console.log("REQ:", req.method, path, q);

    if (req.method !== "GET") return send(res, 405, "Method Not Allowed");
    if ([...u.searchParams.keys()].length === 0) return send(res, 400, "Bad Request: missing query string");

    switch (path) {
      case "/schedule": return handleSchedule(q, res);
      case "/cancel":   return handleCancel(q, res);
      case "/check":    return handleCheck(q, res);
      default:          return send(res, 404, "Unknown path. Try /schedule, /cancel, or /check");
    }
  } catch (e) {
    console.error(e);
    return send(res, 400, "Bad Request: malformed URL");
  }
});

server.listen(80, () => console.log("listening on port 80"));
