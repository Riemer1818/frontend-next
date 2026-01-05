'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface TimeEntryEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    project_id: number;
    project_name: string;
    project_color: string;
    total_hours: number;
    chargeable_hours: number;
    notes?: string;
    objective?: string;
    location?: string;
  };
}

export default function TimeEntriesPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<typeof Views[keyof typeof Views]>(Views.MONTH);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimeEntryEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    contact_ids: [] as number[],
    date: '',
    start_time: '',
    end_time: '',
    total_hours: '',
    chargeable_hours: '',
    location: '',
    objective: '',
    notes: '',
  });

  // Auto-calculate total hours when start/end time changes
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      const diffMinutes = differenceInMinutes(end, start);
      if (diffMinutes > 0) {
        const hours = (diffMinutes / 60).toFixed(2);
        setFormData(prev => ({
          ...prev,
          total_hours: hours,
          // Auto-set chargeable hours to total if not set
          chargeable_hours: prev.chargeable_hours || hours,
        }));
      }
    }
  }, [formData.start_time, formData.end_time]);

  // Calculate date range for query
  const dateRange = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [currentDate]);

  // Fetch time entries
  const { data: timeEntries, isLoading, refetch } = trpc.timeEntries.getByDateRange.useQuery(dateRange);

  // Fetch projects for dropdown
  const { data: projects } = trpc.project.getAll.useQuery();

  // Fetch contacts for dropdown
  const { data: contacts } = trpc.contact.getAllWithCompany.useQuery();

  // Mutations
  const createMutation = trpc.timeEntries.create.useMutation({
    onSuccess: () => {
      toast.success('Time entry created successfully');
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.timeEntries.update.useMutation({
    onSuccess: () => {
      toast.success('Time entry updated successfully');
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.timeEntries.delete.useMutation({
    onSuccess: () => {
      toast.success('Time entry deleted successfully');
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Convert time entries to calendar events
  const events: TimeEntryEvent[] = useMemo(() => {
    if (!timeEntries) return [];
    return timeEntries.map((entry: any) => ({
      id: entry.id,
      title: `${entry.project_name} (${entry.chargeable_hours}h)`,
      start: entry.start_time ? new Date(entry.start_time) : new Date(entry.date),
      end: entry.end_time ? new Date(entry.end_time) : new Date(entry.date),
      resource: {
        project_id: entry.project_id,
        project_name: entry.project_name,
        project_color: entry.project_color || '#1e3a8a',
        total_hours: entry.total_hours,
        chargeable_hours: entry.chargeable_hours,
        notes: entry.notes,
        objective: entry.objective,
        location: entry.location,
      },
    }));
  }, [timeEntries]);

  // Handle slot selection (clicking on empty calendar slot)
  const handleSelectSlot = useCallback((slotInfo: any) => {
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    setSelectedEvent(null);
    setFormData({
      project_id: '',
      contact_ids: [],
      date: format(slotInfo.start, 'yyyy-MM-dd'),
      start_time: format(slotInfo.start, "yyyy-MM-dd'T'HH:mm"),
      end_time: format(slotInfo.end, "yyyy-MM-dd'T'HH:mm"),
      total_hours: '',
      chargeable_hours: '',
      location: '',
      objective: '',
      notes: '',
    });
    setIsDialogOpen(true);
  }, []);

  // Handle event selection (clicking on existing event)
  const handleSelectEvent = useCallback((event: TimeEntryEvent) => {
    setSelectedEvent(event);
    setSelectedSlot(null);
    const entry = timeEntries?.find((e: any) => e.id === event.id);
    if (entry) {
      setFormData({
        project_id: entry.project_id.toString(),
        contact_ids: entry.contacts?.map((c: any) => c.id) || [],
        date: format(new Date(entry.date), 'yyyy-MM-dd'),
        start_time: entry.start_time ? format(new Date(entry.start_time), "yyyy-MM-dd'T'HH:mm") : '',
        end_time: entry.end_time ? format(new Date(entry.end_time), "yyyy-MM-dd'T'HH:mm") : '',
        total_hours: entry.total_hours.toString(),
        chargeable_hours: entry.chargeable_hours.toString(),
        location: entry.location || '',
        objective: entry.objective || '',
        notes: entry.notes || '',
      });
    }
    setIsDialogOpen(true);
  }, [timeEntries]);

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedSlot(null);
    setSelectedEvent(null);
    setFormData({
      project_id: '',
      contact_ids: [],
      date: '',
      start_time: '',
      end_time: '',
      total_hours: '',
      chargeable_hours: '',
      location: '',
      objective: '',
      notes: '',
    });
  };

  const handleSubmit = () => {
    if (!formData.project_id || !formData.date || !formData.total_hours || !formData.chargeable_hours) {
      toast.error('Please fill in all required fields');
      return;
    }

    const data = {
      project_id: parseInt(formData.project_id),
      contact_ids: formData.contact_ids.length > 0 ? formData.contact_ids : undefined,
      date: formData.date,
      start_time: formData.start_time || undefined,
      end_time: formData.end_time || undefined,
      total_hours: parseFloat(formData.total_hours),
      chargeable_hours: parseFloat(formData.chargeable_hours),
      location: formData.location || undefined,
      objective: formData.objective || undefined,
      notes: formData.notes || undefined,
    };

    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (selectedEvent) {
      if (confirm('Are you sure you want to delete this time entry?')) {
        deleteMutation.mutate({ id: selectedEvent.id });
      }
    }
  };

  // Custom event style getter to apply project colors
  const eventStyleGetter = (event: TimeEntryEvent) => {
    const backgroundColor = event.resource.project_color || '#1e3a8a';
    return {
      style: {
        backgroundColor,
        borderColor: backgroundColor,
        color: 'white',
      }
    };
  };

  return (
    <MainLayout>
      <style jsx global>{`
        .rbc-event {
          border: none !important;
          border-radius: 4px !important;
          color: white !important;
          padding: 2px 5px !important;
          font-weight: 500 !important;
          opacity: 1 !important;
        }
        .rbc-event:hover {
          opacity: 0.9 !important;
        }
        .rbc-selected {
          opacity: 0.85 !important;
        }
        .rbc-today {
          background-color: #eff6ff !important;
        }
        .rbc-off-range-bg {
          background-color: #f8fafc !important;
        }
        .rbc-header {
          padding: 10px 3px !important;
          font-weight: 600 !important;
          color: #0f172a !important;
          border-bottom: 2px solid #e2e8f0 !important;
        }
        .rbc-toolbar button {
          color: #1e3a8a !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 6px 12px !important;
          font-weight: 500 !important;
        }
        .rbc-toolbar button:hover {
          background-color: #f1f5f9 !important;
        }
        .rbc-toolbar button.rbc-active {
          background-color: #1e3a8a !important;
          color: white !important;
        }
      `}</style>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Time Entries</h1>
            <p className="text-slate-600 mt-1">Track your billable hours</p>
          </div>
          <Button
            onClick={() => {
              setSelectedSlot({ start: new Date(), end: new Date() });
              setFormData({
                ...formData,
                date: format(new Date(), 'yyyy-MM-dd'),
              });
              setIsDialogOpen(true);
            }}
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Time Entry
          </Button>
        </div>

        <Card className="p-6 bg-white">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <p className="text-slate-500">Loading calendar...</p>
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}
              views={[Views.MONTH, Views.WEEK, Views.DAY]}
              view={view}
              onView={setView}
              date={currentDate}
              onNavigate={setCurrentDate}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              selectable
              popup
              className="bg-white"
            />
          )}
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedEvent ? 'Edit Time Entry' : 'New Time Entry'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project">Project *</Label>
                <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>People Involved (besides yourself)</Label>
                <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                  {contacts && contacts.length > 0 ? (
                    contacts.map((contact: any) => (
                      <label key={contact.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={formData.contact_ids.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, contact_ids: [...formData.contact_ids, contact.id] });
                            } else {
                              setFormData({ ...formData, contact_ids: formData.contact_ids.filter(id => id !== contact.id) });
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">
                          {contact.first_name} {contact.last_name} {contact.company_name && `(${contact.company_name})`}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No contacts available</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time ? format(new Date(formData.start_time), 'HH:mm') : ''}
                    onChange={(e) => {
                      if (e.target.value && formData.date) {
                        setFormData({
                          ...formData,
                          start_time: `${formData.date}T${e.target.value}`
                        });
                      }
                    }}
                    className="text-base"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time ? format(new Date(formData.end_time), 'HH:mm') : ''}
                    onChange={(e) => {
                      if (e.target.value && formData.date) {
                        setFormData({
                          ...formData,
                          end_time: `${formData.date}T${e.target.value}`
                        });
                      }
                    }}
                    className="text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="total_hours">Total Hours *</Label>
                  <Input
                    id="total_hours"
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={formData.total_hours}
                    onChange={(e) => setFormData({ ...formData, total_hours: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="chargeable_hours">Chargeable Hours *</Label>
                  <Input
                    id="chargeable_hours"
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={formData.chargeable_hours}
                    onChange={(e) => setFormData({ ...formData, chargeable_hours: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Office, Remote, Client site"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="objective">Objective</Label>
                <Textarea
                  id="objective"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder="What was the goal of this time entry?"
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this time entry"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <div>
                {selectedEvent && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  {selectedEvent ? 'Update' : 'Create'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
