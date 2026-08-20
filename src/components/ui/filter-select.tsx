"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Base UI Select는 빈 문자열 값을 특별 취급할 수 있어, "전체"(필터 없음)를
// 내부적으로는 별도 sentinel로 다루고 바깥 API는 계속 ""를 쓰게 한다.
const ALL_VALUE = "__all__";

type Option = { value: string; label: string };

export function FilterSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
}) {
  const labelByValue = Object.fromEntries(
    options.map((option) => [option.value || ALL_VALUE, option.label]),
  );

  return (
    <Select
      value={value === "" ? ALL_VALUE : value}
      onValueChange={(next) =>
        onValueChange(next === ALL_VALUE || next === null ? "" : next)
      }
    >
      <SelectTrigger className="h-8 w-fit min-w-28 text-sm">
        <SelectValue>
          {(selected: string) => labelByValue[selected] ?? selected}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem
            key={option.value || ALL_VALUE}
            value={option.value || ALL_VALUE}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
