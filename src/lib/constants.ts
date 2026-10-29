/**
 * Hằng số nghiệp vụ cố định của hệ thống
 * Quản lý phân công nhiệm vụ - Tính KPI
 */

/** Danh sách 24 Phòng ban / Đơn vị công tác (theo danh sách Viện cung cấp) */
export const DEPARTMENTS: string[] = [
  "Văn phòng",
  "Thanh tra – Khiếu tố",
  "Phòng 1",
  "Phòng 2",
  "Phòng 3",
  "Phòng 7",
  "Phòng 8",
  "Phòng 9",
  "Phòng 10",
  "Phòng 11",
  "Phòng 15",
  "Khu vực 1",
  "Khu vực 2",
  "Khu vực 3",
  "Khu vực 4",
  "Khu vực 5",
  "Khu vực 6",
  "Khu vực 7",
  "Khu vực 8",
  "Khu vực 9",
  "Khu vực 10",
  "Khu vực 11",
  "Khu vực 12",
  "Lãnh đạo Viện TP",
];

/** Danh sách 15 Chức danh */
export const TITLES: string[] = [
  "Viện trưởng",
  "Phó Viện trưởng",
  "Chánh Văn phòng",
  "Chánh Thanh tra",
  "Trưởng phòng",
  "Phó Chánh Văn phòng",
  "Phó Chánh Thanh tra",
  "Kiểm sát viên cao cấp",
  "Kiểm sát viên Trung cấp",
  "Kiểm sát viên sơ cấp",
  "Điều tra viên",
  "Kiểm tra viên Chính",
  "Kiểm tra viên",
  "Chuyên viên",
  "Người lao động / Công vụ",
];

/** Danh sách 13 Loại nhiệm vụ đề xuất */
export const TASK_TYPES: string[] = [
  "Phục vụ Hội nghị / họp trực tiếp",
  "Phiên Hội nghị / họp Kết nối trực tuyến",
  "Sửa máy Laptop",
  "Sửa chữa PC",
  "Vá lỗi phần mềm",
  "Cài đặt / Update Windows",
  "Cài đặt ứng dụng",
  "Sửa máy in – photocopy",
  "Sửa lỗi kết nối đường truyền",
  "Khắc phục lỗi Ký số / Token",
  "Khắc phục lỗi ứng dụng Ngành",
  "Yêu cầu viết ứng dụng / phần mềm",
  "Hỗ trợ nhập liệu",
];

/** Mức độ khẩn cấp */
export const URGENCY_LEVELS = ["Bình thường", "Gấp", "Rất gấp"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

/** Trạng thái vòng đời nhiệm vụ */
export const TASK_STATUS = {
  CHO_TIEP_NHAN: "Chờ tiếp nhận",
  DA_TIEP_NHAN: "Đã tiếp nhận",
  DANG_XU_LY: "Đang xử lý",
  HOAN_THANH: "Hoàn thành",
  TU_CHOI: "Từ chối",
  TAM_HOAN: "Tạm hoãn",
  DA_HUY: "Đã hủy",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const STATUS_LIST: TaskStatus[] = [
  TASK_STATUS.CHO_TIEP_NHAN,
  TASK_STATUS.DA_TIEP_NHAN,
  TASK_STATUS.DANG_XU_LY,
  TASK_STATUS.HOAN_THANH,
  TASK_STATUS.TU_CHOI,
  TASK_STATUS.TAM_HOAN,
  TASK_STATUS.DA_HUY,
];

/** Map trạng thái -> màu badge (Tailwind class) */
export const STATUS_COLORS: Record<string, string> = {
  [TASK_STATUS.CHO_TIEP_NHAN]: "bg-amber-100 text-amber-800 border-amber-300",
  [TASK_STATUS.DA_TIEP_NHAN]: "bg-sky-100 text-sky-800 border-sky-300",
  [TASK_STATUS.DANG_XU_LY]: "bg-indigo-100 text-indigo-800 border-indigo-300",
  [TASK_STATUS.HOAN_THANH]: "bg-emerald-100 text-emerald-800 border-emerald-300",
  [TASK_STATUS.TU_CHOI]: "bg-red-100 text-red-800 border-red-300",
  [TASK_STATUS.TAM_HOAN]: "bg-orange-100 text-orange-800 border-orange-300",
  [TASK_STATUS.DA_HUY]: "bg-slate-200 text-slate-700 border-slate-400",
};

/** Mức khẩn cấp -> màu */
export const URGENCY_COLORS: Record<string, string> = {
  "Bình thường": "bg-slate-100 text-slate-700 border-slate-300",
  "Gấp": "bg-orange-100 text-orange-800 border-orange-300",
  "Rất gấp": "bg-red-100 text-red-800 border-red-300",
};

/** Vai trò người dùng */
export const ROLES = {
  USER: "user",
  TECHNICIAN: "technician",
  ADMIN: "admin",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  user: "Người dùng",
  technician: "Kỹ thuật viên",
  admin: "Quản trị viên",
};

/** Chuyển đổi trạng thái hợp lệ (từ -> danh sách có thể chuyển tới) */
export const STATUS_TRANSITIONS: Record<string, TaskStatus[]> = {
  [TASK_STATUS.CHO_TIEP_NHAN]: [TASK_STATUS.DA_TIEP_NHAN, TASK_STATUS.TU_CHOI, TASK_STATUS.DA_HUY],
  [TASK_STATUS.DA_TIEP_NHAN]: [TASK_STATUS.DANG_XU_LY, TASK_STATUS.TAM_HOAN, TASK_STATUS.TU_CHOI],
  [TASK_STATUS.DANG_XU_LY]: [TASK_STATUS.HOAN_THANH, TASK_STATUS.TAM_HOAN, TASK_STATUS.TU_CHOI],
  [TASK_STATUS.TAM_HOAN]: [TASK_STATUS.DANG_XU_LY, TASK_STATUS.TU_CHOI],
  [TASK_STATUS.TU_CHOI]: [TASK_STATUS.CHO_TIEP_NHAN, TASK_STATUS.DA_HUY],
  [TASK_STATUS.HOAN_THANH]: [],
  [TASK_STATUS.DA_HUY]: [],
};

/** Trạng thái được tính là "đang thực hiện" */
export const ACTIVE_STATUSES: TaskStatus[] = [
  TASK_STATUS.DA_TIEP_NHAN,
  TASK_STATUS.DANG_XU_LY,
  TASK_STATUS.TAM_HOAN,
];

/** Giới hạn tệp đính kèm */
export const MAX_ATTACHMENTS = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const ALLOWED_FILE_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
];

/** Giới hạn đăng nhập sai */
export const MAX_LOGIN_ATTEMPTS = 6;
export const LOGIN_LOCK_MINUTES = 15;

/** Tên các bộ sưu tập dữ liệu JSON trên Google Drive */
export const COLLECTIONS = {
  USERS: "users",
  TASKS: "tasks",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "audit_logs",
  COUNTERS: "counters",
  SETTINGS: "settings",
  POSTS: "posts",
  VIDEOS: "videos",
  SOFTWARE: "software",
  MEDIA: "media",
} as const;

/** Tên đơn vị mặc định (hiển thị banner) */
export const DEFAULT_SITE_TITLE = "VIỆN KIỂM SÁT NHÂN DÂN THÀNH PHỐ";
export const DEFAULT_SITE_SUBTITLE =
  "HỆ THỐNG QUẢN LÝ PHÂN CÔNG NHIỆM VỤ KỸ THUẬT - ĐÁNH GIÁ KPI";

/** Màu chủ đề mặc định */
export const THEME_PRESETS = {
  navy: { primary: "#1a3a5c", agency: "#8b1a1a" },
  crimson: { primary: "#7a1616", agency: "#b8860b" },
} as const;
export type ThemePreset = keyof typeof THEME_PRESETS | "custom";

/** Mã đăng ký mặc định (Admin có thể đổi trong Cài đặt giao diện) */
export const DEFAULT_TECH_REG_CODE = "KYTHUAT-2026";
export const DEFAULT_ADMIN_REG_CODE = "ADMIN-2026";

/** Giới hạn ảnh media upload (logo / ảnh bìa tin bài) */
export const MAX_MEDIA_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MEDIA_TYPES = "image/jpeg,image/png,image/webp,image/gif";

/** Trọng số KPI mặc định (tổng = 1) */
export const DEFAULT_KPI_WEIGHTS = {
  completion: 0.4,   // Tỷ lệ hoàn thành
  onTime: 0.3,       // Tỷ lệ đúng hạn
  satisfaction: 0.2, // Điểm hài lòng
  volume: 0.1,       // Khối lượng công việc
};

export type KpiWeights = typeof DEFAULT_KPI_WEIGHTS;
