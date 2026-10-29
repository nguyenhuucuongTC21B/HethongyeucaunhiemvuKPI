/**
 * Sinh bộ 6 file JSON khởi tạo để người dùng tự upload lên Google Drive.
 * Output: /home/z/my-project/scripts/drive-seed-out/*.json + zip
 */
import bcrypt from "bcryptjs";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const OUT = "/home/z/my-project/scripts/drive-seed-out";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const now = new Date().toISOString();
const hash = bcrypt.hashSync("Admin@123", 10);

const users = [
  {
    id: "usr_admin_khoitao",
    username: "admin",
    cccd: "000000000001",
    name: "Quản trị viên hệ thống",
    role: "admin",
    department: "Văn phòng",
    title: "Chuyên viên",
    email: "admin@vien.gov.vn",
    passwordHash: hash,
    status: "active",
    failedAttempts: 0,
    lockUntil: null,
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  },
];

const counters = { taskSeq: 0, taskSeqYear: new Date().getFullYear(), seq: 0 };

const settings = {
  siteTitle: "VIỆN KIỂM SÁT NHÂN DÂN THÀNH PHỐ",
  siteSubtitle: "HỆ THỐNG QUẢN LÝ PHÂN CÔNG NHIỆM VỤ KỸ THUẬT - ĐÁNH GIÁ KPI",
  allowSelfAssign: true,
  kpiWeights: { completion: 0.4, onTime: 0.3, satisfaction: 0.2, volume: 0.1 },
  updatedAt: now,
};

const files = {
  "users.json": users,
  "tasks.json": [],
  "notifications.json": [],
  "audit_logs.json": [],
  "counters.json": counters,
  "settings.json": settings,
};

for (const [name, data] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log("✔ tạo", name);
}

// Đóng gói zip
const ZIP = "/home/z/my-project/khoi-tao-drive.zip";
execSync(`cd "${OUT}" && zip -qj "${ZIP}" *.json`, { stdio: "inherit" });

// Đặt vào thư mục tải về của người dùng + thư mục public của website
for (const dest of [
  "/home/z/my-project/download/khoi-tao-drive.zip",
  "/home/z/my-project/public/downloads/khoi-tao-drive.zip",
]) {
  fs.copyFileSync(ZIP, dest);
  console.log("✔ đã đặt tại", dest);
}
console.log("✔ bcrypt hash OK — mật khẩu admin: Admin@123");
