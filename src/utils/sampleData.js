import { addDays, startOfWeek, setHours, setMinutes, subDays, format } from 'date-fns';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d'];

export function generateSampleData() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const locations = [
    { id: 'loc1', name: 'Downtown', address: '123 Main St', phone: '555-1000', targetLaborPercent: 30, laborBudgetWarning: 30, laborBudgetMax: 35, lat: 43.6532, lng: -79.3832, geofenceRadius: 200 },
    { id: 'loc2', name: 'Uptown', address: '456 Oak Ave', phone: '555-2000', targetLaborPercent: 28, laborBudgetWarning: 28, laborBudgetMax: 33, lat: 43.6745, lng: -79.3882, geofenceRadius: 150 },
  ];

  const employees = [
    { id: '1', name: 'Sarah Johnson', role: 'Manager', email: 'sarah@clock.app', phone: '555-0101', color: COLORS[0], hourlyRate: 28, locationId: 'loc1', bankInfo: { bankName: 'TD Bank', transitNumber: '00412', accountNumber: '1234567' }, ptoBalance: { sick: 10, vacation: 15, personal: 5 } },
    { id: '2', name: 'Mike Chen', role: 'Server', email: 'mike@clock.app', phone: '555-0102', color: COLORS[1], hourlyRate: 18, locationId: 'loc1', bankInfo: null, ptoBalance: { sick: 10, vacation: 10, personal: 3 } },
    { id: '3', name: 'Emily Davis', role: 'Server', email: 'emily@clock.app', phone: '555-0103', color: COLORS[2], hourlyRate: 18, locationId: 'loc1', bankInfo: null, ptoBalance: { sick: 8, vacation: 10, personal: 3 } },
    { id: '4', name: 'James Wilson', role: 'Cook', email: 'james@clock.app', phone: '555-0104', color: COLORS[3], hourlyRate: 22, locationId: 'loc1', bankInfo: { bankName: 'RBC', transitNumber: '00215', accountNumber: '9876543' }, ptoBalance: { sick: 10, vacation: 12, personal: 3 } },
    { id: '5', name: 'Lisa Park', role: 'Bartender', email: 'lisa@clock.app', phone: '555-0105', color: COLORS[4], hourlyRate: 20, locationId: 'loc2', bankInfo: null, ptoBalance: { sick: 10, vacation: 10, personal: 3 } },
    { id: '6', name: 'Tom Brown', role: 'Host', email: 'tom@clock.app', phone: '555-0106', color: COLORS[5], hourlyRate: 16, locationId: 'loc2', bankInfo: null, ptoBalance: { sick: 10, vacation: 8, personal: 3 } },
    { id: '7', name: 'Anna Martinez', role: 'Server', email: 'anna@clock.app', phone: '555-0107', color: COLORS[6], hourlyRate: 18, locationId: 'loc2', bankInfo: null, ptoBalance: { sick: 10, vacation: 10, personal: 3 } },
    { id: '8', name: 'David Lee', role: 'Cook', email: 'david@clock.app', phone: '555-0108', color: COLORS[7], hourlyRate: 22, locationId: 'loc2', bankInfo: null, ptoBalance: { sick: 10, vacation: 12, personal: 3 } },
  ];

  const positions = ['Manager', 'Server', 'Cook', 'Bartender', 'Host', 'Dishwasher'];

  const shifts = [];
  let shiftId = 1;
  const shiftTemplates = [
    { startHour: 7, startMin: 0, endHour: 15, endMin: 0 },
    { startHour: 11, startMin: 0, endHour: 19, endMin: 0 },
    { startHour: 15, startMin: 0, endHour: 23, endMin: 0 },
    { startHour: 9, startMin: 0, endHour: 17, endMin: 0 },
  ];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = addDays(weekStart, dayOffset);
    employees.forEach((emp) => {
      if (Math.random() > 0.3) {
        const template = shiftTemplates[Math.floor(Math.random() * shiftTemplates.length)];
        const start = setMinutes(setHours(day, template.startHour), template.startMin);
        const end = setMinutes(setHours(day, template.endHour), template.endMin);
        shifts.push({ id: String(shiftId++), employeeId: emp.id, start: start.toISOString(), end: end.toISOString(), position: emp.role, notes: '', status: 'scheduled' });
      }
    });
  }

  const timeEntries = [
    { id: '1', employeeId: '1', clockIn: setMinutes(setHours(today, 7), 2).toISOString(), clockOut: setMinutes(setHours(today, 15), 5).toISOString(), status: 'completed', geofenceStatus: 'inside' },
    { id: '2', employeeId: '2', clockIn: setMinutes(setHours(today, 10), 55).toISOString(), clockOut: null, status: 'active', geofenceStatus: 'inside' },
    { id: '3', employeeId: '4', clockIn: setMinutes(setHours(today, 6), 58).toISOString(), clockOut: setMinutes(setHours(today, 15), 10).toISOString(), status: 'completed', geofenceStatus: 'outside' },
  ];

  const absences = [
    { id: 'abs1', employeeId: '3', type: 'sick', startDate: format(subDays(today, 2), 'yyyy-MM-dd'), endDate: format(subDays(today, 1), 'yyyy-MM-dd'), status: 'approved', notes: 'Flu' },
    { id: 'abs2', employeeId: '5', type: 'vacation', startDate: format(addDays(today, 5), 'yyyy-MM-dd'), endDate: format(addDays(today, 9), 'yyyy-MM-dd'), status: 'pending', notes: 'Family trip' },
  ];

  const salesEntries = [];
  let salesId = 1;
  for (let d = 30; d >= 0; d--) {
    const date = format(subDays(today, d), 'yyyy-MM-dd');
    locations.forEach((loc) => {
      const base = loc.id === 'loc1' ? 3500 : 2800;
      const variance = (Math.random() - 0.5) * 1400;
      salesEntries.push({ id: String(salesId++), locationId: loc.id, date, amount: Math.round(base + variance) });
    });
  }

  const posts = [
    { id: 'p1', authorId: '1', content: 'Reminder: Staff meeting this Friday at 3pm. Please confirm attendance!', createdAt: subDays(today, 1).toISOString(), likes: ['2', '3', '5'], comments: [{ id: 'c1', authorId: '2', content: "I'll be there!", createdAt: subDays(today, 1).toISOString() }] },
    { id: 'p2', authorId: '4', content: 'New menu items launching next week. Training session on Wednesday.', createdAt: subDays(today, 3).toISOString(), likes: ['1', '6'], comments: [] },
    { id: 'p3', authorId: '1', content: 'Great job last weekend team! We hit record sales. Keep it up!', createdAt: subDays(today, 5).toISOString(), likes: ['2', '3', '4', '5', '6', '7'], comments: [{ id: 'c2', authorId: '5', content: 'Thank you!', createdAt: subDays(today, 4).toISOString() }] },
  ];

  const tasks = [
    { id: 't1', title: 'Prep side stations', locationId: 'loc1', assigneeId: '2', status: 'completed', dueDate: format(today, 'yyyy-MM-dd'), subtasks: [{ id: 'st1', text: 'Restock napkins', done: true }, { id: 'st2', text: 'Fill salt/pepper shakers', done: true }] },
    { id: 't2', title: 'Deep clean fryers', locationId: 'loc1', assigneeId: '4', status: 'in_progress', dueDate: format(today, 'yyyy-MM-dd'), subtasks: [{ id: 'st3', text: 'Drain oil', done: true }, { id: 'st4', text: 'Scrub baskets', done: false }, { id: 'st5', text: 'Refill with fresh oil', done: false }] },
    { id: 't3', title: 'Inventory check', locationId: 'loc1', assigneeId: null, status: 'pending', dueDate: format(addDays(today, 1), 'yyyy-MM-dd'), subtasks: [{ id: 'st6', text: 'Count dry goods', done: false }, { id: 'st7', text: 'Count beverages', done: false }, { id: 'st8', text: 'Update spreadsheet', done: false }] },
    { id: 't4', title: 'Update table layout', locationId: 'loc2', assigneeId: '6', status: 'pending', dueDate: format(addDays(today, 2), 'yyyy-MM-dd'), subtasks: [] },
  ];

  const payrollSettings = { period: 'biweekly', startDay: 1 };

  return { locations, currentLocationId: 'loc1', employees, shifts, positions, timeEntries, absences, salesEntries, payrollSettings, posts, tasks };
}
