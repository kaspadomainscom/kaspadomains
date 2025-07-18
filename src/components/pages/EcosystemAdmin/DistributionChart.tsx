import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartProps {
  chartData: { time: string; kas: number }[];
}

export default function DistributionChart({ chartData }: ChartProps) {
  return (
    <section
      aria-label="Distribution graph"
      className="h-[320px] w-full space-y-4"
    >
      <h2 className="text-2xl font-semibold text-kaspaDark">Distribution Over Time (KAS)</h2>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="time" />
            <YAxis
              label={{
                value: "KAS",
                angle: -90,
                position: "insideLeft",
              }}
              domain={[0, "auto"]}
            />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="kas"
              stroke="#00796b"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-500 italic">No distribution data available.</p>
      )}
    </section>
  );
}
