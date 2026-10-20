import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'e:/Projects/ParKING/report/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Function to fetch login token and user object
async function getAuth(email, password) {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.statusText}`);
  return await res.json();
}

async function run() {
  console.log('Fetching auth tokens...');
  const driverAuth = await getAuth('driver@parking.com', 'Driver@123');
  const guardAuth = await getAuth('guard@parking.com', 'Guard@123');
  const adminAuth = await getAuth('admin@parking.com', 'Admin@123');
  const ownerAuth = await getAuth('owner@parking.com', 'Owner@123');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('1. Capturing Landing Page...');
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_1_landing.png') });

  console.log('2. Capturing Login Page...');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_2_login.png') });

  console.log('3. Capturing Register Page...');
  await page.goto('http://localhost:8080/register', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_3_register.png') });

  // Authenticate as Driver
  console.log('4. Authenticating as Driver...');
  await page.goto('http://localhost:8080/login');
  await page.evaluate((auth) => {
    localStorage.setItem('parking_token', auth.token);
    localStorage.setItem('parking_user', JSON.stringify(auth.user));
  }, driverAuth);

  console.log('4a. Capturing Driver Search...');
  await page.goto('http://localhost:8080/driver/search', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_4_driver_search.png') });

  console.log('4b. Capturing Lot Details...');
  await page.goto('http://localhost:8080/driver/lots/6ad5a56940701706169fcd27', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_5_lot_details.png') });

  console.log('4c. Capturing Driver Tickets...');
  await page.goto('http://localhost:8080/driver/tickets', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_6_driver_tickets.png') });

  console.log('4d. Capturing Single Ticket QR...');
  await page.goto('http://localhost:8080/driver/tickets/6ad5a6f940701706169fcd37', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_7_ticket_qr.png') });

  // Authenticate as Guard
  console.log('5. Authenticating as Guard...');
  await page.goto('http://localhost:8080/login');
  await page.evaluate((auth) => {
    localStorage.setItem('parking_token', auth.token);
    localStorage.setItem('parking_user', JSON.stringify(auth.user));
  }, guardAuth);

  console.log('5a. Capturing Guard Scanner...');
  await page.goto('http://localhost:8080/guard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_8_guard_scanner.png') });

  // Authenticate as Admin
  console.log('6. Authenticating as Admin...');
  await page.goto('http://localhost:8080/login');
  await page.evaluate((auth) => {
    localStorage.setItem('parking_token', auth.token);
    localStorage.setItem('parking_user', JSON.stringify(auth.user));
  }, adminAuth);

  console.log('6a. Capturing Admin Dashboard...');
  await page.goto('http://localhost:8080/admin', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_9_admin_dashboard.png') });

  console.log('6b. Capturing Admin Lots Management...');
  await page.goto('http://localhost:8080/admin/lots', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_10_admin_lots.png') });

  // Authenticate as Owner
  console.log('7. Authenticating as Owner...');
  await page.goto('http://localhost:8080/login');
  await page.evaluate((auth) => {
    localStorage.setItem('parking_token', auth.token);
    localStorage.setItem('parking_user', JSON.stringify(auth.user));
  }, ownerAuth);

  console.log('7a. Capturing Owner Dashboard...');
  await page.goto('http://localhost:8080/owner', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fig5_11_owner_dashboard.png') });

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
