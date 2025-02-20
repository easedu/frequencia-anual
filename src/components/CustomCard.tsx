"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface CustomCardProps {
    title: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    href: string;
}

export function CustomCard({ title, icon: Icon, href }: CustomCardProps) {
    const router = useRouter();

    return (
        <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(href)}
        >
            <CardHeader className="flex flex-col items-center">
                <Icon className="h-12 w-12 mb-2" />
                <CardTitle>{title}</CardTitle>
            </CardHeader>
        </Card>
    );
}