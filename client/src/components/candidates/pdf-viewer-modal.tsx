import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeUrl: string;
}

export default function PDFViewerModal({
  isOpen,
  onClose,
  resumeUrl
}: PDFViewerModalProps) {
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    const checkIfExists = async () => {
      const path = resumeUrl.split("/resumes/")[1]; // e.g., candidate-17.pdf
      if (!path) return setExists(false);

      const { data, error } = await supabase.storage
        .from("resumes")
        .list("", { search: path });

      setExists(!!data?.length && !error);
    };

    if (isOpen) {
      setExists(null); // Reset on open
      checkIfExists();
    }
  }, [resumeUrl, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] max-w-[90rem] h-[90vh] p-0 overflow-hidden flex flex-col">
        <div className="px-4 py-2 font-semibold text-base border-b">
          Candidate Resume
        </div>

        {exists === null ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !exists ? (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <h2 className="text-lg font-semibold text-red-600">Resume Not Found</h2>
              <p className="text-sm text-muted-foreground mt-2">
                This candidate’s resume was not uploaded yet or the file may have been removed from storage.
              </p>
            </div>
          </div>
        ) : (
          <iframe
            src={`${resumeUrl}?t=${Date.now()}`}
            title="Resume PDF"
            className="flex-1 w-full border-0"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
