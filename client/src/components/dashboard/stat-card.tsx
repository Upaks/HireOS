import { ReactNode } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  linkText?: string;
  linkHref?: string;
  iconColor?: string;
  iconBgColor?: string;
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  icon,
  linkText,
  linkHref,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  onClick
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={cn("rounded-md p-3", iconBgColor)}>
              <div className={cn("h-6 w-6", iconColor)}>
                {icon}
              </div>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-slate-500 truncate">{title}</dt>
              <dd>
                <div className="text-xl font-semibold text-slate-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      
      {(linkText && linkHref) && (
        <CardFooter className="bg-slate-50 px-5 py-3">
          <div className="text-sm">
            <a 
              href={linkHref} 
              className="font-medium text-primary hover:text-primary-dark"
              onClick={(e) => {
                if (onClick) {
                  e.preventDefault();
                  onClick();
                }
              }}
            >
              {linkText}
            </a>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
