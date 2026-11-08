const TEHRAN_TIME_ZONE = "Asia/Tehran";

export const DELIVERY_SLOTS = [
  { value: "09-12", label: "۹ تا ۱۲" },
  { value: "12-15", label: "۱۲ تا ۱۵" },
  { value: "15-18", label: "۱۵ تا ۱۸" },
  { value: "18-21", label: "۱۸ تا ۲۱" },
] as const;

function upcomingDays(count: number): { value: string; label: string }[] {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TEHRAN_TIME_ZONE });
  const [year, month, day] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1, day + offset));
    return {
      value: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("fa-IR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }),
    };
  });
}

export function deliverySlotValue(day: string, slot: string): string {
  return `${day} ${slot}`;
}

export default function DeliverySlotPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string) => void;
}) {
  const days = upcomingDays(7);
  const selectedDay = value?.slice(0, 10) ?? null;
  const selectedSlot = value?.slice(11) ?? null;

  return (
    <div className="min-w-0 max-w-full space-y-3.5 sm:space-y-5">
      <p className="text-xs font-medium text-ink-900 sm:text-sm">روز تحویل</p>
      <div role="radiogroup" aria-label="روز تحویل" className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-2 sm:gap-3">
        {days.map((day) => (
          <label
            key={day.value}
            className={`flex min-w-[7.25rem] shrink-0 cursor-pointer flex-col rounded-xl border px-3 py-2.5 text-center text-xs transition sm:min-w-[9rem] sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${
              selectedDay === day.value
                ? "border-burgundy-700 bg-ivory-200/60 font-medium text-ink-900 shadow-soft"
                : "border-ivory-300 bg-ivory-50 text-ink-700 hover:border-gold-500"
            }`}
          >
            <input
              type="radio"
              name="delivery-day"
              value={day.value}
              checked={selectedDay === day.value}
              onChange={() => onChange(deliverySlotValue(day.value, selectedSlot ?? DELIVERY_SLOTS[0].value))}
              className="sr-only"
            />
            <span className="truncate font-medium">{day.label}</span>
          </label>
        ))}
      </div>

      <p className="text-xs font-medium text-ink-900 sm:text-sm">بازه ساعتی</p>
      <div role="radiogroup" aria-label="بازه ساعتی" className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        {DELIVERY_SLOTS.map((slot) => (
          <label
            key={slot.value}
            className={`cursor-pointer rounded-xl border px-2.5 py-2.5 text-center text-xs transition sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm ${
              selectedSlot === slot.value
                ? "border-burgundy-700 bg-ivory-200/60 font-medium text-ink-900 shadow-soft"
                : "border-ivory-300 bg-ivory-50 text-ink-700 hover:border-gold-500"
            } ${selectedDay ? "" : "opacity-60"}`}
          >
            <input
              type="radio"
              name="delivery-slot"
              value={slot.value}
              checked={selectedSlot === slot.value}
              disabled={!selectedDay}
              onChange={() => selectedDay && onChange(deliverySlotValue(selectedDay, slot.value))}
              className="sr-only"
            />
            {slot.label}
          </label>
        ))}
      </div>
      {!selectedDay && <p className="text-xs text-ink-500">ابتدا روز تحویل را انتخاب کنید.</p>}
    </div>
  );
}
