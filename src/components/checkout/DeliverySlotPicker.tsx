const TEHRAN_TIME_ZONE = 'Asia/Tehran';

export const DELIVERY_SLOTS = [
  { value: '09-12', label: '۹ تا ۱۲' },
  { value: '12-15', label: '۱۲ تا ۱۵' },
  { value: '15-18', label: '۱۵ تا ۱۸' },
  { value: '18-21', label: '۱۸ تا ۲۱' },
] as const;

function upcomingDays(count: number): { value: string; label: string }[] {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TEHRAN_TIME_ZONE });
  const [year, month, day] = today.split('-').map(Number);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1, day + offset));
    return {
      value: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('fa-IR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }),
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
    <div className="space-y-5">
      <p className="text-sm font-medium text-ink-900">روز تحویل</p>
      <fieldset className="flex gap-3 overflow-x-auto pb-2">
        <legend className="sr-only">روز تحویل</legend>
        {days.map((day) => (
          <label
            key={day.value}
            className={`flex min-w-[9.5rem] cursor-pointer flex-col rounded-2xl border px-4 py-3 text-sm transition ${
              selectedDay === day.value
                ? 'border-burgundy-700 bg-ivory-200/60 text-ink-900 shadow-soft'
                : 'border-ivory-300 text-ink-700 hover:border-gold-500'
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
            <span className="font-medium">{day.label}</span>
          </label>
        ))}
      </fieldset>

      <p className="text-sm font-medium text-ink-900">بازه ساعتی</p>
      <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <legend className="sr-only">بازه ساعتی</legend>
        {DELIVERY_SLOTS.map((slot) => (
          <label
            key={slot.value}
            className={`cursor-pointer rounded-2xl border px-3 py-3 text-center text-sm transition ${
              selectedSlot === slot.value
                ? 'border-burgundy-700 bg-ivory-200/60 font-medium text-ink-900 shadow-soft'
                : 'border-ivory-300 text-ink-700 hover:border-gold-500'
            } ${selectedDay ? '' : 'opacity-60'}`}
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
      </fieldset>
      {!selectedDay && <p className="text-xs text-ink-500">ابتدا روز تحویل را انتخاب کنید.</p>}
    </div>
  );
}
