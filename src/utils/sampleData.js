import { addDays, startOfWeek, setHours, setMinutes } from 'date-fns';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d'];

export function generateSampleData() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const employees = [
    { id: '1', name: 'Sarah Johnson', role: 'Manager', email: 'sarah@clock.app', phone: '555-0101', color: COLORS[0], hourlyRate: 28 },
    { id: '2', name: 'Mike Chen', role: 'Server', email: 'mike@clock.app', phone: '555-0102', color: COLORS[1], hourlyRate: 18 },
    { id: '3', name: 'Emily Davis', role: 'Server', email: 'emily@clock.app', phone: '555-0103', color: COLORS[2], hourlyRate: 18 },
    { id: '4', name: 'James Wilson', role: 'Cook', email: 'james@clock.app', phone: '555-0104', color: COLORS[3], hourlyRate: 22 },
    { id: '5', name: 'Lisa Park', role: 'Bartender', email: 'lisa@clock.app', phone: '555-0105', color: COLORS[4], hourlyRate: 20 },
    { id: '6', name: 'Tom Brown', role: 'Host', email: 'tom@clock.app', phone: '555-0106', color: COLORS[5], hourlyRate: 16 },
    { id: '7', name: 'Anna Martinez', role: 'Server', email: 'anna@clock.app', phone: '555-0107', color: COLORS[6], hourlyRate: 18 },
    { id: '8', name: 'David Lee', role: 'Cook', email: 'david@clock.app', phone: '555-0108', color: COLORS[7], hourlyRate: 22 },
  ];

  const positions = ['Manager', 'Server', 'Cook', 'Bartender', 'Host', 'Dishwasher'];

  const shifts = [];
  let shiftId = 1;

  const shiftTemplates = [
    { startHour: 7, startMin: 0, endHour: 15, endMin: 0, label: 'Morning' },
    { startHour: 11, startMin: 0, endHour: 19, endMin: 0, label: 'Mid' },
    { startHour: 15, startMin: 0, endHour: 23, endMin: 0, label: 'Evening' },
    { startHour: 9, startMin: 0, endHour: 17, endMin: 0, label: 'Day' },
  ];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = addDays(weekStart, dayOffset);

    employees.forEach((emp) => {
      if (Math.random() > 0.3) {
        const template = shiftTemplates[Math.floor(Math.random() * shiftTemplates.length)];
        const start = setMinutes(setHours(day, template.startHour), template.startMin);
        const end = setMinutes(setHours(day, template.endHour), template.endMin);

        shifts.push({
          id: String(shiftId++),
          employeeId: emp.id,
          start: start.toISOString(),
          end: end.toISOString(),
          position: emp.role,
          notes: '',
          status: 'scheduled',
        });
      }
    });
  }

  const timeEntries = [
    {
      id: '1',
      employeeId: '1',
      clockIn: setMinutes(setHours(today, 7), 2).toISOString(),
      clockOut: setMinutes(setHours(today, 15), 5).toISOString(),
      status: 'completed',
    },
    {
      id: '2',
      employeeId: '2',
      clockIn: setMinutes(setHours(today, 10), 55).toISOString(),
      clockOut: null,
      status: 'active',
    },
    {
      id: '3',
      employeeId: '4',
      clockIn: setMinutes(setHours(today, 6), 58).toISOString(),
      clockOut: setMinutes(setHours(today, 15), 10).toISOString(),
      status: 'completed',
    },
  ];

  return { employees, shifts, positions, timeEntries };
}
