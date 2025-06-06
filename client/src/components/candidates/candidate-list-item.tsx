import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Candidate } from "@/types";
import { getStatusDisplay } from "@/lib/candidate-status";
import CandidateDetailDialog from "./candidate-detail-dialog";
import { Star, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface CandidateListItemProps {
  candidate: Candidate;
  index: number; // For alternating row colors
}

export default function CandidateListItem({ candidate, index }: CandidateListItemProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const { code, label, bgColor, textColor } = getStatusDisplay(candidate.status);
  
  return (
    <>
      <tr className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-slate-900">{candidate.name}</div>
              <div className="text-xs text-slate-500">{candidate.email}</div>
            </div>
          </div>
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-slate-900">{candidate.job?.title || `Job ID: ${candidate.jobId}`}</div>
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          <Badge className={`${bgColor} ${textColor}`}>{code} {label}</Badge>
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          {candidate.hiPeoplePercentile ? (
            <div className="flex items-center">
              <div className="w-24 bg-slate-200 rounded-full h-2 mr-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${candidate.hiPeoplePercentile}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium">{candidate.hiPeoplePercentile}%</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">N/A</span>
          )}
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          {candidate.createdAt ? (
            <span className="text-xs text-slate-600">
              {format(new Date(candidate.createdAt), 'MMM d, yyyy')}
            </span>
          ) : (
            <span className="text-xs text-slate-500">N/A</span>
          )}
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          {(candidate.technicalProficiency || 
            candidate.leadershipInitiative || 
            candidate.problemSolving || 
            candidate.communicationSkills || 
            candidate.culturalFit) ? (
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={
                    i < ((candidate.technicalProficiency || 0) + 
                         (candidate.leadershipInitiative || 0) + 
                         (candidate.problemSolving || 0) + 
                         (candidate.communicationSkills || 0) + 
                         (candidate.culturalFit || 0)) / 5
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-slate-300"
                  }
                />
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-500">Not rated</span>
          )}
        </td>

        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
             <div className="flex justify-end space-x-2">
               {/*  {candidate.resumeUrl && (
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink size={16} />
              </a>
            )} */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailOpen(true)}
              className="text-xs px-2 py-1 h-auto"
            >
              View Details
            </Button>
          </div>
        </td>
      </tr>

      <CandidateDetailDialog
        candidate={candidate}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
}