import { ActivityLog } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { 
  User, 
  CheckCircle, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Mail,
  Award
} from "lucide-react";

interface ActivityFeedProps {
  activities: ActivityLog[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recent activities found.
      </div>
    );
  }
  
  const getActivityIcon = (activity: ActivityLog) => {
    switch (activity.entityType) {
      case 'job':
        return <FileText className="h-5 w-5 text-slate-500" />;
      case 'candidate':
        return <User className="h-5 w-5 text-slate-500" />;
      case 'interview':
        return <Calendar className="h-5 w-5 text-slate-500" />;
      case 'evaluation':
        return <CheckCircle className="h-5 w-5 text-slate-500" />;
      case 'offer':
        return <Award className="h-5 w-5 text-slate-500" />;
      case 'email':
        return <Mail className="h-5 w-5 text-slate-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-slate-500" />;
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {activities.map((activity, index) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {/* Line to connect events, except for last item */}
              {index < activities.length - 1 && (
                <span 
                  className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-slate-200" 
                  aria-hidden="true" 
                />
              )}
              
              <div className="relative flex items-start space-x-3">
                {/* Activity icon */}
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center ring-8 ring-white">
                    {getActivityIcon(activity)}
                  </div>
                </div>
                
                {/* Activity content */}
                <div className="min-w-0 flex-1 py-1.5">
                  <div className="text-sm text-slate-500">
                    <span className="font-medium text-slate-900">
                      {activity.user?.fullName || 'System'}
                    </span>{' '}
                    {activity.action}
                    {activity.details && activity.details.candidateName && (
                      <span>
                        {' with '}
                        <span className="font-medium text-slate-900">
                          {activity.details.candidateName}
                        </span>
                      </span>
                    )}
                    {activity.details && activity.details.jobTitle && (
                      <span>
                        {' for '}
                        <span className="font-medium text-slate-900">
                          {activity.details.jobTitle}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
