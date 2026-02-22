import { format, differenceInMinutes, differenceInHours } from 'date-fns';

export function formatTime(dateStr) {
  if (!dateStr) return '--:--';
  return format(new Date(dateStr), 'h:mm a');
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'MMM d, yyyy');
}

export function formatDuration(startStr, endStr) {
  if (!startStr || !endStr) return '--';
  const mins = differenceInMinutes(new Date(endStr), new Date(startStr));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function getHoursWorked(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  return differenceInHours(new Date(endStr), new Date(startStr));
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function calculateLaborCost(shifts, employees) {
  let total = 0;
  shifts.forEach((shift) => {
    const emp = employees.find((e) => e.id === shift.employeeId);
    if (emp) {
      const hours = getHoursWorked(shift.start, shift.end);
      total += hours * emp.hourlyRate;
    }
  });
  return total;
}
