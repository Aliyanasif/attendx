"use client";

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  type?: "default" | "success" | "danger";
}

export default function StatCard({ label, value, subtext, type = "default" }: StatCardProps) {
  const valueColor = {
    default: "text-gray-900",
    success: "text-green-600",
    danger: "text-red-600",
  }[type];

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <h2 className={`text-3xl font-bold mt-2 ${valueColor}`}>{value}</h2>
      <p className="text-xs text-gray-400 mt-1">{subtext}</p>
    </div>
  );
}