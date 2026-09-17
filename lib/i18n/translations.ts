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

    // Mobile & Desktop Stats (Block 1)
    readySuits: 'تیار سوٹ',
    readySub: 'ڈلیوری تیار',
    workshopActive: 'ورکشاپ جاری',
    workshopSub: 'سلائی و کٹائی',
    unsettledKhata: 'باقی ادھار',
    udhaarSub: 'وصولی باقی',
    activeQueue: 'زیر تکمیل',
    dueToday: 'آج کی ڈلیوری',
    overdueAlert: 'تاخیر شدہ',

    // Quick Actions (Block 2)
    bookNewSuit: 'نیا سوٹ بک کریں',
    bookNewSuitSub: 'ناپ اور پرچی اندراج',
    searchParchi: 'گاہک و پرچی تلاش',
    searchParchiSub: 'آرڈر نمبر یا فون سے',

    // Urgent Deliveries Feed (Block 3)
    urgentDeliveries: 'فوری ترسیلات',
    urgentBadge: 'ارجنٹ آرڈرز',
    allOrders: 'تمام آرڈرز',
    allCaughtUpTitle: 'تمام شیڈول کلیئر ہے',
    allCaughtUpDesc: 'آج کی تاریخ میں کوئی فوری سوٹ واجب الادا نہیں ہے۔ ورکشاپ شیڈول مکمل ہے۔',
    freshWorkshopTitle: 'ورکشاپ تیار ہے - پہلا سوٹ بک کریں',
    freshWorkshopDesc: 'پروڈکشن کیو خالی ہے۔ کسٹمر کا ناپ اور پرچی درج کر کے لائیو ورکشاپ ٹریکنگ شروع کریں۔',
    bookFirstSuit: 'پہلا سوٹ بک کریں',

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

    // Mobile & Desktop Stats (Block 1)
    readySuits: 'Ready Suits',
    readySub: 'Ready for pickup',
    workshopActive: 'In Workshop',
    workshopSub: 'Active production',
    unsettledKhata: 'Receivables',
    udhaarSub: 'Pending collection',
    activeQueue: 'Active Queue',
    dueToday: 'Due Today',
    overdueAlert: 'Overdue',

    // Quick Actions (Block 2)
    bookNewSuit: 'Book New Suit',
    bookNewSuitSub: 'Intake & print slip',
    searchParchi: 'Search Parchi',
    searchParchiSub: 'Find by order # or phone',

    // Urgent Deliveries Feed (Block 3)
    urgentDeliveries: 'Urgent Deliveries',
    urgentBadge: 'High Priority',
    allOrders: 'All Orders',
    allCaughtUpTitle: 'All Caught Up!',
    allCaughtUpDesc: 'No urgent suits due today. Workshop is completely on schedule.',
    freshWorkshopTitle: 'Workshop is Fresh & Ready',
    freshWorkshopDesc: 'Zero active production queue. Book your first bespoke suit to track cutting, stitching, and trial deadlines.',
    bookFirstSuit: 'Book First Suit',

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

