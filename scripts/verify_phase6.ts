/**
 * scripts/verify_phase6.ts - Automated Unit Test & Verification Suite for Phase 6
 * Tests phone number sanitization, message template generation, and deep-link URI builder.
 */

import {
  sanitizePakistaniPhone,
  isValidPakistaniPhone,
  formatPakistaniPhoneDisplay,
  generateBookingReceiptMessage,
  generateOrderReadyMessage,
  generateKhataReminderMessage,
  createReceiptPayload,
  createKhataPayload,
  buildWhatsAppLink,
} from '../lib/whatsapp';
import { mockOrders, mockCustomers, mockShop } from '../lib/mock-data';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('====================================================');
console.log('🧪 Starting Phase 6 WhatsApp Engine Verification Suite');
console.log('====================================================\n');

// ----------------------------------------------------------------------------
// 1. Phone Number Sanitization Tests
// ----------------------------------------------------------------------------
console.log('1. Pakistani Phone Number Sanitization Engine:');

const phoneTestCases: { raw: string; expected: string; label: string }[] = [
  { raw: '03001234567', expected: '923001234567', label: '11-digit local format (03001234567)' },
  { raw: '+923001234567', expected: '923001234567', label: 'International format with plus (+923001234567)' },
  { raw: '923001234567', expected: '923001234567', label: 'Standard 12-digit format (923001234567)' },
  { raw: '3001234567', expected: '923001234567', label: '10-digit without leading 0 (3001234567)' },
  { raw: '0300-1234567', expected: '923001234567', label: 'Hyphenated format (0300-1234567)' },
  { raw: '+92 300 1234567', expected: '923001234567', label: 'Spaced international (+92 300 1234567)' },
  { raw: '00923001234567', expected: '923001234567', label: 'Leading double-zero format (00923001234567)' },
  { raw: '(0300) 1234567', expected: '923001234567', label: 'Parenthesized area code ((0300) 1234567)' },
  { raw: '0321-9876543', expected: '923219876543', label: 'Warid/Jazz 0321 prefix' },
  { raw: '0333-1122334', expected: '923331122334', label: 'Ufone 0333 prefix' },
  { raw: '0345-5544332', expected: '923455544332', label: 'Telenor 0345 prefix' },
  { raw: '0312-3344556', expected: '923123344556', label: 'Zong 0312 prefix' },
];

for (const tc of phoneTestCases) {
  const result = sanitizePakistaniPhone(tc.raw);
  assert(result === tc.expected, `${tc.label} -> got ${result}`);
}

assert(isValidPakistaniPhone('0300-1234567') === true, 'isValidPakistaniPhone accepts valid numbers');
assert(isValidPakistaniPhone('12345') === false, 'isValidPakistaniPhone rejects short strings');
assert(isValidPakistaniPhone('02134567890') === false, 'isValidPakistaniPhone rejects landline non-mobile numbers');

assert(
  formatPakistaniPhoneDisplay('03001234567') === '+92 300 1234567',
  'formatPakistaniPhoneDisplay returns formatted +92 300 1234567'
);

console.log('\n----------------------------------------------------');

// ----------------------------------------------------------------------------
// 2. Payload Transformers & Message Templates
// ----------------------------------------------------------------------------
console.log('2. Bilingual Dynamic Template Generators:');

const testOrder = mockOrders[0];
const testCustomer = mockCustomers[0];

const receiptPayload = createReceiptPayload(testOrder, testCustomer, mockShop);
const khataPayload = createKhataPayload(testCustomer, mockShop);

assert(receiptPayload.orderNumber === testOrder.order_number, 'Payload contains correct order number');
assert(receiptPayload.customerName === testCustomer.full_name, 'Payload contains correct customer name');
assert(receiptPayload.trackingUrl.includes(testOrder.order_number), 'Tracking URL contains order number');

// Template 1: Booking Receipt
const bookingMsg = generateBookingReceiptMessage(receiptPayload);
assert(bookingMsg.includes(`*${testCustomer.full_name}*`), 'Booking template contains bold customer name');
assert(bookingMsg.includes(`*${mockShop.name}*`), 'Booking template contains shop name');
assert(bookingMsg.includes(`#${testOrder.order_number}`), 'Booking template contains order number');
assert(bookingMsg.includes(receiptPayload.garmentTypeUrdu), 'Booking template contains Urdu garment type');
assert(bookingMsg.includes(`Rs. ${testOrder.total_amount.toLocaleString()}`), 'Booking template contains total amount');
assert(bookingMsg.includes(`Rs. ${testOrder.balance_due.toLocaleString()}`), 'Booking template contains balance due');
assert(bookingMsg.includes(receiptPayload.trackingUrl), 'Booking template contains tracking URL');

// Template 2: Ready for Pickup
const readyMsg = generateOrderReadyMessage(receiptPayload);
assert(readyMsg.includes('تیار ہو چکا ہے'), 'Ready template contains Urdu readiness notice');
assert(readyMsg.includes(`#${testOrder.order_number}`), 'Ready template contains order number');
assert(readyMsg.includes(receiptPayload.garmentTypeUrdu), 'Ready template contains Urdu garment name');

// Template 3: Khata Reminder
const khataMsg = generateKhataReminderMessage(khataPayload);
assert(khataMsg.includes('بقایا کھاتہ بیلنس کی یاد دہانی'), 'Khata template contains Urdu balance reminder header');
assert(khataMsg.includes(`Rs. ${khataPayload.totalPendingBalance.toLocaleString()}`), 'Khata template contains formatted debt amount');
assert(khataMsg.includes(mockShop.owner_phone || mockShop.phone || '0300-5551234'), 'Khata template contains shop contact phone');

console.log('\n----------------------------------------------------');

// ----------------------------------------------------------------------------
// 3. Deep-Link Builder & URI Construction
// ----------------------------------------------------------------------------
console.log('3. Deep-Link Builder & URL Construction:');

const deepLink = buildWhatsAppLink(testCustomer.phone, bookingMsg);
const expectedSanitizedPhone = sanitizePakistaniPhone(testCustomer.phone);

assert(deepLink.startsWith(`https://wa.me/${expectedSanitizedPhone}?text=`), `Deep-link starts with https://wa.me/${expectedSanitizedPhone}?text=`);
assert(deepLink.includes('%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85'), 'Deep-link properly URI-encodes Arabic/Urdu characters (السلام)');
assert(deepLink.includes('%0A'), 'Deep-link properly translates line breaks to %0A');

console.log('\n====================================================');
if (failed === 0) {
  console.log(`🎉 ALL ${passed} VERIFICATION CHECKS PASSED SUCCESSFULLY!`);
  console.log('====================================================');
} else {
  console.error(`💥 ${failed} CHECKS FAILED! (Passed: ${passed})`);
  console.log('====================================================');
  process.exit(1);
}
