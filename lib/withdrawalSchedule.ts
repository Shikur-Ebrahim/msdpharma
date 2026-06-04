export const WITHDRAWAL_TIMEZONE = "Africa/Addis_Ababa";

export type WithdrawalScheduleSettings = {
    activeDays?: unknown;
    startTime?: string;
    endTime?: string;
    minAmount?: number;
    maxAmount?: number;
    frequency?: number;
};

const WEEKDAY_TO_NUM: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

export const DEFAULT_ACTIVE_DAYS = [1, 2, 3, 4, 5, 6];

export function normalizeActiveDays(activeDays: unknown): number[] {
    if (!Array.isArray(activeDays) || activeDays.length === 0) {
        return [...DEFAULT_ACTIVE_DAYS];
    }
    const normalized = activeDays
        .map((d) => (typeof d === "string" ? parseInt(d, 10) : Number(d)))
        .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
    return normalized.length > 0 ? normalized : [...DEFAULT_ACTIVE_DAYS];
}

export type NormalizedWithdrawalSettings = WithdrawalScheduleSettings & {
    activeDays: number[];
    startTime: string;
    endTime: string;
    minAmount: number;
    maxAmount: number;
    frequency: number;
};

export function normalizeWithdrawalSettings(
    raw: WithdrawalScheduleSettings | null | undefined
): NormalizedWithdrawalSettings {
    return {
        minAmount: raw?.minAmount ?? 300,
        maxAmount: raw?.maxAmount ?? 40000,
        frequency: raw?.frequency ?? 1,
        activeDays: normalizeActiveDays(raw?.activeDays),
        startTime: raw?.startTime ?? "09:00",
        endTime: raw?.endTime ?? "17:00",
    };
}

/** Current weekday (0=Sun) and minutes since midnight in Ethiopia (EAT). */
export function getEthiopiaNow(): { dayOfWeek: number; minutes: number } {
    const now = new Date();
    const weekdayShort = new Intl.DateTimeFormat("en-US", {
        timeZone: WITHDRAWAL_TIMEZONE,
        weekday: "short",
    }).format(now);
    const dayOfWeek = WEEKDAY_TO_NUM[weekdayShort] ?? now.getDay();

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: WITHDRAWAL_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);

    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

    return { dayOfWeek, minutes: hour * 60 + minute };
}

export function parseTimeToMinutes(timeStr: string | undefined, fallback = "09:00"): number {
    const [h, m] = (timeStr || fallback).split(":").map(Number);
    return h * 60 + (m || 0);
}

export function formatScheduleTime(timeStr: string | undefined): string {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    return `${String(h).padStart(2, "0")}:${String(m ?? "00").padStart(2, "0")}`;
}

export function isWithdrawalOpen(settings: WithdrawalScheduleSettings): boolean {
    const normalized = normalizeWithdrawalSettings(settings);
    const { dayOfWeek, minutes } = getEthiopiaNow();
    const start = parseTimeToMinutes(normalized.startTime);
    const end = parseTimeToMinutes(normalized.endTime);

    if (!normalized.activeDays.includes(dayOfWeek)) {
        return false;
    }

    return minutes >= start && minutes <= end;
}

export type NextWithdrawalOpen = {
    daysUntil: number;
    dayOfWeek: number;
    startTime: string;
};

/** When closed, find the next calendar day (in EAT) when the window opens. */
export function getNextWithdrawalOpen(settings: WithdrawalScheduleSettings): NextWithdrawalOpen {
    const normalized = normalizeWithdrawalSettings(settings);
    const activeDays = [...normalized.activeDays].sort((a, b) => a - b);
    const startTime = normalized.startTime;
    const { dayOfWeek, minutes } = getEthiopiaNow();
    const startMinutes = parseTimeToMinutes(startTime);

    if (activeDays.includes(dayOfWeek) && minutes < startMinutes) {
        return { daysUntil: 0, dayOfWeek, startTime };
    }

    for (let offset = 1; offset <= 7; offset++) {
        const nextDay = (dayOfWeek + offset) % 7;
        if (activeDays.includes(nextDay)) {
            return { daysUntil: offset, dayOfWeek: nextDay, startTime };
        }
    }

    return {
        daysUntil: 1,
        dayOfWeek: activeDays[0] ?? 1,
        startTime,
    };
}

export type WithdrawalStatusLabels = {
    opensAt: string;
    opensAtTomorrow: string;
    opensTodayAt: string;
    opensOnDayAt: string;
    pleaseWaitUntil: string;
    availableUntil: string;
    closed: string;
    active: string;
};

export function getWithdrawalClosedMessage(
    settings: WithdrawalScheduleSettings,
    labels: WithdrawalStatusLabels,
    dayNames: Record<number, string>
): string {
    const normalized = normalizeWithdrawalSettings(settings);
    const next = getNextWithdrawalOpen(settings);
    const time = formatScheduleTime(next.startTime);

    if (next.daysUntil === 0) {
        if (labels.opensTodayAt) {
            return labels.opensTodayAt.replace("{time}", time);
        }
        return labels.opensAt.replace("{time}", time);
    }

    if (next.daysUntil === 1) {
        return labels.opensAtTomorrow.replace("{time}", time);
    }

    const dayLabel = dayNames[next.dayOfWeek] ?? "";
    if (labels.opensOnDayAt) {
        return labels.opensOnDayAt.replace("{day}", dayLabel).replace("{time}", time);
    }

    return labels.opensAtTomorrow.replace("{time}", time);
}

/** Start of the current calendar day in Ethiopia (for frequency limits). */
export function getEthiopiaStartOfDay(date: Date = new Date()): Date {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: WITHDRAWAL_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return new Date(`${year}-${month}-${day}T00:00:00+03:00`);
}
