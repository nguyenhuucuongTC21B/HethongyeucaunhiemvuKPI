/**
 * Schema kiểm tra hợp lệ (zod) với thông báo lỗi tiếng Việt
 */
import { z } from "zod";
import { DEPARTMENTS, TASK_TYPES, TITLES, URGENCY_LEVELS } from "@/lib/constants";

export const cccdSchema = z
  .string()
  .trim()
  .regex(/^\d{12}$/, "CCCD phải gồm đúng 12 chữ số");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10,11}$/, "Số điện thoại phải gồm 10–11 chữ số");

export const emailSchema = z
  .string()
  .trim()
  .email("Email không đúng định dạng")
  .optional()
  .or(z.literal(""));

export const taskProposalSchema = z.object({
  type: z.string().trim().min(1, "Vui lòng chọn loại nhiệm vụ").refine(
    (v) => TASK_TYPES.includes(v),
    "Loại nhiệm vụ không hợp lệ"
  ),
  requesterName: z.string().trim().min(2, "Vui lòng nhập họ tên người đề xuất"),
  department: z.string().trim().min(1, "Vui lòng chọn phòng ban / đơn vị").refine(
    (v) => DEPARTMENTS.includes(v),
    "Phòng ban / đơn vị không hợp lệ"
  ),
  position: z.string().trim().min(1, "Vui lòng chọn chức danh").refine(
    (v) => TITLES.includes(v),
    "Chức danh không hợp lệ"
  ),
  cccd: cccdSchema,
  legalBasis: z.string().trim().max(2000, "Căn cứ pháp lý không quá 2000 ký tự").optional().or(z.literal("")),
  title: z
    .string()
    .trim()
    .min(5, "Tiêu đề đề xuất phải có ít nhất 5 ký tự")
    .max(200, "Tiêu đề không quá 200 ký tự"),
  description: z
    .string()
    .trim()
    .min(10, "Mô tả chi tiết phải có ít nhất 10 ký tự")
    .max(5000, "Mô tả không quá 5000 ký tự"),
  urgency: z.enum(URGENCY_LEVELS, { message: "Vui lòng chọn mức độ khẩn cấp" }),
  desiredDeadline: z.string().trim().optional().or(z.literal("")),
  location: z.string().trim().max(300, "Địa điểm không quá 300 ký tự").optional().or(z.literal("")),
  phone: phoneSchema,
  email: emailSchema,
  notes: z.string().trim().max(2000, "Ghi chú không quá 2000 ký tự").optional().or(z.literal("")),
});

export type TaskProposalInput = z.infer<typeof taskProposalSchema>;

export const userCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(50, "Tên đăng nhập không quá 50 ký tự")
    .regex(/^[a-zA-Z0-9._-]+$/, "Tên đăng nhập chỉ gồm chữ cái, số, dấu chấm, gạch dưới"),
  name: z.string().trim().min(2, "Vui lòng nhập họ tên"),
  cccd: cccdSchema,
  role: z.enum(["user", "technician", "admin"], { message: "Vai trò không hợp lệ" }),
  department: z.string().trim().min(1, "Vui lòng chọn phòng ban / đơn vị"),
  title: z.string().trim().min(1, "Vui lòng chọn chức danh"),
  email: emailSchema,
  phone: z.string().trim().optional().or(z.literal("")),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

export const userUpdateSchema = userCreateSchema.partial().omit({ password: true });

export const passwordSchema = z.object({
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

/** Chuẩn hóa lỗi zod thành chuỗi tiếng Việt đầu tiên */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dữ liệu không hợp lệ";
}

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
