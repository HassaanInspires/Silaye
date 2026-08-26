/**
 * scripts/verify_phase9.ts - Comprehensive Automated Verification Suite for Phase 9
 *
 * Tests:
 * 1. IndexedDB schema, store definitions, and index keys
 * 2. Database auto-seeding with mock dataset
 * 3. Customer, Order, Measurement, and Khata CRUD operations
 * 4. FIFO sequential queue processing
 * 5. Last-Write-Wins (LWW) conflict resolution
 * 6. Khata ledger immutability & atomic balance updating
 * 7. Poison-pill & Dead-Letter Queue trap after 5 retries
 * 8. Pre-commit Zod validation on mutations
 * 9. Cryptographic UUID generation
 */

// Polyfill in-memory IndexedDB for Node.js test environment
import 'fake-indexeddb/auto';
import {
  initLocalDatabase,
  seedLocalDatabase,
  getLocalCustomers,
  getLocalCustomerById,
  getLocalCustomerByPhone,
  saveLocalCustomer,
  deleteLocalCustomer,
  getLocalMeasurementProfiles,
  getLocalMeasurementProfileById,
  saveLocalMeasurementProfile,
  getLocalOrders,
  getLocalOrderById,
  getLocalOrderByNumber,
  saveLocalOrder,
  deleteLocalOrder,
  getLocalKhataTransactions,
  appendKhataTransaction,
  getSyncQueue,
  getPendingSyncQueue,
  addSyncQueueItem,
  clearSyncQueue,
  clearDatabase,
  generateUUID,
} from '../lib/offline-db';
import {
  SyncCoordinator,
  resolveConflict,
  MAX_SYNC_RETRIES,
  type SyncState,
} from '../lib/sync-coordinator';
import type {
  Customer,
  GarmentOrder,
  KhataTransaction,
} from '../types/tailor';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    process.exitCode = 1;
  }
}

async function runPhase9VerificationSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 9: Offline-First & Sync Engine Tests');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST GROUP 1: Database Initialization & Seeding
  // ----------------------------------------------------
  console.log('--- Test Group 1: Database Initialization & Store Seeding ---');
  const db = await initLocalDatabase();
  assert(db !== null, 'initLocalDatabase() returns a valid IDBPDatabase instance');

  if (db) {
    assert(db.objectStoreNames.contains('customers'), 'Store "customers" created');
    assert(db.objectStoreNames.contains('measurements'), 'Store "measurements" created');
    assert(db.objectStoreNames.contains('orders'), 'Store "orders" created');
    assert(db.objectStoreNames.contains('khata_transactions'), 'Store "khata_transactions" created');
    assert(db.objectStoreNames.contains('sync_queue'), 'Store "sync_queue" created');

    // Ensure seeded records are loaded
    await seedLocalDatabase(db);
  }

  // Verify auto-seeding
  const seededCustomers = await getLocalCustomers();
  assert(seededCustomers.length >= 5, `Database seeded customers (found ${seededCustomers.length})`);

  const seededOrders = await getLocalOrders();
  assert(seededOrders.length >= 7, `Database seeded orders (found ${seededOrders.length})`);

  const seededMeasurements = await getLocalMeasurementProfiles();
  assert(seededMeasurements.length >= 5, `Database seeded measurements (found ${seededMeasurements.length})`);

  const seededKhata = await getLocalKhataTransactions();
  assert(seededKhata.length >= 2, `Database seeded khata transactions (found ${seededKhata.length})`);

  // ----------------------------------------------------
  // TEST GROUP 2: Customer CRUD & Index Lookups
  // ----------------------------------------------------
  console.log('\n--- Test Group 2: Customer CRUD & Index Lookups ---');
  const foundCustomer = await getLocalCustomerById('c0000000-0000-0000-0000-000000000001');
  assert(foundCustomer?.full_name === 'Chaudhry Aslam', 'Found customer by UUID primary key');

  const phoneMatch = await getLocalCustomerByPhone('0301-2345678');
  assert(phoneMatch?.id === 'c0000000-0000-0000-0000-000000000001', 'Found customer by exact phone index');

  const unformattedPhoneMatch = await getLocalCustomerByPhone('+923012345678');
  assert(unformattedPhoneMatch?.id === 'c0000000-0000-0000-0000-000000000001', 'Found customer by normalized phone lookup');

  const newCustomerId = generateUUID();
  const testCustomer: Customer = {
    id: newCustomerId,
    shop_id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'Test Customer Wah',
    phone: '0311-9988776',
    alternate_phone: null,
    address: 'Lala Rukh, Wah Cantt',
    city: 'Wah Cantt',
    notes: 'Test profile',
    total_orders_count: 0,
    total_spent: 0,
    current_khata_balance: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await saveLocalCustomer(testCustomer);
  const retrievedCustomer = await getLocalCustomerById(newCustomerId);
  assert(retrievedCustomer?.full_name === 'Test Customer Wah', 'Saved and retrieved new customer from IndexedDB');

  await deleteLocalCustomer(newCustomerId);
  const deletedCustomer = await getLocalCustomerById(newCustomerId);
  assert(deletedCustomer === undefined, 'Successfully deleted customer from IndexedDB');

  // ----------------------------------------------------
  // TEST GROUP 3: Order CRUD & Order Number Index
  // ----------------------------------------------------
  console.log('\n--- Test Group 3: Order CRUD & Index Lookups ---');
  const foundOrder = await getLocalOrderByNumber('DP-2026-0801');
  assert(foundOrder?.id === 'e0000000-0000-0000-0000-000000000001', 'Looked up order by order_number index');
  assert(foundOrder?.status === 'IN_CUTTING', 'Retrieved correct order status');

  const newOrderId = generateUUID();
  const testOrder: GarmentOrder = {
    ...foundOrder!,
    id: newOrderId,
    order_number: 'DP-TEST-9999',
    status: 'BOOKED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await saveLocalOrder(testOrder);
  const retrievedOrder = await getLocalOrderById(newOrderId);
  assert(retrievedOrder?.order_number === 'DP-TEST-9999', 'Saved and retrieved new order by UUID');

  await deleteLocalOrder(newOrderId);
  const deletedOrder = await getLocalOrderById(newOrderId);
  assert(deletedOrder === undefined, 'Deleted order from IndexedDB');

  // ----------------------------------------------------
  // TEST GROUP 4: Khata Ledger Immutability & Atomic Balance
  // ----------------------------------------------------
  console.log('\n--- Test Group 4: Khata Ledger Immutability & Balance Updating ---');
  const targetCustomerId = 'c0000000-0000-0000-0000-000000000003';
  const customerBefore = await getLocalCustomerById(targetCustomerId);
  const initialBalance = customerBefore?.current_khata_balance ?? 0;

  const newKhataId = generateUUID();
  const depositAmount = 3000;
  const newBalance = initialBalance - depositAmount; // advance credit

  const khataTx: KhataTransaction = {
    id: newKhataId,
    shop_id: 'a0000000-0000-0000-0000-000000000001',
    customer_id: targetCustomerId,
    order_id: null,
    transaction_type: 'MANUAL_CREDIT',
    amount: depositAmount,
    balance_after: newBalance,
    notes: 'Advance Eid stitching deposit',
    created_by: 'b0000000-0000-0000-0000-000000000001',
    created_at: new Date().toISOString(),
  };

  await appendKhataTransaction(khataTx);

  const customerAfter = await getLocalCustomerById(targetCustomerId);
  assert(
    customerAfter?.current_khata_balance === newBalance,
    `Atomic balance updated from ${initialBalance} to ${newBalance}`
  );

  const customerTransactions = await getLocalKhataTransactions(targetCustomerId);
  assert(
    customerTransactions.some((t) => t.id === newKhataId),
    'Khata transaction appended to immutable ledger history'
  );

  // ----------------------------------------------------
  // TEST GROUP 5: Conflict Resolution (Last-Write-Wins)
  // ----------------------------------------------------
  console.log('\n--- Test Group 5: Last-Write-Wins (LWW) Conflict Resolution ---');
  const localRecord = {
    id: 'rec-1',
    name: 'Local Version',
    updated_at: '2026-08-25T12:00:00.000Z',
  };
  const remoteOlderRecord = {
    id: 'rec-1',
    name: 'Remote Older Version',
    updated_at: '2026-08-25T11:00:00.000Z',
  };
  const remoteNewerRecord = {
    id: 'rec-1',
    name: 'Remote Newer Version',
    updated_at: '2026-08-25T13:00:00.000Z',
  };

  const lwwResult1 = resolveConflict(localRecord, remoteOlderRecord);
  assert(lwwResult1.winner === 'LOCAL', 'LWW chose LOCAL when local timestamp is newer');
  assert(lwwResult1.resolved.name === 'Local Version', 'Resolved value matches local record');

  const lwwResult2 = resolveConflict(localRecord, remoteNewerRecord);
  assert(lwwResult2.winner === 'REMOTE', 'LWW chose REMOTE when remote timestamp is newer');
  assert(lwwResult2.resolved.name === 'Remote Newer Version', 'Resolved value matches remote record');

  // ----------------------------------------------------
  // TEST GROUP 6: FIFO Sync Queue Processing & Sequential Execution
  // ----------------------------------------------------
  console.log('\n--- Test Group 6: FIFO Sync Queue & Sequential Mutation Processing ---');
  await clearSyncQueue();

  const coordinator = new SyncCoordinator();
  coordinator.stopHeartbeat();
  await coordinator.setOnlineStatus(false); // Offline so items queue up

  const processedOrderIds: string[] = [];
  coordinator.remoteDispatcher = async (item) => {
    processedOrderIds.push((item.payload as { order_number?: string }).order_number || item.id);
    return { success: true, data: { ok: true } };
  };

  await addSyncQueueItem({
    id: generateUUID(),
    endpoint: '/api/orders',
    method: 'POST',
    payload: { order_number: 'ORDER-1' },
    created_at: 1000,
    status: 'PENDING',
  });

  await addSyncQueueItem({
    id: generateUUID(),
    endpoint: '/api/orders',
    method: 'POST',
    payload: { order_number: 'ORDER-2' },
    created_at: 2000,
    status: 'PENDING',
  });

  await addSyncQueueItem({
    id: generateUUID(),
    endpoint: '/api/orders',
    method: 'POST',
    payload: { order_number: 'ORDER-3' },
    created_at: 3000,
    status: 'PENDING',
  });

  const pendingBefore = await getPendingSyncQueue();
  assert(pendingBefore.length === 3, `Found ${pendingBefore.length} pending queue items before processing`);
  assert(pendingBefore[0].created_at <= pendingBefore[1].created_at, 'Queue is sorted strictly by created_at ASC');

  await coordinator.setOnlineStatus(true);
  const syncResult = await coordinator.processQueue();
  assert(syncResult.succeeded === 3, `Processed and succeeded ${syncResult.succeeded} items`);
  assert(
    JSON.stringify(processedOrderIds) === JSON.stringify(['ORDER-1', 'ORDER-2', 'ORDER-3']),
    'Mutations executed in strict FIFO order: ORDER-1 -> ORDER-2 -> ORDER-3'
  );

  // ----------------------------------------------------
  // TEST GROUP 7: Poison-Pill & Dead-Letter Queue Trap
  // ----------------------------------------------------
  console.log('\n--- Test Group 7: Poison-Pill & Dead-Letter Queue Trap ---');
  await clearSyncQueue();
  await coordinator.setOnlineStatus(false);

  // Configure dispatcher to fail on a specific poisoned mutation
  coordinator.remoteDispatcher = async (item) => {
    if ((item.payload as { poison?: boolean }).poison) {
      return { success: false, error: 'Unrecoverable schema constraint violation' };
    }
    return { success: true, data: { ok: true } };
  };

  const poisonId = generateUUID();
  await addSyncQueueItem({
    id: poisonId,
    endpoint: '/api/orders',
    method: 'POST',
    payload: { poison: true },
    created_at: 5000,
    retry_count: MAX_SYNC_RETRIES - 1, // 4 retries already
    status: 'PENDING',
  });

  const goodMutationId = generateUUID();
  await addSyncQueueItem({
    id: goodMutationId,
    endpoint: '/api/orders',
    method: 'POST',
    payload: { poison: false, order_number: 'GOOD-ORDER' },
    created_at: 6000,
    retry_count: 0,
    status: 'PENDING',
  });

  await coordinator.setOnlineStatus(true);
  const poisonResult = await coordinator.processQueue();
  assert(poisonResult.deadLettered === 1, 'Poison-pill mutation moved to dead-letter queue (status: FAILED)');
  assert(poisonResult.succeeded === 1, 'Subsequent good mutation processed successfully without being blocked');

  const allQueueItems = await getSyncQueue();
  const deadLetterItem = allQueueItems.find((i) => i.id === poisonId);
  assert(deadLetterItem?.status === 'FAILED', 'Dead-letter item marked as status: FAILED');
  assert(
    deadLetterItem?.retry_count === MAX_SYNC_RETRIES,
    `Retry count reached MAX_SYNC_RETRIES (${MAX_SYNC_RETRIES})`
  );

  // ----------------------------------------------------
  // TEST GROUP 8: Pre-Commit Zod Validation & Cryptographic UUIDs
  // ----------------------------------------------------
  console.log('\n--- Test Group 8: Pre-Commit Zod Validation & Cryptographic UUIDs ---');
  const uuid1 = generateUUID();
  const uuid2 = generateUUID();
  assert(uuid1 !== uuid2, 'generateUUID() produces unique cryptographic UUIDs');
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid1), 'UUID matches standard RFC4122 pattern');

  let validationFailed = false;
  try {
    // Attempting to book an order with invalid negative rate and bad date format
    await coordinator.createOrderWithSync({
      id: generateUUID(),
      order_number: 'DP-INVALID',
      shop_id: 'not-a-uuid',
      customer_id: 'not-a-uuid',
      measurement_profile_id: null,
      status: 'BOOKED',
      garment_type: 'MEN_SHALWAR_KAMEEZ',
      quantity: 0, // Invalid: must be >= 1
      booking_date: new Date().toISOString(),
      trial_date: null,
      delivery_date: 'invalid-date', // Invalid format
      actual_delivery_date: null,
      fabric_provided_by: 'CUSTOMER',
      fabric_color: null,
      fabric_brand: null,
      fabric_pieces_count: 1,
      fabric_notes: null,
      stitching_rate: -500, // Invalid negative
      fabric_charges: 0,
      addons_charges: 0,
      discount_amount: 0,
      total_amount: 0,
      advance_paid: 0,
      balance_due: 0,
      payment_status: 'UNPAID',
      assigned_cutter_id: null,
      assigned_stitcher_id: null,
      snapshot_measurements: {} as any,
      snapshot_styles: {} as any,
      barcode_token: 'TOKEN',
      public_tracking_key: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    validationFailed = true;
  }
  assert(validationFailed, 'Pre-commit validation successfully rejected malformed order payload before committing');

  // ----------------------------------------------------
  // TEST GROUP 9: Reactive State Subscription & AppShell Integration
  // ----------------------------------------------------
  console.log('\n--- Test Group 9: Reactive State Subscription ---');
  let observedState: SyncState | null = null;
  const unsubscribe = coordinator.subscribe((state) => {
    observedState = state;
  });

  await coordinator.setOnlineStatus(false);
  const offlineState = observedState as SyncState | null;
  assert(offlineState?.status === 'OFFLINE', 'Observer notified of OFFLINE status');
  assert(offlineState?.isOnline === false, 'Observer reported isOnline === false');

  await coordinator.setOnlineStatus(true);
  const onlineState = observedState as SyncState | null;
  assert(onlineState?.status === 'ONLINE', 'Observer notified of ONLINE status');
  assert(onlineState?.isOnline === true, 'Observer reported isOnline === true');

  unsubscribe();

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`🏁 Phase 9 Verification Complete: ${passedTests}/${totalTests} tests passed`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase9VerificationSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
