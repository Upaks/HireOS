import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, CheckCircle } from "lucide-react";
import { format, parseISO, addDays, startOfDay } from "date-fns";

interface AvailableSlot {
  start: string;
  end: string;
}

interface UserInfo {
  id: number;
  fullName: string;
  email: string;
}

export default function BookPage() {
  const { userId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<number | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<{
    candidateName: string;
    candidateEmail: string;
    scheduledDate: string;
  } | null>(null);

  // Override global overflow hidden for this public page (must be before any conditional returns)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    
    const originalHtmlOverflow = html.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    const originalRootOverflow = root?.style.overflow;
    
    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    if (root) root.style.overflow = 'auto';
    
    return () => {
      html.style.overflow = originalHtmlOverflow;
      body.style.overflow = originalBodyOverflow;
      if (root) root.style.overflow = originalRootOverflow || '';
    };
  }, []);

  // Get jobId and candidateId from URL params if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobIdParam = params.get("jobId");
    const candidateIdParam = params.get("candidateId");
    if (jobIdParam) setJobId(jobIdParam);
    if (candidateIdParam) setCandidateId(parseInt(candidateIdParam));
  }, []);

  // Fetch user info
  const { data: userInfo, isLoading: isLoadingUserInfo } = useQuery<UserInfo>({
    queryKey: [`/api/users/${userId}/public`],
    enabled: !!userId,
  });

  // Fetch available slots - use stable dates
  const [startDate] = useState(() => new Date());
  const [endDate] = useState(() => addDays(startDate, 30));
  
  // Build query URL with properly encoded parameters
  const slotsQueryUrl = userId && userInfo
    ? `/api/google-calendar/available-slots?${new URLSearchParams({
        userId: userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }).toString()}`
    : null;
  
  const { data: slotsData, isLoading: isLoadingSlots, error: slotsError } = useQuery<{ availableSlots: AvailableSlot[] }>({
    queryKey: slotsQueryUrl ? [slotsQueryUrl] : ['skip'],
    enabled: !!userId && !!userInfo && !!slotsQueryUrl, // Only fetch slots if user info is loaded
    refetchInterval: (query) => {
      // Don't refetch if there's an error
      if (query.state.error) return false;
      return 60000; // Refetch every minute to get updated availability
    },
  });

  // Book interview mutation
  const bookMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      candidateName: string;
      candidateEmail: string;
      scheduledDate: string;
      jobId?: number | null;
      candidateId?: number | null;
    }) => {
      const res = await apiRequest("POST", "/api/google-calendar/book", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      setBookingSuccess({
        candidateName,
        candidateEmail,
        scheduledDate: selectedSlot!.start,
      });
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to book interview",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group slots by date
  const slotsByDate = (slotsData?.availableSlots || []).reduce((acc, slot) => {
    const date = format(parseISO(slot.start), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, AvailableSlot[]>);

  const availableDates = Object.keys(slotsByDate).sort();

  const handleDateSelect = (date: string) => {
    setSelectedDate(parseISO(date));
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
  };

  const handleBook = () => {
    if (!selectedSlot || !candidateName || !candidateEmail || !userId) {
      toast({
        title: "Please fill in all fields",
        description: "Name, email, date, and time are required.",
        variant: "destructive",
      });
      return;
    }

    bookMutation.mutate({
      userId: parseInt(userId),
      candidateName,
      candidateEmail,
      scheduledDate: selectedSlot.start,
      jobId: jobId ? parseInt(jobId) : null,
      candidateId: candidateId || null,
    });
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">Invalid booking link</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingUserInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">
              {slotsError ? "Google Calendar is not connected for this user" : "User not found or Google Calendar not connected"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" style={{ minHeight: '100vh', overflowY: 'auto' }}>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {bookingSuccess ? "Interview Scheduled!" : "Schedule an Interview"}
            </CardTitle>
            <CardDescription>
              {bookingSuccess 
                ? "Your interview has been successfully scheduled"
                : userInfo 
                  ? `Book a time with ${userInfo.fullName}` 
                  : "Select a date and time for your interview"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            {/* Success Message */}
            {bookingSuccess && (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-green-100 p-4">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  You're all set!
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Your interview has been scheduled for
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 inline-block">
                  <p className="text-xl font-semibold text-gray-900">
                    {format(parseISO(bookingSuccess.scheduledDate), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-lg text-gray-700 mt-1">
                    {format(parseISO(bookingSuccess.scheduledDate), "h:mm a")}
                  </p>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    A confirmation email has been sent to <strong>{bookingSuccess.candidateEmail}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    You'll receive a calendar invitation with all the details. We look forward to speaking with you!
                  </p>
                </div>
              </div>
            )}
            
            {/* Booking Form - Hide when success */}
            {!bookingSuccess && (
              <>
            {/* Candidate Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="candidate-name">Your Name *</Label>
                <Input
                  id="candidate-name"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="candidate-email">Your Email *</Label>
                <Input
                  id="candidate-email"
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <Label>Select a Date *</Label>
              {isLoadingSlots ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Loading available dates...</p>
                </div>
              ) : slotsError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-2">
                  <p className="text-sm text-red-800">
                    {slotsError instanceof Error ? slotsError.message : "Failed to load available dates. Please try again later."}
                  </p>
                </div>
              ) : availableDates.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">No available dates in the next 30 days</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mt-2">
                  {availableDates.map((date) => (
                    <Button
                      key={date}
                      variant={selectedDate && format(selectedDate, "yyyy-MM-dd") === date ? "default" : "outline"}
                      onClick={() => handleDateSelect(date)}
                      className="h-auto py-3 flex flex-col"
                    >
                      <span className="text-xs opacity-70">{format(parseISO(date), "EEE")}</span>
                      <span className="text-lg font-semibold">{format(parseISO(date), "d")}</span>
                      <span className="text-xs opacity-70">{format(parseISO(date), "MMM")}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Time Slot Selection */}
            {selectedDate && (
              <div>
                <Label>Select a Time *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                  {slotsByDate[format(selectedDate, "yyyy-MM-dd")]?.map((slot, index) => (
                    <Button
                      key={index}
                      variant={selectedSlot?.start === slot.start ? "default" : "outline"}
                      onClick={() => handleSlotSelect(slot)}
                      className="h-auto py-2"
                    >
                      {format(parseISO(slot.start), "h:mm a")}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Book Button */}
            {selectedSlot && candidateName && candidateEmail && (
              <div className="pt-4 border-t">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-900">Ready to book</span>
                  </div>
                  <p className="text-sm text-green-800">
                    {format(parseISO(selectedSlot.start), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <Button
                  onClick={handleBook}
                  disabled={bookMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {bookMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Interview
                    </>
                  )}
                </Button>
              </div>
            )}
            </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
