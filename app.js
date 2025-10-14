// Tiago Freitas - Homework Assignment 3
// app.js — CSC330 HW3 server
// Run: node app.js  → open http://localhost:8080

const http = require('http');
const fs   = require('fs');
const url  = require('url');
const path = require('path');

// In-memory appointment store 
const appts = new Map(); // key: `${day}|${time}` → value: name

// Small helpers (avoid repetition) 
function sendResponse(res, status, contentType, body) {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css' : 'text/css; charset=utf-8',
    '.js'  : 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png' : 'image/png',
    '.jpg' : 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif' : 'image/gif',
    '.svg' : 'image/svg+xml',
    '.ico' : 'image/x-icon',
    '.txt' : 'text/plain; charset=utf-8'
  };
  return map[ext] || 'application/octet-stream';
}

// Reads and serves a file from disk with proper content type + errors
function sendFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return sendResponse(res, 404, 'text/plain; charset=utf-8', '404 Not Found');
      }
      return sendResponse(res, 500, 'text/plain; charset=utf-8', '500 Internal Server Error');
    }
    sendResponse(res, 200, contentTypeFor(filePath), data);
  });
}

// Route handlers 
function handleSchedule(q, res) {
  const { name, day, time } = q;
  if (!name || !day || !time) {
    return sendResponse(res, 400, 'text/plain; charset=utf-8',
      'Missing required query params: name, day, time');
  }
  const key = `${day}|${time}`;
  if (appts.has(key)) {
    return sendResponse(res, 200, 'text/plain; charset=utf-8',
      `Sorry, ${day} at ${time} is already booked by ${appts.get(key)}.`);
  }
  appts.set(key, name);
  sendResponse(res, 200, 'text/plain; charset=utf-8',
    `Scheduled ${name} on ${day} at ${time}.`);
}

function handleCancel(q, res) {
  const { name, day, time } = q;
  if (!name || !day || !time) {
    return sendResponse(res, 400, 'text/plain; charset=utf-8',
      'Missing required query params: name, day, time');
  }
  const key = `${day}|${time}`;
  if (!appts.has(key)) {
    return sendResponse(res, 200, 'text/plain; charset=utf-8',
      `No appointment found on ${day} at ${time}.`);
  }
  const who = appts.get(key);
  if (who !== name) {
    return sendResponse(res, 200, 'text/plain; charset=utf-8',
      `Slot on ${day} at ${time} is owned by ${who}, not ${name}. Cancel denied.`);
  }
  appts.delete(key);
  sendResponse(res, 200, 'text/plain; charset=utf-8',
    `Cancelled ${name}'s appointment on ${day} at ${time}.`);
}

function handleCheck(q, res) {
  const { day, time } = q;
  if (!day || !time) {
    return sendResponse(res, 400, 'text/plain; charset=utf-8',
      'Missing required query params: day, time');
  }
  const key = `${day}|${time}`;
  if (appts.has(key)) {
    return sendResponse(res, 200, 'text/plain; charset=utf-8',
      `NOT available. Booked by ${appts.get(key)}.`);
  }
  sendResponse(res, 200, 'text/plain; charset=utf-8',
    `Available on ${day} at ${time}.`);
}

// HTTP server 
const server = http.createServer((req, res) => {
  console.log('REQ:', req.method, req.url); // required: log incoming requests

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // AJAX endpoints
  if (req.method === 'GET') {
    if (pathname === '/schedule') return handleSchedule(parsed.query, res);
    if (pathname === '/cancel')   return handleCancel(parsed.query, res);
    if (pathname === '/check')    return handleCheck(parsed.query, res);
  }

  // Static files from public_html (default "/" → index.html)
  let safePath = pathname === '/' ? '/index.html' : pathname;

  // prevent path traversal outside public_html
  safePath = path.normalize(safePath).replace(/^(\.\.[/\\])+/, '');

  const filePath = path.join(__dirname, 'public_html', safePath);
  sendFile(filePath, res); // single place that serves files
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
