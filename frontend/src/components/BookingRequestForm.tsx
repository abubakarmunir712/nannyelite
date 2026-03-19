import { useState } from "react";
import SwissEmploymentDisclaimer from "@/components/SwissEmploymentDisclaimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Baby, Send } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface BookingRequestFormProps {
  nannyUserId: string;
  nannyName: string;
  hourlyRateSpot: number | null;
  hourlyRateRecurring: number | null;
  services: string[];
  children?: React.ReactNode;
}

const SERVICE_OPTIONS = [
  { value: "date_night", label: "Date-Night" },
  { value: "overnight", label: "Overnight" },
  { value: "after_school", label: "After-School" },
  { value: "weekend_holiday", label: "Weekend & Holiday" },
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
];

const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${min}`;
});

const BookingRequestForm = ({
  nannyUserId,
  nannyName,
  hourlyRateSpot,
  hourlyRateRecurring,
  services,
  children,
}: BookingRequestFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [numberOfChildren, setNumberOfChildren] = useState("1");
  const [childrenAges, setChildrenAges] = useState("");
  const [instructions, setInstructions] = useState("");

  const calculateTotal = () => {
    if (!startTime || !endTime || !hourlyRateSpot) return null;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    if (hours <= 0) return null;
    return { hours, total: hours * hourlyRateSpot };
  };

  const estimate = calculateTotal();

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to book.", variant: "destructive" });
      return;
    }
    if (!date || !startTime || !endTime) {
      toast({ title: "Missing fields", description: "Please select a date, start time, and end time.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("bookings").insert({
      family_user_id: user.id,
      nanny_user_id: nannyUserId,
      booking_date: format(date, "yyyy-MM-dd"),
      start_time: startTime + ":00",
      end_time: endTime + ":00",
      service_type: serviceType || null,
      number_of_children: parseInt(numberOfChildren) || 1,
      children_ages: childrenAges || null,
      special_instructions: instructions || null,
      hourly_rate: hourlyRateSpot,
      total_amount: estimate?.total || null,
      status: "pending",
    });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: "Could not send booking request. Please try again.", variant: "destructive" });
    } else {
      toast({ title: "Booking request sent!", description: `${nannyName} will review your request.` });
      setOpen(false);
      // Reset form
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      setServiceType("");
      setNumberOfChildren("1");
      setChildrenAges("");
      setInstructions("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Book {nannyName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEE, MMM d, yyyy") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="End" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.filter((t) => t > startTime).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Service type */}
          <div className="space-y-2">
            <Label>Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_OPTIONS.filter(
                  (s) => services.length === 0 || services.includes(s.label)
                ).map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Children */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Baby className="h-3.5 w-3.5" /> Children</Label>
              <Select value={numberOfChildren} onValueChange={setNumberOfChildren}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ages</Label>
              <Input
                placeholder="e.g. 2, 5"
                value={childrenAges}
                onChange={(e) => setChildrenAges(e.target.value)}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label>Special Instructions</Label>
            <Textarea
              placeholder="Allergies, bedtime routines, anything the nanny should know..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Estimate */}
          {estimate && (
            <div className="bg-muted rounded-xl p-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <Clock className="h-4 w-4 inline mr-1" />
                {estimate.hours.toFixed(1)} hours × CHF {Number(hourlyRateSpot).toFixed(2)}/hr
              </div>
              <span className="text-lg font-bold text-foreground">CHF {estimate.total.toFixed(2)}</span>
            </div>
          )}

          <SwissEmploymentDisclaimer />

          <Button onClick={handleSubmit} disabled={loading} className="w-full rounded-full gap-2">
            <Send className="h-4 w-4" />
            {loading ? "Sending..." : "Send Booking Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingRequestForm;
