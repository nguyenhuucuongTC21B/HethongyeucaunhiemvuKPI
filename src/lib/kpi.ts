/**
 * Tính toán KPI kỹ thuật viên
 * Điểm KPI tổng hợp = w1*Tỷ lệ hoàn thành + w2*Tỷ lệ đúng hạn
 *                    + w3*Điểm hài lòng + w4*Khối lượng (được chuẩn hóa)
 */
import { ACTIVE_STATUSES, TASK_STATUS } from "@/lib/constants";
import type { AppSettings, KpiWeights, Task } from "@/lib/storage";

export interface KpiFilter {
  from?: string; // ISO date
  to?: string; // ISO date
  technicianId?: string;
  department?: string;
  taskType?: string;
}

export interface TechnicianKpi {
  userId: string;
  name: string;
  department: string;
  assigned: number;
  received: number;
  completed: number;
  inProgress: number;
  rejected: number;
  postponed: number;
  overdue: number;
  completionRate: number; // 0..1
  avgHours: number | null; // giờ xử lý trung bình
  onTimeRate: number | null; // 0..1 (null nếu không có deadline)
  satisfaction: number | null; // 0..5
  satisfactionCount: number;
  volumeScore: number; // 0..1 so với kỹ thuật viên cao nhất
  kpiScore: number; // 0..100
  weights: KpiWeights;
}

function inRange(t: Task, f: KpiFilter): boolean {
  const created = new Date(t.createdAt).getTime();
  if (f.from && created < new Date(`${f.from}T00:00:00`).getTime()) return false;
  if (f.to && created > new Date(`${f.to}T23:59:59.999`).getTime()) return false;
  if (f.department && t.department !== f.department) return false;
  if (f.taskType && t.type !== f.taskType) return false;
  return true;
}

export function computeTechnicianKpis(
  tasks: Task[],
  technicians: { id: string; name: string; department: string }[],
  filter: KpiFilter,
  weights: KpiWeights
): TechnicianKpi[] {
  const results: Omit<TechnicianKpi, "volumeScore" | "kpiScore">[] = technicians.map((tech) => {
    // Nhiệm vụ được giao cho kỹ thuật viên này (theo thời điểm tạo/giao trong khoảng lọc)
    const mine = tasks.filter(
      (t) =>
        t.assigneeId === tech.id &&
        inRange(t, filter)
    );
    const assigned = mine.length;
    const received = mine.filter(
      (t) =>
        t.history.some((h) => h.to === TASK_STATUS.DA_TIEP_NHAN) ||
        t.receivedAt
    ).length;
    const completed = mine.filter((t) => t.status === TASK_STATUS.HOAN_THANH).length;
    const inProgress = mine.filter((t) => ACTIVE_STATUSES.includes(t.status)).length;
    const rejected = mine.filter((t) => t.status === TASK_STATUS.TU_CHOI).length;
    const postponed = mine.filter((t) => t.status === TASK_STATUS.TAM_HOAN).length;

    const now = Date.now();
    const overdue = mine.filter((t) => {
      if (!t.desiredDeadline) return false;
      const deadline = new Date(t.desiredDeadline).getTime();
      if (t.status === TASK_STATUS.HOAN_THANH) {
        return t.completedAt ? new Date(t.completedAt).getTime() > deadline : false;
      }
      return ACTIVE_STATUSES.includes(t.status) && deadline < now;
    }).length;

    // Thời gian xử lý trung bình: từ tiếp nhận đến hoàn thành
    const durations: number[] = [];
    mine.forEach((t) => {
      if (t.status !== TASK_STATUS.HOAN_THANH || !t.completedAt) return;
      const receivedAt =
        t.receivedAt
          ? new Date(t.receivedAt).getTime()
          : t.history.find((h) => h.to === TASK_STATUS.DA_TIEP_NHAN)
            ? new Date(t.history.find((h) => h.to === TASK_STATUS.DA_TIEP_NHAN)!.at).getTime()
            : new Date(t.createdAt).getTime();
      durations.push((new Date(t.completedAt).getTime() - receivedAt) / 3_600_000);
    });
    const avgHours = durations.length
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : null;

    // Tỷ lệ đúng hạn: hoàn thành trước thời hạn mong muốn
    const withDeadline = mine.filter(
      (t) => t.status === TASK_STATUS.HOAN_THANH && t.completedAt && t.desiredDeadline
    );
    const onTime = withDeadline.filter(
      (t) => new Date(t.completedAt!).getTime() <= new Date(t.desiredDeadline!).getTime()
    );
    const onTimeRate = withDeadline.length ? onTime.length / withDeadline.length : null;

    // Điểm hài lòng trung bình
    const rated = mine.filter((t) => t.rating);
    const satisfaction = rated.length
      ? Math.round((rated.reduce((a, t) => a + (t.rating?.stars ?? 0), 0) / rated.length) * 100) / 100
      : null;

    const completionRate = assigned ? completed / assigned : 0;

    return {
      userId: tech.id,
      name: tech.name,
      department: tech.department,
      assigned,
      received,
      completed,
      inProgress,
      rejected,
      postponed,
      overdue,
      completionRate,
      avgHours,
      onTimeRate,
      satisfaction,
      satisfactionCount: rated.length,
      weights,
    };
  });

  const maxCompleted = Math.max(1, ...results.map((r) => r.completed));

  return results.map((r) => {
    const volumeScore = r.completed / maxCompleted;
    const satisfactionScore = r.satisfaction !== null ? r.satisfaction / 5 : 0;
    const onTimeScore = r.onTimeRate ?? 0;
    // KPI tổng hợp (0..100)
    const kpiScore =
      Math.round(
        (weights.completion * r.completionRate +
          weights.onTime * onTimeScore +
          weights.satisfaction * satisfactionScore +
          weights.volume * volumeScore) *
          1000
      ) / 10;
    return { ...r, volumeScore, kpiScore };
  });
}

/** Dữ liệu biểu đồ: xu hướng theo tuần (12 tuần gần nhất) */
export function weeklyTrend(tasks: Task[]) {
  const weeks: { label: string; created: number; completed: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const created = tasks.filter((t) => {
      const c = new Date(t.createdAt).getTime();
      return c >= startMs && c <= endMs;
    }).length;
    const completed = tasks.filter((t) => {
      if (t.status !== TASK_STATUS.HOAN_THANH || !t.completedAt) return false;
      const c = new Date(t.completedAt).getTime();
      return c >= startMs && c <= endMs;
    }).length;
    const label = `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`;
    weeks.push({ label, created, completed });
  }
  return weeks;
}

/** Phân bổ nhiệm vụ theo loại */
export function byTaskType(tasks: Task[]) {
  const map = new Map<string, number>();
  tasks.forEach((t) => map.set(t.type, (map.get(t.type) ?? 0) + 1));
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Ma trận phòng ban × loại nhiệm vụ (heatmap) */
export function departmentHeatmap(tasks: Task[], departments: string[]) {
  const map = new Map<string, number>();
  tasks.forEach((t) => map.set(t.department, (map.get(t.department) ?? 0) + 1));
  return departments
    .map((d) => ({ department: d, count: map.get(d) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

/** Tổng quan toàn hệ thống */
export function overallSummary(tasks: Task[]) {
  const now = Date.now();
  const active = tasks.filter((t) => ACTIVE_STATUSES.includes(t.status)).length;
  const pending = tasks.filter((t) => t.status === TASK_STATUS.CHO_TIEP_NHAN).length;
  const completed = tasks.filter((t) => t.status === TASK_STATUS.HOAN_THANH).length;
  const overdue = tasks.filter((t) => {
    if (!t.desiredDeadline) return false;
    const dl = new Date(t.desiredDeadline).getTime();
    if (t.status === TASK_STATUS.HOAN_THANH) {
      return t.completedAt ? new Date(t.completedAt).getTime() > dl : false;
    }
    return ACTIVE_STATUSES.includes(t.status) && dl < now;
  }).length;
  const rated = tasks.filter((t) => t.rating);
  const satisfaction = rated.length
    ? Math.round((rated.reduce((a, t) => a + (t.rating?.stars ?? 0), 0) / rated.length) * 100) / 100
    : null;
  return { total: tasks.length, pending, active, completed, overdue, satisfaction };
}

export function applyWeights(s: AppSettings, w: Partial<KpiWeights>): KpiWeights {
  return {
    completion: w.completion ?? s.kpiWeights.completion,
    onTime: w.onTime ?? s.kpiWeights.onTime,
    satisfaction: w.satisfaction ?? s.kpiWeights.satisfaction,
    volume: w.volume ?? s.kpiWeights.volume,
  };
}
