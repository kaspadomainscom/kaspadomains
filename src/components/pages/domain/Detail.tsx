// components/domain/Detail.tsx
import React from "react";

type Props = {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
};

export function Detail({ label, value, valueClass = "" }: Props) {
  return (
    <div className="flex gap-2 text-sm md:text-base">
      <span className="font-medium text-gray-700 min-w-[120px]">{label}:</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
