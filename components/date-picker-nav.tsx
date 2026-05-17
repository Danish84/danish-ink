"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

type Props = {
  selectedDate: string;
  availableDates: string[];
  latestDate: string;
};

export function DatePickerNav({ selectedDate, availableDates, latestDate }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
  const selected = parseLocalDate(selectedDate);
  const min = availableDates.length
    ? parseLocalDate(availableDates[availableDates.length - 1])
    : undefined;
  const max = availableDates.length
    ? parseLocalDate(availableDates[0])
    : undefined;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function onSelect(day: Date | undefined) {
    if (!day) return;
    const iso = formatLocalDate(day);
    if (!availableSet.has(iso)) return;
    setOpen(false);
    const href = iso === latestDate ? "/" : `/?date=${iso}`;
    startTransition(() => router.push(href));
  }

  return (
    <div ref={rootRef} className="relative w-fit">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarIcon className="h-4 w-4" />
        Browse archive
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-label="Browse archive dates"
          className="absolute left-0 top-full z-50 mt-2 rounded-lg bg-popover p-0 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={onSelect}
            defaultMonth={selected}
            startMonth={min}
            endMonth={max}
            disabled={(day) => !availableSet.has(formatLocalDate(day))}
            autoFocus
          />
        </div>
      ) : null}
    </div>
  );
}

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
