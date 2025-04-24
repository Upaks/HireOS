import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobPerformance } from "@/types";

interface JobPerformanceTableProps {
  data: JobPerformance[];
}

export default function JobPerformanceTable({ data }: JobPerformanceTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No job performance data available.
      </div>
    );
  }
  
  return (
    <div className="px-6 py-5 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Job Title</TableHead>
            <TableHead className="whitespace-nowrap">Applications</TableHead>
            <TableHead className="whitespace-nowrap">Assessments</TableHead>
            <TableHead className="whitespace-nowrap">Interviews</TableHead>
            <TableHead className="whitespace-nowrap">Offers</TableHead>
            <TableHead className="whitespace-nowrap">Hires</TableHead>
            <TableHead className="whitespace-nowrap">Conversion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="whitespace-nowrap font-medium">
                {job.title}
                <div className="text-xs text-slate-500">{job.department || job.type}</div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {job.metrics.applications}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {job.metrics.assessments}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {job.metrics.interviews}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {job.metrics.offers}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {job.metrics.hires}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {job.metrics.conversionRate.toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
