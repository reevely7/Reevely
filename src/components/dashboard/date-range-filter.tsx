"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatParam(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplay(date: Date): string {
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

type Props = {
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
};

export function DateRangeFilter({ dateFrom, dateTo, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const range: DateRange | undefined =
    dateFrom || dateTo
      ? {
          from: dateFrom ? parseLocalDate(dateFrom) : undefined,
          to: dateTo ? parseLocalDate(dateTo) : undefined,
        }
      : undefined;

  const label = range?.from
    ? range.to
      ? `${formatDisplay(range.from)} ~ ${formatDisplay(range.to)}`
      : `${formatDisplay(range.from)} ~`
    : "날짜 전체";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs text-foreground hover:bg-accent">
        <CalendarIcon className="size-3.5 text-muted-foreground" aria-hidden />
        {label}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-auto gap-0 bg-[#2e2e2e] p-0"
      >
        <Calendar
          mode="range"
          captionLayout="dropdown"
          showOutsideDays={false}
          selected={range}
          defaultMonth={range?.from}
          onSelect={(next) => {
            onChange(
              next?.from ? formatParam(next.from) : "",
              next?.to ? formatParam(next.to) : "",
            );
          }}
        />
        {(dateFrom || dateTo) && (
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => {
                onChange("", "");
                setOpen(false);
              }}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              날짜 필터 삭제
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
