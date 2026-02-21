import { addDays, startOfWeek, setHours, setMinutes, subDays, format } from 'date-fns';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d'];

export function generateSampleData() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const locations = [
    { id: 'loc1', name: 'Downtown', address: '123 Main St', phone: '555-1000', targetLaborPercent: 30, laborBudgetWarning: 30, laborBudgetMax: 35, lat: 43.6532, lng: -79.3832, geofenceRadius: 200 },
    { id: 'loc2', name: 'Uptown', address: '456 Oak Ave', phone: '555-2000', targetLaborPercent: 28, laborBudgetWarning: 28, laborBudgetMax: 33, lat: 43.6745, lng: -79.3882, geofenceRadius: 150 },
  ];

  const accessLevels = ['master_admin', 'location_admin', 'manager', 'employee'];

  const groups = ['Front of House', 'Back of House', 'Management'];

  const employees = [
    { id: '1', name: 'Sarah Johnson', preferredName: 'Sarah', roles: ['Manager'], email: 'sarah@clock.app', phone: '555-0101', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1988-03-15', color: COLORS[0], hourlyRate: 28, locationIds: ['loc1', 'loc2'], accessLevel: 'master_admin', bankInfo: { bankName: 'TD Bank', transitNumber: '00412', accountNumber: '1234567' }, ptoBalance: { sick: 10, vacation: 15, personal: 5 }, hireDate: '2020-01-15', emergencyContact: { name: 'Mark Johnson', phone: '555-9901', relationship: 'Spouse' }, clockPin: '1234', timeClockEnabled: true, groups: ['Management'], managerIds: [], payType: 'hourly', wages: [{ position: 'Manager', rate: 28, effectiveDate: '2023-01-01' }] },
    { id: '2', name: 'Mike Chen', preferredName: 'Mike', roles: ['Server', 'Bartender'], email: 'mike@clock.app', phone: '555-0102', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1995-07-22', color: COLORS[1], hourlyRate: 18, locationIds: ['loc1'], accessLevel: 'employee', bankInfo: null, ptoBalance: { sick: 10, vacation: 10, personal: 3 }, hireDate: '2023-06-01', emergencyContact: { name: 'Lisa Chen', phone: '555-9902', relationship: 'Mother' }, clockPin: '2345', timeClockEnabled: true, groups: ['Front of House'], managerIds: ['1'], payType: 'hourly', wages: [{ position: 'Server', rate: 18, effectiveDate: '2023-06-01' }, { position: 'Bartender', rate: 20, effectiveDate: '2023-06-01' }] },
    { id: '3', name: 'Emily Davis', preferredName: 'Em', roles: ['Server'], email: 'emily@clock.app', phone: '555-0103', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1997-11-08', color: COLORS[2], hourlyRate: 18, locationIds: ['loc1'], accessLevel: 'employee', bankInfo: null, ptoBalance: { sick: 8, vacation: 10, personal: 3 }, hireDate: '2023-09-15', emergencyContact: { name: 'John Davis', phone: '555-9903', relationship: 'Father' }, clockPin: '3456', timeClockEnabled: true, groups: ['Front of House'], managerIds: ['1'], payType: 'hourly', wages: [{ position: 'Server', rate: 18, effectiveDate: '2023-09-15' }] },
    { id: '4', name: 'James Wilson', preferredName: 'James', roles: ['Cook'], email: 'james@clock.app', phone: '555-0104', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1990-04-12', color: COLORS[3], hourlyRate: 22, locationIds: ['loc1'], accessLevel: 'employee', bankInfo: { bankName: 'RBC', transitNumber: '00215', accountNumber: '9876543' }, ptoBalance: { sick: 10, vacation: 12, personal: 3 }, hireDate: '2022-03-01', emergencyContact: { name: 'Karen Wilson', phone: '555-9904', relationship: 'Spouse' }, clockPin: '4567', timeClockEnabled: true, groups: ['Back of House'], managerIds: ['1'], payType: 'hourly', wages: [{ position: 'Cook', rate: 22, effectiveDate: '2022-03-01' }] },
    { id: '5', name: 'Lisa Park', preferredName: 'Lisa', roles: ['Bartender', 'Server'], email: 'lisa@clock.app', phone: '555-0105', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1993-09-30', color: COLORS[4], hourlyRate: 20, locationIds: ['loc2'], accessLevel: 'location_admin', bankInfo: null, ptoBalance: { sick: 10, vacation: 10, personal: 3 }, hireDate: '2021-07-20', emergencyContact: { name: 'David Park', phone: '555-9905', relationship: 'Brother' }, clockPin: '5678', timeClockEnabled: true, groups: ['Front of House', 'Management'], managerIds: ['1'], payType: 'hourly', wages: [{ position: 'Bartender', rate: 20, effectiveDate: '2021-07-20' }, { position: 'Server', rate: 18, effectiveDate: '2021-07-20' }] },
    { id: '6', name: 'Tom Brown', preferredName: 'Tom', roles: ['Host'], email: 'tom@clock.app', phone: '555-0106', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '2000-01-25', color: COLORS[5], hourlyRate: 16, locationIds: ['loc2'], accessLevel: 'employee', bankInfo: null, ptoBalance: { sick: 10, vacation: 8, personal: 3 }, hireDate: '2024-01-10', emergencyContact: null, clockPin: '6789', timeClockEnabled: true, groups: ['Front of House'], managerIds: ['5', '8'], payType: 'hourly', wages: [{ position: 'Host', rate: 16, effectiveDate: '2024-01-10' }] },
    { id: '7', name: 'Anna Martinez', preferredName: 'Anna', roles: ['Server'], email: 'anna@clock.app', phone: '555-0107', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1996-06-14', color: COLORS[6], hourlyRate: 18, locationIds: ['loc2'], accessLevel: 'employee', bankInfo: null, ptoBalance: { sick: 10, vacation: 10, personal: 3 }, hireDate: '2023-11-01', emergencyContact: { name: 'Carlos Martinez', phone: '555-9907', relationship: 'Father' }, clockPin: '7890', timeClockEnabled: true, groups: ['Front of House'], managerIds: ['5', '8'], payType: 'hourly', wages: [{ position: 'Server', rate: 18, effectiveDate: '2023-11-01' }] },
    { id: '8', name: 'David Lee', preferredName: 'Dave', roles: ['Cook', 'Dishwasher'], email: 'david@clock.app', phone: '555-0108', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1992-12-03', color: COLORS[7], hourlyRate: 22, locationIds: ['loc2'], accessLevel: 'manager', bankInfo: null, ptoBalance: { sick: 10, vacation: 12, personal: 3 }, hireDate: '2022-08-15', emergencyContact: { name: 'Susan Lee', phone: '555-9908', relationship: 'Mother' }, clockPin: '8901', timeClockEnabled: true, groups: ['Back of House'], managerIds: ['1'], payType: 'hourly', wages: [{ position: 'Cook', rate: 22, effectiveDate: '2022-08-15' }, { position: 'Dishwasher', rate: 18, effectiveDate: '2022-08-15' }] },
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
        shifts.push({ id: String(shiftId++), employeeId: emp.id, start: start.toISOString(), end: end.toISOString(), position: emp.roles[0], notes: '', status: 'draft' });
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

  return { locations, currentLocationId: 'loc1', currentUserId: '1', accessLevels, employees, shifts, positions, groups, timeEntries, absences, salesEntries, payrollSettings, posts, tasks };
}
