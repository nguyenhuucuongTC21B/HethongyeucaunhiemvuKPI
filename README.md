# HỆ THỐNG QUẢN LÝ PHÂN CÔNG NHIỆM VỤ - TÍNH KPI

Hệ thống web phục vụ **cán bộ, công chức Viện** gửi đề xuất nhiệm vụ cần Bộ phận Kỹ thuật hỗ trợ; kỹ thuật viên tiếp nhận, xử lý; Quản trị viên phân công, thống kê và **đánh giá KPI** khối lượng công việc.

> ✅ **Không dùng SQL** — toàn bộ dữ liệu phẳng lưu trữ **vĩnh viễn trên Google Drive dưới dạng file JSON**
> ✅ Thiết kế riêng cho **Vercel** (serverless, không phụ thuộc ổ đĩa)
> ✅ Mã nguồn chuẩn **Git**, sẵn sàng đẩy lên **GitHub**
> ✅ Giao diện trang trọng dành cho cơ quan nhà nước (xanh đậm `#1a3a5c` / đỏ đô `#8b1a1a`, font Roboto)

---

## 1. Tính năng chính

### 👤 Người dùng (cán bộ, công chức)
- Gửi đề xuất nhiệm vụ theo **13 loại nhiệm vụ** với form đầy đủ: phòng ban (24 đơn vị cố định), chức danh (15 chức danh), CCCD (12 số), mức độ khẩn cấp, thời hạn mong muốn, tệp đính kèm (tối đa 5 file × 10MB — ảnh/PDF/Word/Excel)…
- Tự sinh mã nhiệm vụ `CV-2026-0001`
- Theo dõi đề xuất của mình, nhận thông báo khi tiếp nhận / hoàn thành / từ chối
- Đánh giá mức độ hài lòng (1–5 sao) sau khi hoàn thành

### 🔧 Kỹ thuật viên
- Xem nhiệm vụ được phân công (và nhiệm vụ chưa phân công nếu Admin bật chế độ tự nhận)
- Cập nhật trạng thái: **Chờ tiếp nhận → Đã tiếp nhận → Đang xử lý → Hoàn thành** (+ nhánh Từ chối, Tạm hoãn, Đã hủy — đều bắt buộc ghi lý do)
- Đính kèm minh chứng, ghi chú xử lý
- Xem **KPI cá nhân** với biểu đồ trực quan

### 🛡 Quản trị viên
- Quản lý người dùng: thêm/sửa/xóa/khóa/mở khóa/đặt lại mật khẩu/đổi vai trò (không cho tự xóa chính mình, luôn giữ ít nhất 1 Admin)
- Phân công / đổi người xử lý / thu hồi / sửa / xóa nhiệm vụ (có xác nhận + audit log)
- **Dashboard KPI**: biểu đồ cột, đường (12 tuần), tròn (theo loại nhiệm vụ), heatmap (theo phòng ban), bảng xếp hạng KPI
- **Công thức KPI có trọng số cấu hình được**: 40% tỷ lệ hoàn thành + 30% tỷ lệ đúng hạn + 20% điểm hài lòng + 10% khối lượng
- Xuất báo cáo **Excel** (xlsx thật, có định dạng) và **PDF** (trang in chuẩn văn bản, có ô ký)
- **Nhật ký kiểm toán** (audit log): mọi hành động quan trọng kèm người thực hiện, thời gian, IP, dữ liệu trước/sau

### 🔐 Bảo mật
- Mật khẩu băm **bcrypt**, JWT trong cookie `httpOnly`
- Đăng nhập bằng **username hoặc CCCD**
- Giới hạn **6 lần sai / 15 phút** → khóa tạm tự động
- Quên mật khẩu qua email (SMTP) hoặc do Admin đặt lại

---

## 2. Kiến trúc lưu trữ — Google Drive làm "cơ sở dữ liệu JSON"

```
Google Drive (folder cấu hình)
├── users.json          # Tài khoản người dùng
├── tasks.json          # Toàn bộ nhiệm vụ + lịch sử trạng thái
├── notifications.json  # Thông báo in-app
├── audit_logs.json     # Nhật ký kiểm toán
├── counters.json       # Bộ đếm sinh mã nhiệm vụ
├── settings.json       # Cài đặt (trọng số KPI, tiêu đề, quyền tự nhận)
└── <uuid>_<tên-file>   # Tệp đính kèm của nhiệm vụ
```

**Cơ chế an toàn dữ liệu:**
- *Optimistic locking*: kiểm tra phiên bản file (`headRevisionId`) trước khi ghi, tự thử lại tối đa 6 lần khi xung đột — chống mất dữ liệu khi nhiều request serverless ghi đồng thời
- *Mutex trong bộ nhớ* cho từng collection trong cùng 1 instance
- *Cache đọc 10 giây* để giảm số lần gọi Drive API
- Khi **chưa cấu hình Drive**, hệ thống tự chuyển sang lưu file JSON tại thư mục `data/` (chỉ dùng để chạy thử local/preview)

---

## 3. Chạy thử trên máy local

```bash
# 1. Cài dependencies
bun install        # hoặc npm install

# 2. Tạo file môi trường (có thể bỏ trống hết — hệ thống chạy ở chế độ local storage)
cp .env.example .env

# 3. Chạy
bun run dev        # hoặc npm run dev
```

Truy cập `http://localhost:3000`. Hệ thống tự khởi tạo dữ liệu mẫu lần đầu chạy.

### Tài khoản mặc định (xóa/đổi mật khẩu ngay khi đưa vào sử dụng!)

| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| `admin` | `Admin@123` | Quản trị viên |
| `kythuat` | `KyThuat@123` | Kỹ thuật viên |
| `kythuat2` | `KyThuat@123` | Kỹ thuật viên |
| `nguoidung` | `NguoiDung@123` | Người dùng |

---

## 4. Triển khai lên GitHub

```bash
git init
git add .
git commit -m "Hệ thống Quản lý phân công nhiệm vụ - Tính KPI"

# Tạo repository trên GitHub rồi:
git remote add origin https://github.com/<tên-bạn>/quan-ly-nhiem-vu-kpi.git
git branch -M main
git push -u origin main
```

---

## 5. Cấu hình Google Drive (bắt buộc trước khi lên Vercel)

### Cách A — Service Account (khuyến nghị, ổn định nhất)

1. Truy cập [Google Cloud Console](https://console.cloud.google.com) → tạo Project (ví dụ `qlnv-kpi`)
2. **APIs & Services → Library** → tìm **Google Drive API** → **Enable**
3. **APIs & Services → Credentials → Create Credentials → Service account** → tạo SA (không cần cấp vai trò IAM)
4. Vào SA vừa tạo → tab **Keys → Add key → Create new key → JSON** → tải file key về
5. Trên [Google Drive](https://drive.google.com), tạo thư mục, ví dụ `QLNV-DuLieu`
6. **Chia sẻ** thư mục đó cho email của Service Account (dạng `xxx@yyy.iam.gserviceaccount.com`) với quyền **Editor** (Biên tập viên)
7. Copy **ID thư mục** từ URL: `https://drive.google.com/drive/folders/`**`<GOOGLE_DRIVE_FOLDER_ID>`**
8. Lấy nội dung file JSON key dán vào biến `GOOGLE_SERVICE_ACCOUNT_JSON` (có thể dán thẳng JSON hoặc mã base64: `base64 -w0 key.json`)

### Cách B — OAuth Refresh Token (dùng Drive cá nhân/tổ chức)

1. Làm bước 1–2 như trên
2. **Credentials → Create Credentials → OAuth client ID** → loại *Web application*
3. Authorized redirect URI: `https://developers.google.com/oauthplayground`
4. Lấy `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`
5. Vào [OAuth Playground](https://developers.google.com/oauthplayground) → ⚙️ bật *Use your own OAuth credentials* → trong danh sách chọn **Drive API v3 → `https://www.googleapis.com/auth/drive`** → Authorize → Exchange authorization code for tokens → copy **Refresh token**
6. Khai báo đủ 4 biến: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`

> ⚠️ Với tài khoản Google Workspace (cơ quan), nếu không chia sẻ được cho Service Account, dùng **Shared Drive** (Drive dùng chung) và lấy ID của Shared Drive làm `GOOGLE_DRIVE_FOLDER_ID`.

---

## 6. Triển khai lên Vercel

1. Đăng nhập [vercel.com](https://vercel.com) bằng GitHub → **Add New → Project** → chọn repository vừa push
2. Framework tự nhận **Next.js** — giữ nguyên mọi thiết lập build
3. Vào **Settings → Environment Variables**, khai báo:

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `JWT_SECRET` | ✅ | Chuỗi ngẫu nhiên ≥ 32 ký tự (`openssl rand -hex 32`) |
| `GOOGLE_DRIVE_FOLDER_ID` | ✅ | ID thư mục/Shared Drive chứa dữ liệu |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅ (cách A) | Nội dung JSON key của Service Account |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | ✅ (cách B) | Nếu dùng OAuth |
| `SMTP_*` | ⬜ | Email thông báo (xem `.env.example`) |
| `NEXT_PUBLIC_APP_URL` | ⬜ | `https://<miền-của-bạn>` (dùng trong email reset mật khẩu) |

4. Bấm **Deploy**. Lần truy cập đầu tiên hệ thống tự tạo 6 file JSON trên Google Drive
5. **Kiểm tra nhanh sau khi deploy**: đăng nhập `admin` → *Cài đặt* → mục “Trạng thái hạ tầng” phải hiện **“Google Drive (file JSON vĩnh viễn)”**

> 💡 Miễn phí: Vercel Hobby + Google Drive 15GB đủ dùng cho quy mô một Viện. File `vercel.json` đã đặt sẵn thời hạn chạy tối đa 60s cho các API upload/xuất file.

---

## 7. Cấu trúc mã nguồn

```
src/
├── app/
│   ├── page.tsx                  # Trang chủ (banner cơ quan, giới thiệu)
│   ├── login|forgot-password|reset-password/
│   ├── (app)/                    # Khu vực đã đăng nhập
│   │   ├── proposal/             # Form gửi đề xuất nhiệm vụ
│   │   ├── my-proposals/         # Đề xuất của tôi
│   │   ├── tasks/ + tasks/[id]/  # Danh sách & chi tiết nhiệm vụ
│   │   ├── kpi/                  # KPI cá nhân
│   │   ├── notifications/        # Thông báo
│   │   └── account/              # Đổi mật khẩu
│   ├── admin/                    # Chỉ Quản trị viên
│   │   ├── users/                # Quản lý tài khoản
│   │   ├── kpi/                  # Dashboard KPI
│   │   ├── audit/                # Nhật ký hoạt động
│   │   └── settings/             # Cấu hình + trọng số KPI
│   ├── print/kpi-report/         # Báo cáo in PDF (khổ A4, có ô ký)
│   └── api/                      # REST API (auth, tasks, users, kpi, …)
├── components/                   # UI dùng chung (shadcn/ui + component riêng)
├── lib/
│   ├── constants.ts              # 24 đơn vị, 15 chức danh, 13 loại nhiệm vụ, trạng thái…
│   ├── storage/                  # ★ Lớp lưu trữ Drive/Local + optimistic locking
│   ├── auth.ts                   # JWT, bcrypt, khóa đăng nhập sai
│   ├── kpi.ts                    # Tính toán KPI + dữ liệu biểu đồ
│   ├── audit.ts                  # Audit log + thông báo + email
│   └── validation.ts             # Zod schema, thông báo lỗi tiếng Việt
└── middleware.ts                 # Bảo vệ route theo vai trò (edge)
```

---

## 8. API tổng quan

| Nhóm | Endpoint | Phương thức | Quyền |
|---|---|---|---|
| Xác thực | `/api/auth/login`, `logout`, `me`, `change-password`, `forgot-password`, `reset-password` | POST/GET | Công khai / Đã đăng nhập |
| Nhiệm vụ | `/api/tasks` | GET, POST | Đã đăng nhập (phạm vi theo vai trò) |
| | `/api/tasks/[id]` | GET, PATCH, DELETE | Người liên quan / Admin |
| | `/api/tasks/[id]/status` · `/assign` · `/rate` | POST | KTV phụ trách / Admin / Người gửi |
| Tệp | `/api/files/[id]` | GET | Đã đăng nhập |
| Người dùng | `/api/users`, `/api/users/[id]` | CRUD + POST action | Admin |
| KPI | `/api/kpi`, `/api/kpi/export` | GET | Admin (toàn bộ) / KTV (cá nhân) |
| Hệ thống | `/api/settings`, `/api/notifications`, `/api/audit-logs` | GET/PUT/POST | Theo vai trò |

---

## 9. Ghi chú vận hành

- **Sửa danh sách đơn vị / chức danh / loại nhiệm vụ**: chỉnh trong `src/lib/constants.ts` (danh sách đơn vị theo yêu cầu hiện gồm 24 mục — bổ sung 2 mục còn thiếu nếu Viện cần đủ 26)
- **Đổi mật khẩu mặc định ngay** sau khi triển khai; bật SMTP để nhận thông báo email
- **Sao lưu**: sao chép định kỳ 6 file JSON trong thư mục Google Drive
- **Không lưu dữ liệu nhạy cảm ngoài hệ thống**: CCCD được lưu trong `users.json`/`tasks.json` trên Drive của cơ quan — kiểm soát quyền chia sẻ thư mục chặt chẽ
