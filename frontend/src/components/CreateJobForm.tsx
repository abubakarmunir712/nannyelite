import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const SERVICE_TYPES = [
  { value: "babysitting", label: "Babysitting" },
  { value: "part_time", label: "Part-Time Nanny" },
  { value: "full_time", label: "Full-Time Nanny" },
  { value: "after_school", label: "After-School Care" },
  { value: "date_night", label: "Date-Night" },
  { value: "overnight", label: "Overnight" },
  { value: "weekend_holiday", label: "Weekend & Holiday" },
];

interface CreateJobFormProps {
  onCreated?: () => void;
}

const CreateJobForm = ({ onCreated }: CreateJobFormProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [location, setLocation] = useState("");
  const [schedule, setSchedule] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [numberOfChildren, setNumberOfChildren] = useState("1");
  const [childrenAges, setChildrenAges] = useState("");
  const [requirements, setRequirements] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setServiceType("");
    setLocation("");
    setSchedule("");
    setHourlyRate("");
    setNumberOfChildren("1");
    setChildrenAges("");
    setRequirements("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !serviceType) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    if (title.trim().length > 200) {
      toast({ title: "Title too long (max 200 chars)", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("jobs").insert({
      family_user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      service_type: serviceType,
      location: location.trim() || null,
      schedule: schedule.trim() || null,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      number_of_children: parseInt(numberOfChildren) || 1,
      children_ages: childrenAges.trim() || null,
      requirements: requirements.trim() || null,
      start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Failed to create job", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job posted successfully!" });
      resetForm();
      setOpen(false);
      onCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full gap-2">
          <Plus className="h-4 w-4" /> Post a Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Post a Childcare Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="job-title">Job Title *</Label>
            <Input
              id="job-title"
              placeholder="e.g. After-school nanny for 2 kids"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <Label>Service Type *</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="job-desc">Description</Label>
            <Textarea
              id="job-desc"
              placeholder="Describe the role, expectations, and any special needs..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="job-loc">Location</Label>
              <Input
                id="job-loc"
                placeholder="e.g. Zurich"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="job-rate">Hourly Rate (CHF)</Label>
              <Input
                id="job-rate"
                type="number"
                min="0"
                step="0.50"
                placeholder="25"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                💡 Typical range: CHF 20 – 30/hr depending on experience
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="job-schedule">Schedule</Label>
            <Input
              id="job-schedule"
              placeholder="e.g. Mon-Fri 15:00-18:00"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(d) => d < new Date()} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(d) => d < (startDate || new Date())} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="job-children">Number of Children</Label>
              <Input
                id="job-children"
                type="number"
                min="1"
                max="10"
                value={numberOfChildren}
                onChange={(e) => setNumberOfChildren(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="job-ages">Children's Ages</Label>
              <Input
                id="job-ages"
                placeholder="e.g. 3 and 6"
                value={childrenAges}
                onChange={(e) => setChildrenAges(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="job-req">Requirements</Label>
            <Textarea
              id="job-req"
              placeholder="e.g. First aid certified, speaks French..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              maxLength={1000}
              rows={2}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Posting..." : "Post Job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJobForm;
