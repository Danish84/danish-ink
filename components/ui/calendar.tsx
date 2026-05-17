"use client";

import * as React from "react";
import {
  DayPicker,
  type DayButton,
  type DayPickerProps,
} from "react-day-picker";

type CalendarProps = Omit<DayPickerProps, "mode"> & {
  selected?: Date;
  onSelect?: (day: Date | undefined) => void;
};

function Calendar({ selected, onSelect, ...props }: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      showOutsideDays
      autoFocus
      {...props}
      classNames={{
        root: "ed-cal-root",
        months: "ed-cal-months",
        month: "ed-cal-month",
        nav: "ed-cal-nav",
        button_previous: "ed-cal-nav-btn",
        button_next: "ed-cal-nav-btn",
        month_caption: "ed-cal-caption",
        caption_label: "ed-cal-caption-label",
        weekdays: "ed-cal-weekdays",
        weekday: "ed-cal-weekday",
        week: "ed-cal-week",
        day: "ed-cal-day",
        today: "ed-cal-today",
        outside: "ed-cal-outside",
        disabled: "ed-cal-disabled",
        hidden: "ed-cal-hidden",
      }}
      formatters={{
        formatWeekdayName: (date) =>
          date.toLocaleDateString(undefined, { weekday: "narrow" }),
        formatCaption: (date) =>
          date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      }}
      components={{
        DayButton: EditorialDayButton,
        Chevron: ({ orientation }) => (
          <span aria-hidden="true">{orientation === "left" ? "‹" : "›"}</span>
        ),
      }}
    />
  );
}

function EditorialDayButton(
  props: React.ComponentProps<typeof DayButton>,
) {
  const { day, modifiers, className, ...buttonProps } = props;
  void className;
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-selected={modifiers.selected ? "true" : undefined}
      data-today={modifiers.today ? "true" : undefined}
      className="ed-day-btn"
      {...buttonProps}
    >
      {day.date.getDate()}
    </button>
  );
}

export { Calendar };
