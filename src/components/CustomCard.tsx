import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface CustomCardProps {
    title: string;
    icon: LucideIcon;
    href: string;
    color?: string;
}

export function CustomCard({ title, icon: Icon, href, color = "gray" }: CustomCardProps) {
    return (
        <Link href={href}>
            <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                <Icon className={`w-10 h-10 mb-3 text-${color}-500`} />
                <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            </div>
        </Link>
    );
}