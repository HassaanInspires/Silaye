export type Language = 'ur' | 'en';

export const DASHBOARD_I18N = {
  ur: {
    // Header & Shell
    workshopOperations: 'ورکشاپ لائیو کاؤنٹر',
    searchPlaceholder: 'گاہک، پرچی یا فون نمبر تلاش کریں...',
    searchParchiShort: 'پرچی تلاش',
    online: 'آن لائن',
    offline: 'آف لائن',
    syncing: 'ہم آہنگ ہو رہا ہے...',
    pendingSync: 'مقامی محفوظ',
    workspaceNav: 'ورکشاپ مینو',
    superAdmin: 'سپر ایڈمن',
    adminPanel: 'ایڈمن پینل',
    signOut: 'لاگ آؤٹ',
    authenticatedWorkshop: 'تصدیق شدہ ورکشاپ',
    masterCounter: 'ماسٹر کاؤنٹر',

    // Mobile & Desktop Stats (Block 1)
    readySuits: 'تیار سوٹ',
    readySub: 'ڈلیوری تیار',
    workshopActive: 'ورکشاپ',
    workshopSub: 'سلائی و کٹائی',
    unsettledKhata: 'باقی ادھار',
    udhaarSub: 'وصولی باقی',
    activeQueue: 'زیر تکمیل',
    ordersInFlow: 'جاری آرڈرز',
    totalValue: 'کل مالیت',
    cut: 'کٹائی',
    stitch: 'سلائی',
    dueToday: 'آج کی ڈلیوری',
    suitsScheduled: 'شیڈول سوٹ',
    dueValue: 'آج کی رقم',
    scheduleClearToday: 'شیڈول کلیئر ہے',
    readyForPickup: 'ڈلیوری کے لیے تیار',
    overdueAlert: 'تاخیر شدہ',
    delayed: 'تاخیر',
    allOnSchedule: 'تمام شیڈول پر ہیں',
    debtors: 'گاہک',
    clients: 'گاہک',
    viewKhata: 'کھاتہ دیکھیں',

    // Quick Actions (Block 2 & Desktop)
    bookNewSuit: 'نیا سوٹ بک کریں',
    bookNewSuitSub: 'ناپ اور پرچی اندراج',
    searchParchi: 'گاہک و پرچی تلاش',
    searchParchiSub: 'آرڈر نمبر یا فون سے',
    quickCounterActions: 'فوری کاؤنٹر ایکشنز',
    quickActionsSub: 'ورکشاپ ریسپشن شارٹ کٹس',
    findCustomer: 'گاہک تلاش کریں',
    printCounter: 'پرنٹ کاؤنٹر',

    // Urgent Deliveries Feed (Block 3 & Desktop Watchlist)
    urgentDeliveries: 'فوری ترسیلات',
    urgentWatchlistTitle: 'فوری ترسیلات واچ لسٹ',
    urgentBadge: 'ارجنٹ آرڈرز',
    dueTodayTomorrow: 'آج اور کل کی ڈلیوری',
    urgentWatchlistSub: 'فوری توجہ کے حامل ترجیحی آرڈرز',
    viewAllOrdersQueue: 'تمام آرڈرز کیو دیکھیں',
    allOrders: 'تمام آرڈرز',
    allCaughtUpTitle: 'تمام شیڈول کلیئر ہے',
    allCaughtUpDesc: 'آج کی تاریخ میں کوئی فوری سوٹ واجب الادا نہیں ہے۔ ورکشاپ شیڈول مکمل ہے۔',
    freshWorkshopTitle: 'ورکشاپ تیار ہے - پہلا سوٹ بک کریں',
    freshWorkshopDesc: 'پروڈکشن کیو خالی ہے۔ کسٹمر کا ناپ اور پرچی درج کر کے لائیو ورکشاپ ٹریکنگ شروع کریں۔',
    bookFirstSuit: 'پہلا سوٹ بک کریں',

    // Table Columns
    thOrderNum: 'آرڈر #',
    thCustomer: 'گاہک کی تفصیلات',
    thGarment: 'لباس اور کپڑا',
    thStage: 'مرحلہ',
    thBalanceDue: 'باقی رقم',
    thActions: 'ایکشنز',

    // Order Feed Card items
    walkInCustomer: 'واک ان گاہک',
    noPhone: 'فون درج نہیں',
    dueTodayBadge: 'آج کی ڈلیوری',
    paidBadge: 'مکمل ادا',
    receiptWhatsApp: 'رسید / WhatsApp',
    printTag: 'پرنٹ ٹیگ',
    advanceStage: 'اگلا مرحلہ',
    completedStage: 'مکمل شدہ',

    // Bottom Navigation
    navHome: 'ہوم',
    navOrders: 'آرڈرز',
    navNewSuit: 'نیا سوٹ',
    navKhata: 'کھاتہ',
    navSettings: 'سیٹنگز',

    // General & Statuses
    commandDashboard: 'ورکشاپ ڈیش بورڈ',
    viewFullQueue: 'مکمل کیو دیکھیں',
  },
  en: {
    // Header & Shell
    workshopOperations: 'Live Workshop Operations',
    searchPlaceholder: 'Search customer, order, or phone...',
    searchParchiShort: 'Search Parchi',
    online: 'Online',
    offline: 'Offline',
    syncing: 'Syncing...',
    pendingSync: 'Saved locally',
    workspaceNav: 'Workspace',
    superAdmin: 'Super Admin',
    adminPanel: 'Admin Panel',
    signOut: 'Sign Out',
    authenticatedWorkshop: 'Authenticated Workshop',
    masterCounter: 'Master Counter',

    // Mobile & Desktop Stats (Block 1)
    readySuits: 'Ready Suits',
    readySub: 'Ready for pickup',
    workshopActive: 'In Workshop',
    workshopSub: 'Active production',
    unsettledKhata: 'Receivables',
    udhaarSub: 'Pending collection',
    activeQueue: 'Active Queue',
    ordersInFlow: 'Orders in Flow',
    totalValue: 'Total Value',
    cut: 'Cut',
    stitch: 'Stitch',
    dueToday: 'Due Today',
    suitsScheduled: 'Suits Scheduled',
    dueValue: 'Due Value',
    scheduleClearToday: 'Schedule Clear Today',
    readyForPickup: 'Ready for Final Pickup',
    overdueAlert: 'Overdue',
    delayed: 'Delayed',
    allOnSchedule: 'All On Schedule',
    debtors: 'Debtors',
    clients: 'Clients',
    viewKhata: 'View Khata',

    // Quick Actions (Block 2 & Desktop)
    bookNewSuit: 'Book New Suit',
    bookNewSuitSub: 'Intake & print slip',
    searchParchi: 'Search Parchi',
    searchParchiSub: 'Find by order # or phone',
    quickCounterActions: 'Quick Counter Actions',
    quickActionsSub: '1-Tap triggers for workshop reception',
    findCustomer: 'Find Customer',
    printCounter: 'Print Counter',

    // Urgent Deliveries Feed (Block 3 & Desktop Watchlist)
    urgentDeliveries: 'Urgent Deliveries',
    urgentWatchlistTitle: 'Urgent Deliveries Watchlist',
    urgentBadge: 'High Priority',
    dueTodayTomorrow: 'Due Today & Tomorrow',
    urgentWatchlistSub: 'Priority orders requiring immediate workshop attention',
    viewAllOrdersQueue: 'View All Orders in Queue',
    allOrders: 'All Orders',
    allCaughtUpTitle: 'All Caught Up!',
    allCaughtUpDesc: 'No urgent suits due today. Workshop is completely on schedule.',
    freshWorkshopTitle: 'Workshop is Fresh & Ready',
    freshWorkshopDesc: 'Zero active production queue. Book your first bespoke suit to track cutting, stitching, and trial deadlines.',
    bookFirstSuit: 'Book First Suit',

    // Table Columns
    thOrderNum: 'Order #',
    thCustomer: 'Customer Details',
    thGarment: 'Garment & Fabric',
    thStage: 'Production Stage',
    thBalanceDue: 'Balance Due',
    thActions: 'Quick Actions',

    // Order Feed Card items
    walkInCustomer: 'Walk-in Customer',
    noPhone: 'No phone registered',
    dueTodayBadge: 'Due Today',
    paidBadge: 'Paid',
    receiptWhatsApp: 'Receipt / WhatsApp',
    printTag: 'Print Slip',
    advanceStage: 'Next Stage',
    completedStage: 'Completed',

    // Bottom Navigation
    navHome: 'Home',
    navOrders: 'Orders',
    navNewSuit: 'New Suit',
    navKhata: 'Khata',
    navSettings: 'Settings',

    // General & Statuses
    commandDashboard: 'Command Dashboard',
    viewFullQueue: 'View Full Queue',
  },
} as const;

export type TranslationKey = keyof typeof DASHBOARD_I18N.ur;
export type DashboardTranslations = Record<TranslationKey, string>;
