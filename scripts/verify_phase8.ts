/**
 * scripts/verify_phase8.ts - Test Verification Suite for Phase 8
 * Verifies ESC/POS Byte Builder, Code 128 Barcode Engine, and 58mm/80mm Slip Layouts.
 */

import {
  ESC_POS_COMMANDS,
  EscPosBuilder,
  generateFabricTagSlipText,
  generateCustomerInvoiceSlipText,
  buildFabricTagBinary,
  buildCustomerInvoiceBinary,
  mapOrderToSlipData,
  centerText,
  padBetween,
  format3Columns,
  format4Columns,
  formatInch,
  formatCurrency,
  formatDateDisplay,
  type EscPosSlipData,
} from '../lib/escpos';

import { encodeCode128B } from '../components/tailor/barcode-renderer';
import { mockOrders, mockCustomers, mockShop } from '../lib/mock-data';

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${description}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${description}`);
  }
}

console.log('================================================================');
console.log('  RUNNING PHASE 8 VERIFICATION SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. ESC/POS Command Constants & Byte Standards
// -----------------------------------------------------------------------------
console.log('--- 1. Testing Low-Level ESC/POS Byte Commands ---');

assert(
  ESC_POS_COMMANDS.INIT[0] === 0x1b && ESC_POS_COMMANDS.INIT[1] === 0x40,
  'INIT command matches ESC @ ([0x1B, 0x40])'
);

assert(
  ESC_POS_COMMANDS.CUT_PARTIAL[0] === 0x1d &&
  ESC_POS_COMMANDS.CUT_PARTIAL[1] === 0x56 &&
  ESC_POS_COMMANDS.CUT_PARTIAL[2] === 0x01,
  'CUT_PARTIAL command matches GS V 1 ([0x1D, 0x56, 0x01])'
);

assert(
  ESC_POS_COMMANDS.CUT_FULL[0] === 0x1d &&
  ESC_POS_COMMANDS.CUT_FULL[1] === 0x56 &&
  ESC_POS_COMMANDS.CUT_FULL[2] === 0x00,
  'CUT_FULL command matches GS V 0 ([0x1D, 0x56, 0x00])'
);

assert(
  ESC_POS_COMMANDS.ALIGN_CENTER[0] === 0x1b &&
  ESC_POS_COMMANDS.ALIGN_CENTER[1] === 0x61 &&
  ESC_POS_COMMANDS.ALIGN_CENTER[2] === 0x01,
  'ALIGN_CENTER matches ESC a 1'
);

const feed4 = ESC_POS_COMMANDS.FEED_LINES(4);
assert(
  feed4[0] === 0x1b && feed4[1] === 0x64 && feed4[2] === 4,
  'FEED_LINES(4) matches ESC d 4'
);

// -----------------------------------------------------------------------------
// 2. String Layout & Padding Helpers
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing Layout & Formatting Helper Functions ---');

const centered32 = centerText('SILAYE TAG', 32);
assert(centered32.length === 32, `centerText produces exact width 32 (got ${centered32.length})`);
assert(centered32.trim() === 'SILAYE TAG', 'centerText preserves clean text content');

const paddedLine = padBetween('Total:', 'Rs. 2,800', 32);
assert(paddedLine.length === 32, `padBetween produces exact width 32 (got ${paddedLine.length})`);
assert(paddedLine.startsWith('Total:') && paddedLine.endsWith('Rs. 2,800'), 'padBetween aligns left and right text');

const gridRow = format3Columns('L:42.50"', 'C:40.00"', 'W:36.00"', 32);
assert(gridRow.length === 32, `format3Columns fits exact 32 chars for 58mm roll (got ${gridRow.length})`);
assert(gridRow.includes('L:42.50"') && gridRow.includes('C:40.00"') && gridRow.includes('W:36.00"'), 'format3Columns contains all 3 dimension tokens');

const tableRow = format4Columns('Men Shalwar Kameez', '1', '2,500', '2,500.00', [24, 4, 8, 9]);
assert(tableRow.length === 48, `format4Columns fits exact 48 chars for 80mm roll (got ${tableRow.length})`);

assert(formatInch(42.5) === '42.50"', 'formatInch formats 42.5 to 42.50"');
assert(formatInch(8.5) === '08.50"', 'formatInch pads single digit integer to 08.50"');
assert(formatInch(undefined) === '--.--"', 'formatInch safely handles undefined');
assert(formatCurrency(2800) === '2,800', 'formatCurrency formats 2800 to 2,800');

// -----------------------------------------------------------------------------
// 3. Code 128 Pure Barcode Encoder
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing Code 128 Pure Barcode Encoder ---');

const token = 'DP-2026-0801';
const encoded = encodeCode128B(token);

assert(encoded.displayText === token, 'encodeCode128B preserves display text');
assert(encoded.totalModules > 0, `encodeCode128B generates modules (count: ${encoded.totalModules})`);
assert(encoded.modules.length === encoded.totalModules, 'modules array length matches totalModules');

// Code 128 module count formula: 10 (quiet) + 11 (start) + N*11 (chars) + 11 (check) + 13 (stop) + 10 (quiet)
// For 12 characters: 10 + 11 + 12*11 + 11 + 13 + 10 = 187 modules
const expectedModules = 10 + 11 + (token.length * 11) + 11 + 13 + 10;
assert(
  encoded.totalModules === expectedModules,
  `Code 128 module length strictly conforms to standard (${encoded.totalModules} === ${expectedModules})`
);

// Check quiet zones
const leadingQuiet = encoded.modules.slice(0, 10).every((m) => m === false);
const trailingQuiet = encoded.modules.slice(-10).every((m) => m === false);
assert(leadingQuiet, 'Code 128 leading quiet zone is 10 empty modules');
assert(trailingQuiet, 'Code 128 trailing quiet zone is 10 empty modules');

// -----------------------------------------------------------------------------
// 4. 58mm Fabric Staple Tag Layout & Binary Stream
// -----------------------------------------------------------------------------
console.log('\n--- 4. Testing 58mm Fabric Staple Tag ---');

const testOrder = mockOrders[0];
const testCustomer = mockCustomers[0];
const slipData: EscPosSlipData = mapOrderToSlipData(testOrder, testCustomer, mockShop);

const tagText = generateFabricTagSlipText(slipData);
const tagLines = tagText.split('\n');

assert(tagLines.length > 15, `58mm Fabric Tag generates complete multi-line slip (${tagLines.length} lines)`);

let allUnderOrEqual32 = true;
for (const line of tagLines) {
  if (line.length > 32) {
    allUnderOrEqual32 = false;
    console.error(`Line exceeds 32 chars (${line.length}): "${line}"`);
  }
}
assert(allUnderOrEqual32, 'All lines in 58mm tag strictly adhere to <= 32 character width limit');

assert(tagText.includes('SILAYE TAG'), '58mm Tag contains "SILAYE TAG" header');
assert(tagText.includes(slipData.shopName.toUpperCase()), '58mm Tag contains uppercase shop branding');
assert(tagText.includes(slipData.orderNumber), '58mm Tag contains order number');
assert(tagText.includes('MEASUREMENTS (INCH)'), '58mm Tag contains 3x3 measurements header');
assert(tagText.includes('L:') && tagText.includes('C:') && tagText.includes('W:'), '58mm Tag contains row 1 dimensions (L, C, W)');
assert(tagText.includes('T:') && tagText.includes('B:') && tagText.includes('G:'), '58mm Tag contains row 2 dimensions (T, B, G)');
assert(tagText.includes('P:') && tagText.includes('A:') && tagText.includes('D:'), '58mm Tag contains row 3 dimensions (P, A, D)');
assert(tagText.includes('BAL DUE:') && tagText.includes(formatCurrency(slipData.balanceDue)), '58mm Tag contains balance due line');
assert(tagText.includes(`*${slipData.orderNumber}*`), '58mm Tag contains human-readable barcode token');

const tagBinary = buildFabricTagBinary(slipData);
assert(tagBinary instanceof Uint8Array, 'buildFabricTagBinary returns a Uint8Array');
assert(tagBinary.length > 200, `buildFabricTagBinary produces non-empty byte stream (${tagBinary.length} bytes)`);

// Verify INIT at start
assert(tagBinary[0] === 0x1b && tagBinary[1] === 0x40, 'Binary stream starts with ESC @ (INIT)');

// Verify GS k (Barcode) in stream
let hasBarcodeCommand = false;
for (let i = 0; i < tagBinary.length - 3; i++) {
  if (tagBinary[i] === 0x1d && tagBinary[i + 1] === 0x6b && tagBinary[i + 2] === 0x49) {
    hasBarcodeCommand = true;
    break;
  }
}
assert(hasBarcodeCommand, 'Binary stream contains GS k 73 Code 128 barcode command');

// Verify CUT at end
const lastCutIndex = tagBinary.length - 3;
assert(
  tagBinary[lastCutIndex] === 0x1d && tagBinary[lastCutIndex + 1] === 0x56,
  'Binary stream terminates with partial paper cut (GS V 1)'
);

// -----------------------------------------------------------------------------
// 5. 80mm Customer Booking Invoice Layout & Binary Stream
// -----------------------------------------------------------------------------
console.log('\n--- 5. Testing 80mm Customer Booking Invoice ---');

const invoiceText = generateCustomerInvoiceSlipText(slipData);
const invoiceLines = invoiceText.split('\n');

assert(invoiceLines.length > 20, `80mm Invoice generates complete receipt (${invoiceLines.length} lines)`);

let allUnderOrEqual48 = true;
for (const line of invoiceLines) {
  if (line.length > 48) {
    allUnderOrEqual48 = false;
    console.error(`Line exceeds 48 chars (${line.length}): "${line}"`);
  }
}
assert(allUnderOrEqual48, 'All lines in 80mm invoice strictly adhere to <= 48 character width limit');

assert(invoiceText.includes(slipData.shopName.toUpperCase()), '80mm Invoice contains workshop header');
assert(invoiceText.includes('Item Description'), '80mm Invoice contains itemized column header');
assert(invoiceText.includes('NET BALANCE DUE UPON PICKUP:'), '80mm Invoice contains Net Balance Due');
assert(invoiceText.includes('Track Live:'), '80mm Invoice contains online tracking URL');
assert(invoiceText.includes('Please present this receipt at pickup'), '80mm Invoice contains terms and pickup disclaimer');

const invoiceBinary = buildCustomerInvoiceBinary(slipData);
assert(invoiceBinary instanceof Uint8Array, 'buildCustomerInvoiceBinary returns a Uint8Array');
assert(invoiceBinary.length > 250, `buildCustomerInvoiceBinary produces complete byte stream (${invoiceBinary.length} bytes)`);

// -----------------------------------------------------------------------------
// 6. EscPosBuilder Chaining & Methods
// -----------------------------------------------------------------------------
console.log('\n--- 6. Testing EscPosBuilder Command Chaining ---');

const customBuilder = new EscPosBuilder('58mm');
customBuilder
  .alignCenter()
  .setBold(true)
  .addLine('TEST HEADER')
  .setBold(false)
  .addDivider('=')
  .alignLeft()
  .addLine('Key: Value')
  .addCode128Barcode('DP-2026-9999')
  .feedLines(3)
  .cut(true);

const customBytes = customBuilder.toUint8Array();
assert(customBytes.length > 50, `Custom EscPosBuilder generates ${customBytes.length} bytes`);

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`  VERIFICATION COMPLETE: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
console.log('================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
}
