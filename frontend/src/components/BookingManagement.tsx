import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X, Clock, ChevronRight } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Booking {
  id: string;
  nanny_user_id: string;
  family_user_id: string;
  status: string;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  service_type: string | null;
  number_of_children: number;
  total_amount: number | null;
  nanny_name?: string;
  family_name?: string;
  special_instructions?: string | null;
  children_ages?: string | null;
  hourly_rate?: number | null;
}

const SERVICE_LABELS: Record<string, string> = {
  date_night: "Date-Night",
  overnight: "Overnight",
  after_school: "After-School",
  weekend_holiday: "Weekend & Holiday",
  full_time: "Full-Time",
  part_time: "Part-Time",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const formatBookingDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
};

interface BookingManagementProps {
  bookings: Booking[];
  isFamily: boolean;
  onUpdate: (id: string, status: string) => void;
}

const BookingManagement = ({ bookings, isFamily, onUpdate }: BookingManagementProps) => {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const upcomingBookings = bookings.filter((b) => !isPast(new Date(b.booking_date)) && b.status !== "cancelled");
  const pastBookings = bookings.filter((b) => isPast(new Date(b.booking_date)) || b.status === "cancelled");

  const handleAction = async (bookingId: string, newStatus: string) => {
    setLoadingId(bookingId);
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);
    
    setLoadingId(null);

    if (error) {
      toast({ title: "Error", description: "Could not update booking.", variant: "destructive" });
    } else {
      toast({ title: newStatus === "confirmed" ? "Booking confirmed!" : "Booking cancelled." });
      onUpdate(bookingId, newStatus);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Upcoming Bookings
        </h2>
        {upcomingBookings.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No upcoming bookings</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((b) => (
              <div key={b.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground text-sm">
                        {isFamily ? b.nanny_name : b.family_name}
                      </span>
                      <Badge className={`text-[10px] ${STATUS_STYLES[b.status] || ""}`}>
                        {b.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatBookingDate(b.booking_date)}</span>
                      {b.start_time && <span>{b.start_time.slice(0, 5)} – {b.end_time?.slice(0, 5)}</span>}
                      {b.service_type && <span>{SERVICE_LABELS[b.service_type] || b.service_type}</span>}
                    </div>
                    {b.special_instructions && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{b.special_instructions}"</p>
                    )}
                  </div>
                  {b.total_amount && (
                    <span className="text-sm font-semibold text-foreground">CHF {Number(b.total_amount).toFixed(0)}</span>
                  )}
                </div>

                {/* Action buttons for pending bookings */}
                {b.status === "pending" && (
                  <div className="flex gap-2 mt-3 ml-16">
                    {!isFamily && (
                      <Button
                        size="sm"
                        className="rounded-full gap-1"
                        disabled={loadingId === b.id}
                        onClick={() => handleAction(b.id, "confirmed")}
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full gap-1 text-destructive hover:text-destructive"
                          disabled={loadingId === b.id}
                        >
                          <X className="h-3.5 w-3.5" /> {isFamily ? "Cancel" : "Decline"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{isFamily ? "Cancel this booking?" : "Decline this booking?"}</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The {isFamily ? "nanny" : "family"} will be notified.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleAction(b.id, "cancelled")}>
                            {isFamily ? "Cancel Booking" : "Decline"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {isFamily && b.status === "pending" && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                        <Clock className="h-3 w-3" /> Awaiting nanny response
                      </span>
                    )}
                  </div>
                )}

                {b.status === "confirmed" && (
                  <div className="flex gap-2 mt-3 ml-16">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="rounded-full gap-1 text-destructive hover:text-destructive" disabled={loadingId === b.id}>
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel this confirmed booking?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This booking has already been confirmed. Are you sure you want to cancel?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleAction(b.id, "cancelled")}>
                            Cancel Booking
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-muted-foreground mb-3">Past Bookings</h2>
          <div className="space-y-2">
            {pastBookings.slice(0, 5).map((b) => (
              <div key={b.id} className="bg-card/60 rounded-xl border border-border p-4 flex items-center gap-4 opacity-70">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{isFamily ? b.nanny_name : b.family_name}</span>
                    <Badge className={`text-[10px] ${STATUS_STYLES[b.status] || ""}`}>{b.status}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(b.booking_date), "MMM d, yyyy")}</span>
                </div>
                {b.total_amount && (
                  <span className="text-sm text-muted-foreground">CHF {Number(b.total_amount).toFixed(0)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;
