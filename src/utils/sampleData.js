import { addDays, startOfWeek, setHours, setMinutes, subDays, format } from 'date-fns';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d', '#0d9488', '#b45309', '#6d28d9', '#e11d48'];

export function generateSampleData() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const locations = [
    { id: 'loc1', name: 'Downtown', address: '123 Main St', phone: '555-1000', targetLaborPercent: 30, laborBudgetWarning: 30, laborBudgetMax: 35, lat: 43.6532, lng: -79.3832, geofenceRadius: 200 },
    { id: 'loc2', name: 'Uptown', address: '456 Oak Ave', phone: '555-2000', targetLaborPercent: 28, laborBudgetWarning: 28, laborBudgetMax: 33, lat: 43.6745, lng: -79.3882, geofenceRadius: 150 },
  ];

  const accessLevels = ['master_admin', 'location_admin', 'manager', 'employee'];

  const groups = ['Front of House', 'Back of House', 'Management', 'Training', 'Opening Crew', 'Closing Crew'];

  const employees = [
    {
      id: '1', name: 'Sarah Johnson', preferredName: 'Sarah', roles: ['Manager'], email: 'sarah.johnson@clock.app', phone: '555-0101', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1988-03-15', color: COLORS[0], hourlyRate: 28, locationIds: ['loc1', 'loc2'], accessLevel: 'master_admin',
      bankInfo: { bankName: 'TD Bank', transitNumber: '00412', accountNumber: '1234567' },
      ptoBalance: { sick: 10, vacation: 15, personal: 5 }, hireDate: '2020-01-15',
      emergencyContact: { name: 'Mark Johnson', phone: '555-9901', relationship: 'Spouse' },
      clockPin: '1234', timeClockEnabled: true, groups: ['Management'], managerIds: [], payType: 'salary',
      wages: [{ position: 'Manager', rate: 28, effectiveDate: '2023-01-01' }],
      // New enriched fields
      employmentType: 'full_time', department: 'Management', status: 'active',
      address: { street: '42 Queen St W', city: 'Toronto', province: 'ON', postalCode: 'M5H 2N2' },
      skills: ['Leadership', 'P&L Management', 'Staff Training', 'Conflict Resolution', 'Food Safety Certified', 'First Aid/CPR'],
      certifications: [
        { name: 'Food Handler Certificate', issueDate: '2023-06-01', expiryDate: '2026-06-01', status: 'valid' },
        { name: 'Smart Serve Ontario', issueDate: '2022-01-15', expiryDate: '2027-01-15', status: 'valid' },
        { name: 'First Aid & CPR Level C', issueDate: '2024-03-10', expiryDate: '2027-03-10', status: 'valid' },
        { name: 'WHMIS 2015', issueDate: '2023-09-01', expiryDate: '2026-09-01', status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Employment Contract', 'Direct Deposit Form', 'Background Check'],
      notes: 'General Manager. Oversees both locations. Available for emergencies 24/7. Annual review due March 2026.',
      performanceRating: 4.8, overtimeRate: 1.5,
      availability: { monday: { start: '08:00', end: '18:00' }, tuesday: { start: '08:00', end: '18:00' }, wednesday: { start: '08:00', end: '18:00' }, thursday: { start: '08:00', end: '18:00' }, friday: { start: '08:00', end: '20:00' }, saturday: null, sunday: null },
    },
    {
      id: '2', name: 'Mike Chen', preferredName: 'Mike', roles: ['Server', 'Bartender'], email: 'mike.chen@clock.app', phone: '555-0102', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1995-07-22', color: COLORS[1], hourlyRate: 18, locationIds: ['loc1'], accessLevel: 'employee',
      bankInfo: { bankName: 'Scotiabank', transitNumber: '00247', accountNumber: '5678901' },
      ptoBalance: { sick: 10, vacation: 10, personal: 3 }, hireDate: '2023-06-01',
      emergencyContact: { name: 'Lisa Chen', phone: '555-9902', relationship: 'Mother' },
      clockPin: '2345', timeClockEnabled: true, groups: ['Front of House', 'Closing Crew'], managerIds: ['1'], payType: 'hourly',
      wages: [{ position: 'Server', rate: 18, effectiveDate: '2023-06-01' }, { position: 'Bartender', rate: 20, effectiveDate: '2023-06-01' }],
      employmentType: 'full_time', department: 'Front of House', status: 'active',
      address: { street: '88 Dundas St E, Apt 4B', city: 'Toronto', province: 'ON', postalCode: 'M5B 1C9' },
      skills: ['Mixology', 'Wine Knowledge', 'POS Systems', 'Customer Service', 'Upselling'],
      certifications: [
        { name: 'Smart Serve Ontario', issueDate: '2023-05-20', expiryDate: '2028-05-20', status: 'valid' },
        { name: 'Food Handler Certificate', issueDate: '2023-05-25', expiryDate: '2026-05-25', status: 'valid' },
        { name: 'Advanced Mixology', issueDate: '2024-02-14', expiryDate: null, status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Employment Contract', 'Smart Serve Copy'],
      notes: 'Strong bartender. Can cover bar shifts when needed. Interested in shift lead role.',
      performanceRating: 4.2, overtimeRate: 1.5,
      availability: { monday: { start: '14:00', end: '23:00' }, tuesday: { start: '14:00', end: '23:00' }, wednesday: null, thursday: { start: '14:00', end: '23:00' }, friday: { start: '16:00', end: '01:00' }, saturday: { start: '16:00', end: '01:00' }, sunday: { start: '10:00', end: '18:00' } },
    },
    {
      id: '3', name: 'Emily Davis', preferredName: 'Em', roles: ['Server'], email: 'emily.davis@clock.app', phone: '555-0103', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1997-11-08', color: COLORS[2], hourlyRate: 18, locationIds: ['loc1'], accessLevel: 'employee',
      bankInfo: { bankName: 'BMO', transitNumber: '00189', accountNumber: '2345678' },
      ptoBalance: { sick: 8, vacation: 10, personal: 3 }, hireDate: '2023-09-15',
      emergencyContact: { name: 'John Davis', phone: '555-9903', relationship: 'Father' },
      clockPin: '3456', timeClockEnabled: true, groups: ['Front of House', 'Opening Crew'], managerIds: ['1'], payType: 'hourly',
      wages: [{ position: 'Server', rate: 18, effectiveDate: '2023-09-15' }],
      employmentType: 'part_time', department: 'Front of House', status: 'active',
      address: { street: '200 University Ave, Unit 1205', city: 'Toronto', province: 'ON', postalCode: 'M5H 3C6' },
      skills: ['Customer Service', 'POS Systems', 'Table Management', 'Allergen Awareness'],
      certifications: [
        { name: 'Smart Serve Ontario', issueDate: '2023-09-01', expiryDate: '2028-09-01', status: 'valid' },
        { name: 'Food Handler Certificate', issueDate: '2023-09-10', expiryDate: '2026-09-10', status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Part-Time Agreement'],
      notes: 'University student (U of T). Available evenings and weekends. Reliable opener.',
      performanceRating: 3.9, overtimeRate: 1.5,
      availability: { monday: null, tuesday: { start: '17:00', end: '23:00' }, wednesday: { start: '17:00', end: '23:00' }, thursday: null, friday: { start: '16:00', end: '00:00' }, saturday: { start: '10:00', end: '23:00' }, sunday: { start: '10:00', end: '18:00' } },
    },
    {
      id: '4', name: 'James Wilson', preferredName: 'James', roles: ['Cook'], email: 'james.wilson@clock.app', phone: '555-0104', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1990-04-12', color: COLORS[3], hourlyRate: 22, locationIds: ['loc1'], accessLevel: 'employee',
      bankInfo: { bankName: 'RBC', transitNumber: '00215', accountNumber: '9876543' },
      ptoBalance: { sick: 10, vacation: 12, personal: 3 }, hireDate: '2022-03-01',
      emergencyContact: { name: 'Karen Wilson', phone: '555-9904', relationship: 'Spouse' },
      clockPin: '4567', timeClockEnabled: true, groups: ['Back of House'], managerIds: ['1'], payType: 'hourly',
      wages: [{ position: 'Cook', rate: 22, effectiveDate: '2022-03-01' }],
      employmentType: 'full_time', department: 'Kitchen', status: 'active',
      address: { street: '55 Bloor St W', city: 'Toronto', province: 'ON', postalCode: 'M4W 1A5' },
      skills: ['Line Cooking', 'Prep Work', 'Food Safety', 'Inventory Management', 'Grill Station', 'Sauté'],
      certifications: [
        { name: 'Food Handler Certificate', issueDate: '2022-02-15', expiryDate: '2025-02-15', status: 'expiring_soon' },
        { name: 'WHMIS 2015', issueDate: '2022-03-01', expiryDate: '2025-03-01', status: 'expiring_soon' },
        { name: 'Red Seal Cook', issueDate: '2018-06-15', expiryDate: null, status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Employment Contract', 'Direct Deposit Form', 'Red Seal Certificate'],
      notes: 'Red Seal certified cook. Dependable for morning prep. Considering promotion to Sous Chef. Food handler cert needs renewal.',
      performanceRating: 4.5, overtimeRate: 1.5,
      availability: { monday: { start: '06:00', end: '15:00' }, tuesday: { start: '06:00', end: '15:00' }, wednesday: { start: '06:00', end: '15:00' }, thursday: { start: '06:00', end: '15:00' }, friday: { start: '06:00', end: '15:00' }, saturday: null, sunday: null },
    },
    {
      id: '5', name: 'Lisa Park', preferredName: 'Lisa', roles: ['Bartender', 'Server'], email: 'lisa.park@clock.app', phone: '555-0105', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1993-09-30', color: COLORS[4], hourlyRate: 20, locationIds: ['loc2'], accessLevel: 'location_admin',
      bankInfo: { bankName: 'CIBC', transitNumber: '00310', accountNumber: '4567890' },
      ptoBalance: { sick: 10, vacation: 10, personal: 3 }, hireDate: '2021-07-20',
      emergencyContact: { name: 'David Park', phone: '555-9905', relationship: 'Brother' },
      clockPin: '5678', timeClockEnabled: true, groups: ['Front of House', 'Management'], managerIds: ['1'], payType: 'hourly',
      wages: [{ position: 'Bartender', rate: 20, effectiveDate: '2021-07-20' }, { position: 'Server', rate: 18, effectiveDate: '2021-07-20' }],
      employmentType: 'full_time', department: 'Front of House', status: 'active',
      address: { street: '120 Eglinton Ave E', city: 'Toronto', province: 'ON', postalCode: 'M4P 1E2' },
      skills: ['Mixology', 'Staff Scheduling', 'Inventory Ordering', 'Training New Staff', 'Cocktail Menu Design', 'Cash Handling'],
      certifications: [
        { name: 'Smart Serve Ontario', issueDate: '2021-07-01', expiryDate: '2026-07-01', status: 'valid' },
        { name: 'Food Handler Certificate', issueDate: '2021-07-10', expiryDate: '2024-07-10', status: 'expired' },
        { name: 'First Aid & CPR Level C', issueDate: '2023-05-01', expiryDate: '2026-05-01', status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Employment Contract', 'Direct Deposit Form', 'First Aid Certificate'],
      notes: 'Uptown location admin. Handles FOH scheduling. Food handler cert EXPIRED — needs immediate renewal. Strong mentor for new hires.',
      performanceRating: 4.6, overtimeRate: 1.5,
      availability: { monday: { start: '10:00', end: '20:00' }, tuesday: { start: '10:00', end: '20:00' }, wednesday: { start: '10:00', end: '20:00' }, thursday: { start: '10:00', end: '20:00' }, friday: { start: '14:00', end: '00:00' }, saturday: { start: '14:00', end: '00:00' }, sunday: null },
    },
    {
      id: '6', name: 'Tom Brown', preferredName: 'Tom', roles: ['Host'], email: 'tom.brown@clock.app', phone: '555-0106', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '2000-01-25', color: COLORS[5], hourlyRate: 16, locationIds: ['loc2'], accessLevel: 'employee',
      bankInfo: null,
      ptoBalance: { sick: 10, vacation: 8, personal: 3 }, hireDate: '2024-01-10',
      emergencyContact: { name: 'Robert Brown', phone: '555-9906', relationship: 'Father' },
      clockPin: '6789', timeClockEnabled: true, groups: ['Front of House'], managerIds: ['5', '8'], payType: 'hourly',
      wages: [{ position: 'Host', rate: 16, effectiveDate: '2024-01-10' }],
      employmentType: 'part_time', department: 'Front of House', status: 'probation',
      address: { street: '300 Borough Dr', city: 'Scarborough', province: 'ON', postalCode: 'M1P 4P5' },
      skills: ['Customer Greeting', 'Reservation Systems', 'Phone Etiquette'],
      certifications: [
        { name: 'Smart Serve Ontario', issueDate: '2024-01-05', expiryDate: '2029-01-05', status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Part-Time Agreement'],
      notes: 'New hire, still in 3-month probation period. College student. Learning reservation system. No direct deposit set up yet.',
      performanceRating: 3.5, overtimeRate: 1.5,
      availability: { monday: null, tuesday: null, wednesday: { start: '17:00', end: '22:00' }, thursday: { start: '17:00', end: '22:00' }, friday: { start: '17:00', end: '23:00' }, saturday: { start: '11:00', end: '23:00' }, sunday: { start: '11:00', end: '20:00' } },
    },
    {
      id: '7', name: 'Anna Martinez', preferredName: 'Anna', roles: ['Server'], email: 'anna.martinez@clock.app', phone: '555-0107', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1996-06-14', color: COLORS[6], hourlyRate: 18, locationIds: ['loc2'], accessLevel: 'employee',
      bankInfo: { bankName: 'TD Bank', transitNumber: '00412', accountNumber: '3456789' },
      ptoBalance: { sick: 10, vacation: 10, personal: 3 }, hireDate: '2023-11-01',
      emergencyContact: { name: 'Carlos Martinez', phone: '555-9907', relationship: 'Father' },
      clockPin: '7890', timeClockEnabled: true, groups: ['Front of House', 'Closing Crew'], managerIds: ['5', '8'], payType: 'hourly',
      wages: [{ position: 'Server', rate: 18, effectiveDate: '2023-11-01' }],
      employmentType: 'full_time', department: 'Front of House', status: 'active',
      address: { street: '77 Wellesley St E, Apt 8C', city: 'Toronto', province: 'ON', postalCode: 'M4Y 1H3' },
      skills: ['Bilingual (EN/ES)', 'Wine Knowledge', 'Customer Service', 'Upselling', 'POS Systems'],
      certifications: [
        { name: 'Smart Serve Ontario', issueDate: '2023-10-15', expiryDate: '2028-10-15', status: 'valid' },
        { name: 'Food Handler Certificate', issueDate: '2023-10-20', expiryDate: '2026-10-20', status: 'valid' },
        { name: 'WSET Level 2 Wine', issueDate: '2024-09-01', expiryDate: null, status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Employment Contract', 'Direct Deposit Form', 'WSET Certificate'],
      notes: 'Bilingual server — valuable for diverse clientele. Excellent upselling record. Completed wine certification. Potential shift lead candidate.',
      performanceRating: 4.4, overtimeRate: 1.5,
      availability: { monday: { start: '10:00', end: '22:00' }, tuesday: { start: '10:00', end: '22:00' }, wednesday: { start: '10:00', end: '22:00' }, thursday: { start: '10:00', end: '22:00' }, friday: { start: '14:00', end: '00:00' }, saturday: { start: '14:00', end: '00:00' }, sunday: null },
    },
    {
      id: '8', name: 'David Lee', preferredName: 'Dave', roles: ['Cook', 'Dishwasher'], email: 'david.lee@clock.app', phone: '555-0108', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1992-12-03', color: COLORS[7], hourlyRate: 22, locationIds: ['loc2'], accessLevel: 'manager',
      bankInfo: { bankName: 'RBC', transitNumber: '00215', accountNumber: '8901234' },
      ptoBalance: { sick: 10, vacation: 12, personal: 3 }, hireDate: '2022-08-15',
      emergencyContact: { name: 'Susan Lee', phone: '555-9908', relationship: 'Mother' },
      clockPin: '8901', timeClockEnabled: true, groups: ['Back of House'], managerIds: ['1'], payType: 'hourly',
      wages: [{ position: 'Cook', rate: 22, effectiveDate: '2022-08-15' }, { position: 'Dishwasher', rate: 18, effectiveDate: '2022-08-15' }],
      employmentType: 'full_time', department: 'Kitchen', status: 'active',
      address: { street: '25 St Clair Ave W', city: 'Toronto', province: 'ON', postalCode: 'M4V 1K6' },
      skills: ['Kitchen Management', 'Line Cooking', 'Menu Planning', 'Cost Control', 'Health & Safety', 'Staff Training'],
      certifications: [
        { name: 'Food Handler Certificate', issueDate: '2022-08-01', expiryDate: '2025-08-01', status: 'valid' },
        { name: 'WHMIS 2015', issueDate: '2022-08-10', expiryDate: '2025-08-10', status: 'valid' },
        { name: 'Red Seal Cook', issueDate: '2019-11-20', expiryDate: null, status: 'valid' },
        { name: 'First Aid & CPR Level C', issueDate: '2024-01-15', expiryDate: '2027-01-15', status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Employment Contract', 'Direct Deposit Form', 'Red Seal Certificate', 'Background Check'],
      notes: 'Kitchen manager for Uptown. Red Seal certified. Handles BOH scheduling and inventory. Solid team leader.',
      performanceRating: 4.7, overtimeRate: 1.5,
      availability: { monday: { start: '07:00', end: '16:00' }, tuesday: { start: '07:00', end: '16:00' }, wednesday: { start: '07:00', end: '16:00' }, thursday: { start: '07:00', end: '16:00' }, friday: { start: '07:00', end: '16:00' }, saturday: { start: '07:00', end: '14:00' }, sunday: null },
    },
    {
      id: '9', name: 'Rachel Kim', preferredName: 'Rachel', roles: ['Server', 'Host'], email: 'rachel.kim@clock.app', phone: '555-0109', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1999-02-18', color: COLORS[8], hourlyRate: 17, locationIds: ['loc1'], accessLevel: 'employee',
      bankInfo: { bankName: 'TD Bank', transitNumber: '00412', accountNumber: '6789012' },
      ptoBalance: { sick: 10, vacation: 8, personal: 3 }, hireDate: '2024-03-15',
      emergencyContact: { name: 'Jenny Kim', phone: '555-9909', relationship: 'Sister' },
      clockPin: '9012', timeClockEnabled: true, groups: ['Front of House', 'Opening Crew'], managerIds: ['1'], payType: 'hourly',
      wages: [{ position: 'Server', rate: 17, effectiveDate: '2024-03-15' }, { position: 'Host', rate: 16, effectiveDate: '2024-03-15' }],
      employmentType: 'full_time', department: 'Front of House', status: 'active',
      address: { street: '150 Danforth Ave, Unit 3', city: 'Toronto', province: 'ON', postalCode: 'M4K 1N1' },
      skills: ['Customer Service', 'Reservation Systems', 'POS Systems', 'Bilingual (EN/KO)', 'Social Media'],
      certifications: [
        { name: 'Smart Serve Ontario', issueDate: '2024-03-01', expiryDate: '2029-03-01', status: 'valid' },
        { name: 'Food Handler Certificate', issueDate: '2024-03-10', expiryDate: '2027-03-10', status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Employment Contract', 'Direct Deposit Form'],
      notes: 'Fast learner, picked up host and server duties quickly. Manages our Instagram content. Bilingual Korean/English.',
      performanceRating: 4.1, overtimeRate: 1.5,
      availability: { monday: { start: '10:00', end: '20:00' }, tuesday: { start: '10:00', end: '20:00' }, wednesday: { start: '10:00', end: '20:00' }, thursday: null, friday: { start: '15:00', end: '00:00' }, saturday: { start: '10:00', end: '23:00' }, sunday: { start: '10:00', end: '18:00' } },
    },
    {
      id: '10', name: 'Omar Hassan', preferredName: 'Omar', roles: ['Cook', 'Dishwasher'], email: 'omar.hassan@clock.app', phone: '555-0110', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1994-08-07', color: COLORS[9], hourlyRate: 19, locationIds: ['loc1'], accessLevel: 'employee',
      bankInfo: { bankName: 'Scotiabank', transitNumber: '00247', accountNumber: '7890123' },
      ptoBalance: { sick: 10, vacation: 10, personal: 3 }, hireDate: '2024-06-01',
      emergencyContact: { name: 'Fatima Hassan', phone: '555-9910', relationship: 'Spouse' },
      clockPin: '0123', timeClockEnabled: true, groups: ['Back of House'], managerIds: ['1'], payType: 'hourly',
      wages: [{ position: 'Cook', rate: 19, effectiveDate: '2024-06-01' }, { position: 'Dishwasher', rate: 16, effectiveDate: '2024-06-01' }],
      employmentType: 'full_time', department: 'Kitchen', status: 'active',
      address: { street: '40 Thorncliffe Park Dr', city: 'Toronto', province: 'ON', postalCode: 'M4H 1J5' },
      skills: ['Prep Cooking', 'Middle Eastern Cuisine', 'Food Safety', 'Knife Skills', 'Deep Frying'],
      certifications: [
        { name: 'Food Handler Certificate', issueDate: '2024-05-20', expiryDate: '2027-05-20', status: 'valid' },
        { name: 'WHMIS 2015', issueDate: '2024-06-01', expiryDate: '2027-06-01', status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Employment Contract', 'Direct Deposit Form', 'Work Permit'],
      notes: 'Excellent prep cook. Background in Middle Eastern cuisine — contributed to new menu items. Working toward Red Seal.',
      performanceRating: 4.0, overtimeRate: 1.5,
      availability: { monday: { start: '06:00', end: '15:00' }, tuesday: { start: '06:00', end: '15:00' }, wednesday: { start: '06:00', end: '15:00' }, thursday: { start: '06:00', end: '15:00' }, friday: { start: '06:00', end: '15:00' }, saturday: { start: '06:00', end: '14:00' }, sunday: null },
    },
    {
      id: '11', name: 'Sophie Tremblay', preferredName: 'Sophie', roles: ['Bartender'], email: 'sophie.tremblay@clock.app', phone: '555-0111', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '1991-05-22', color: COLORS[10], hourlyRate: 21, locationIds: ['loc1', 'loc2'], accessLevel: 'employee',
      bankInfo: { bankName: 'Desjardins', transitNumber: '00550', accountNumber: '4561237' },
      ptoBalance: { sick: 10, vacation: 10, personal: 3 }, hireDate: '2023-01-15',
      emergencyContact: { name: 'Marc Tremblay', phone: '555-9911', relationship: 'Brother' },
      clockPin: '1122', timeClockEnabled: true, groups: ['Front of House', 'Closing Crew'], managerIds: ['1', '5'], payType: 'hourly',
      wages: [{ position: 'Bartender', rate: 21, effectiveDate: '2023-01-15' }],
      employmentType: 'full_time', department: 'Bar', status: 'active',
      address: { street: '180 John St, Apt 12A', city: 'Toronto', province: 'ON', postalCode: 'M5T 1X5' },
      skills: ['Craft Cocktails', 'Flair Bartending', 'Bilingual (EN/FR)', 'Inventory Management', 'Cocktail Menu Development', 'Speed Service'],
      certifications: [
        { name: 'Smart Serve Ontario', issueDate: '2023-01-10', expiryDate: '2028-01-10', status: 'valid' },
        { name: 'Food Handler Certificate', issueDate: '2023-01-12', expiryDate: '2026-01-12', status: 'valid' },
        { name: 'BarSmarts Advanced', issueDate: '2022-06-01', expiryDate: null, status: 'valid' },
        { name: 'Certified Cicerone', issueDate: '2023-09-01', expiryDate: null, status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Employment Contract', 'Direct Deposit Form', 'BarSmarts Certificate', 'Cicerone Certificate'],
      notes: 'Head bartender. Designed current cocktail menu. Bilingual French/English. Floats between both locations as needed. Won city cocktail competition 2024.',
      performanceRating: 4.9, overtimeRate: 1.5,
      availability: { monday: null, tuesday: { start: '15:00', end: '01:00' }, wednesday: { start: '15:00', end: '01:00' }, thursday: { start: '15:00', end: '01:00' }, friday: { start: '15:00', end: '02:00' }, saturday: { start: '15:00', end: '02:00' }, sunday: null },
    },
    {
      id: '12', name: 'Kevin Patel', preferredName: 'Kev', roles: ['Dishwasher', 'Cook'], email: 'kevin.patel@clock.app', phone: '555-0112', countryCode: '+1', timezone: 'America/Toronto', dateOfBirth: '2002-09-11', color: COLORS[11], hourlyRate: 16, locationIds: ['loc2'], accessLevel: 'employee',
      bankInfo: null,
      ptoBalance: { sick: 10, vacation: 6, personal: 3 }, hireDate: '2024-09-01',
      emergencyContact: { name: 'Priya Patel', phone: '555-9912', relationship: 'Mother' },
      clockPin: '2233', timeClockEnabled: true, groups: ['Back of House', 'Training'], managerIds: ['8'], payType: 'hourly',
      wages: [{ position: 'Dishwasher', rate: 16, effectiveDate: '2024-09-01' }, { position: 'Cook', rate: 17, effectiveDate: '2024-11-01' }],
      employmentType: 'part_time', department: 'Kitchen', status: 'active',
      address: { street: '90 Sheppard Ave E', city: 'North York', province: 'ON', postalCode: 'M2N 3A1' },
      skills: ['Dishwashing', 'Basic Prep', 'Cleaning & Sanitation'],
      certifications: [
        { name: 'Food Handler Certificate', issueDate: '2024-08-25', expiryDate: '2027-08-25', status: 'valid' },
      ],
      documents: ['ID Verified', 'Tax Forms (TD1)', 'Part-Time Agreement'],
      notes: 'High school senior, works after school and weekends. Learning basic cooking from Dave. No bank info yet — receives cheques. Eager and reliable.',
      performanceRating: 3.7, overtimeRate: 1.5,
      availability: { monday: { start: '16:00', end: '22:00' }, tuesday: { start: '16:00', end: '22:00' }, wednesday: null, thursday: { start: '16:00', end: '22:00' }, friday: { start: '16:00', end: '23:00' }, saturday: { start: '10:00', end: '22:00' }, sunday: { start: '10:00', end: '18:00' } },
    },
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
    { id: '4', employeeId: '9', clockIn: setMinutes(setHours(today, 10), 0).toISOString(), clockOut: null, status: 'active', geofenceStatus: 'inside' },
    { id: '5', employeeId: '11', clockIn: setMinutes(setHours(today, 15), 5).toISOString(), clockOut: null, status: 'active', geofenceStatus: 'inside' },
  ];

  const absences = [
    { id: 'abs1', employeeId: '3', type: 'sick', startDate: format(subDays(today, 2), 'yyyy-MM-dd'), endDate: format(subDays(today, 1), 'yyyy-MM-dd'), status: 'approved', notes: 'Flu' },
    { id: 'abs2', employeeId: '5', type: 'vacation', startDate: format(addDays(today, 5), 'yyyy-MM-dd'), endDate: format(addDays(today, 9), 'yyyy-MM-dd'), status: 'pending', notes: 'Family trip' },
    { id: 'abs3', employeeId: '10', type: 'personal', startDate: format(addDays(today, 3), 'yyyy-MM-dd'), endDate: format(addDays(today, 3), 'yyyy-MM-dd'), status: 'approved', notes: 'Appointment' },
  ];

  const salesEntries = [];
  let salesId = 1;
  // Past 30 days of actual sales
  for (let d = 30; d >= 0; d--) {
    const date = format(subDays(today, d), 'yyyy-MM-dd');
    locations.forEach((loc) => {
      const base = loc.id === 'loc1' ? 3500 : 2800;
      const variance = (Math.random() - 0.5) * 1400;
      salesEntries.push({ id: String(salesId++), locationId: loc.id, date, amount: Math.round(base + variance), type: 'actual' });
    });
  }
  // Projected sales for upcoming 2 weeks
  for (let d = 1; d <= 14; d++) {
    const date = format(addDays(today, d), 'yyyy-MM-dd');
    locations.forEach((loc) => {
      const base = loc.id === 'loc1' ? 3800 : 3000;
      const dayOfWeek = addDays(today, d).getDay();
      const weekendBoost = (dayOfWeek === 5 || dayOfWeek === 6) ? 800 : 0;
      salesEntries.push({ id: String(salesId++), locationId: loc.id, date, amount: Math.round(base + weekendBoost), type: 'projected' });
    });
  }

  const posts = [
    { id: 'p1', authorId: '1', content: 'Reminder: Staff meeting this Friday at 3pm. Please confirm attendance!', createdAt: subDays(today, 1).toISOString(), likes: ['2', '3', '5'], comments: [{ id: 'c1', authorId: '2', content: "I'll be there!", createdAt: subDays(today, 1).toISOString() }] },
    { id: 'p2', authorId: '4', content: 'New menu items launching next week. Training session on Wednesday.', createdAt: subDays(today, 3).toISOString(), likes: ['1', '6'], comments: [] },
    { id: 'p3', authorId: '1', content: 'Great job last weekend team! We hit record sales. Keep it up!', createdAt: subDays(today, 5).toISOString(), likes: ['2', '3', '4', '5', '6', '7'], comments: [{ id: 'c2', authorId: '5', content: 'Thank you!', createdAt: subDays(today, 4).toISOString() }] },
    { id: 'p4', authorId: '11', content: 'New fall cocktail menu is live! Come try the Maple Old Fashioned 🍁', createdAt: subDays(today, 2).toISOString(), likes: ['1', '2', '5', '7', '9'], comments: [{ id: 'c3', authorId: '9', content: 'Already getting great reviews from guests!', createdAt: subDays(today, 1).toISOString() }] },
  ];

  const tasks = [
    { id: 't1', title: 'Prep side stations', locationId: 'loc1', assigneeId: '2', status: 'completed', dueDate: format(today, 'yyyy-MM-dd'), subtasks: [{ id: 'st1', text: 'Restock napkins', done: true }, { id: 'st2', text: 'Fill salt/pepper shakers', done: true }] },
    { id: 't2', title: 'Deep clean fryers', locationId: 'loc1', assigneeId: '4', status: 'in_progress', dueDate: format(today, 'yyyy-MM-dd'), subtasks: [{ id: 'st3', text: 'Drain oil', done: true }, { id: 'st4', text: 'Scrub baskets', done: false }, { id: 'st5', text: 'Refill with fresh oil', done: false }] },
    { id: 't3', title: 'Inventory check', locationId: 'loc1', assigneeId: null, status: 'pending', dueDate: format(addDays(today, 1), 'yyyy-MM-dd'), subtasks: [{ id: 'st6', text: 'Count dry goods', done: false }, { id: 'st7', text: 'Count beverages', done: false }, { id: 'st8', text: 'Update spreadsheet', done: false }] },
    { id: 't4', title: 'Update table layout', locationId: 'loc2', assigneeId: '6', status: 'pending', dueDate: format(addDays(today, 2), 'yyyy-MM-dd'), subtasks: [] },
    { id: 't5', title: 'Renew food handler certs', locationId: 'loc1', assigneeId: '4', status: 'pending', dueDate: format(addDays(today, 14), 'yyyy-MM-dd'), subtasks: [{ id: 'st9', text: 'James Wilson - expiring', done: false }, { id: 'st10', text: 'Lisa Park - expired', done: false }] },
  ];

  const payrollSettings = { period: 'biweekly', startDay: 1 };

  return { locations, currentLocationId: 'loc1', currentUserId: '1', accessLevels, employees, shifts, positions, groups, timeEntries, absences, salesEntries, payrollSettings, posts, tasks };
}
