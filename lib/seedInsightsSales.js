const pool = require('./db');

const PAYMENT_METHODS = ['cash', 'gcash', 'card'];

function daysAgo(dayOffset) {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  return date;
}

function paymentMethodForDay(day) {
  return PAYMENT_METHODS[day % PAYMENT_METHODS.length];
}

async function getProductId(storeId, sku) {
  const { rows } = await pool.query(
    'SELECT id FROM products WHERE store_id = $1 AND sku = $2 LIMIT 1',
    [storeId, sku]
  );
  return rows[0]?.id ?? null;
}

async function getStoreUserId(storeId) {
  const { rows } = await pool.query(
    'SELECT id FROM users WHERE store_id = $1 ORDER BY id LIMIT 1',
    [storeId]
  );
  return rows[0]?.id ?? null;
}

async function clearStoreSales(storeId) {
  await pool.query('DELETE FROM inventory_logs WHERE store_id = $1', [storeId]);
  await pool.query('DELETE FROM transaction_items WHERE store_id = $1', [storeId]);
  await pool.query('DELETE FROM transactions WHERE store_id = $1', [storeId]);
}

async function insertSale(storeId, userId, lineItems, paymentMethod, createdAt) {
  const total = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const txResult = await pool.query(
    `INSERT INTO transactions (store_id, user_id, total_amount, payment_method, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [storeId, userId, total, paymentMethod, createdAt]
  );
  const transactionId = txResult.rows[0].id;

  for (const item of lineItems) {
    await pool.query(
      `INSERT INTO transaction_items (store_id, transaction_id, product_id, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [storeId, transactionId, item.productId, item.quantity, item.unitPrice, item.subtotal]
    );
  }

  return transactionId;
}

async function seedVapeShop(storeId, userId) {
  const mangoId = await getProductId(storeId, 'BE-02');
  const grapesId = await getProductId(storeId, 'BEM-03');
  const eliteWmId = await getProductId(storeId, 'BE-01');
  const empireYakultId = await getProductId(storeId, 'BEM-06');
  const spaceId = await getProductId(storeId, 'BS-05');

  if (!mangoId) {
    throw new Error('Missing BE-02 (Black Elite Mango) — run sql/006_real_catalog.sql first');
  }

  let transactionsCreated = 0;

  for (let day = 25; day >= 1; day -= 1) {
    const createdAt = daysAgo(day);
    const method = paymentMethodForDay(day);
    const mangoPrice = 599;

    if (day >= 14) {
      if (day % 3 === 0) {
        await insertSale(
          storeId,
          userId,
          [{ productId: mangoId, quantity: 1, unitPrice: mangoPrice, subtotal: mangoPrice }],
          method,
          createdAt
        );
        transactionsCreated += 1;
      }
    } else {
      const qty = 2 + (day % 2);
      const lineItems = [
        {
          productId: mangoId,
          quantity: qty,
          unitPrice: mangoPrice,
          subtotal: mangoPrice * qty,
        },
      ];

      if (eliteWmId && empireYakultId && day <= 10) {
        lineItems.push(
          { productId: eliteWmId, quantity: 1, unitPrice: 599, subtotal: 599 },
          { productId: empireYakultId, quantity: 1, unitPrice: 499, subtotal: 499 }
        );
      }

      await insertSale(storeId, userId, lineItems, method, createdAt);
      transactionsCreated += 1;
    }
  }

  if (grapesId) {
    const grapesPrice = 499;
    for (let day = 25; day >= 1; day -= 1) {
      const createdAt = daysAgo(day);
      const method = paymentMethodForDay(day);
      let qty = 0;

      if (day >= 14) {
        qty = 2 + (day % 2);
      } else if (day % 5 === 0) {
        qty = 1;
      }

      if (qty > 0) {
        await insertSale(
          storeId,
          userId,
          [
            {
              productId: grapesId,
              quantity: qty,
              unitPrice: grapesPrice,
              subtotal: grapesPrice * qty,
            },
          ],
          method,
          createdAt
        );
        transactionsCreated += 1;
      }
    }
  }

  if (spaceId) {
    const spacePrice = 499;
    for (let day = 24; day >= 1; day -= 3) {
      await insertSale(
        storeId,
        userId,
        [{ productId: spaceId, quantity: 1, unitPrice: spacePrice, subtotal: spacePrice }],
        'cash',
        daysAgo(day)
      );
      transactionsCreated += 1;
    }
  }

  return { transactionsCreated };
}

async function seedCosmeticStore(storeId, userId) {
  const bundleB3Id = await getProductId(storeId, 'BUNDLE-B3');
  const greenSerumId = await getProductId(storeId, 'MK-BL-CLOUD-GREEN');
  const bundleB1Id = await getProductId(storeId, 'BUNDLE-B1');
  const seaPowderId = await getProductId(storeId, 'MK-PW-SEA-PANNA');
  const maybellineId = await getProductId(storeId, 'MK-FN-MAYB-119');

  if (!bundleB3Id) {
    throw new Error('Missing BUNDLE-B3 — run sql/006_real_catalog.sql first');
  }

  let transactionsCreated = 0;

  for (let day = 25; day >= 1; day -= 1) {
    const createdAt = daysAgo(day);
    const method = paymentMethodForDay(day);
    const bundlePrice = 199;

    if (day >= 14) {
      if (day % 4 === 0) {
        await insertSale(
          storeId,
          userId,
          [{ productId: bundleB3Id, quantity: 1, unitPrice: bundlePrice, subtotal: bundlePrice }],
          method,
          createdAt
        );
        transactionsCreated += 1;
      }
    } else {
      const qty = 1 + (day % 3);
      const lineItems = [
        {
          productId: bundleB3Id,
          quantity: qty,
          unitPrice: bundlePrice,
          subtotal: bundlePrice * qty,
        },
      ];

      if (bundleB1Id && seaPowderId && day <= 12) {
        lineItems.push(
          { productId: bundleB1Id, quantity: 1, unitPrice: 329, subtotal: 329 },
          { productId: seaPowderId, quantity: 1, unitPrice: 150, subtotal: 150 }
        );
      }

      await insertSale(storeId, userId, lineItems, method, createdAt);
      transactionsCreated += 1;
    }
  }

  if (greenSerumId) {
    const serumPrice = 30;
    for (let day = 25; day >= 1; day -= 1) {
      let qty = 0;
      if (day >= 14) {
        qty = 2;
      } else if (day % 6 === 0) {
        qty = 1;
      }

      if (qty > 0) {
        await insertSale(
          storeId,
          userId,
          [
            {
              productId: greenSerumId,
              quantity: qty,
              unitPrice: serumPrice,
              subtotal: serumPrice * qty,
            },
          ],
          'cash',
          daysAgo(day)
        );
        transactionsCreated += 1;
      }
    }
  }

  if (maybellineId) {
    const foundationPrice = 160;
    for (const day of [23, 18, 11, 6, 2]) {
      await insertSale(
        storeId,
        userId,
        [
          {
            productId: maybellineId,
            quantity: 1,
            unitPrice: foundationPrice,
            subtotal: foundationPrice,
          },
        ],
        'gcash',
        daysAgo(day)
      );
      transactionsCreated += 1;
    }
  }

  return { transactionsCreated };
}

async function seedInsightsSales(storeId, { replace = false } = {}) {
  const userId = await getStoreUserId(storeId);
  if (!userId) {
    throw new Error(`No user found for store_id ${storeId}`);
  }

  if (replace) {
    await clearStoreSales(storeId);
  }

  if (storeId === 1) {
    const result = await seedVapeShop(storeId, userId);
    return { storeId, ...result };
  }

  if (storeId === 2) {
    const result = await seedCosmeticStore(storeId, userId);
    return { storeId, ...result };
  }

  throw new Error(`No insights seed profile for store_id ${storeId}`);
}

async function seedAllInsightsSales({ replace = false } = {}) {
  const results = [];
  for (const storeId of [1, 2]) {
    results.push(await seedInsightsSales(storeId, { replace }));
  }
  return results;
}

module.exports = {
  seedInsightsSales,
  seedAllInsightsSales,
  clearStoreSales,
};
