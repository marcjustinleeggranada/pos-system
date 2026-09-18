const { VAPE_LINE_SPECS, LINE_DEFAULT_PRICES } = require('./vapeCatalog');
const { VAPE_LINES } = require('./categories');

const NEW_LINE_OPTION = '__new__';

function slugifyLineKey(label) {
  const base = String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

  return base || `line_${Date.now()}`;
}

function parseSpecsText(text) {
  if (!text) return [];
  return String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatSpecsText(specs) {
  if (!Array.isArray(specs)) return '';
  return specs.map((item) => String(item).trim()).filter(Boolean).join('\n');
}

function getBuiltInLine(lineKey) {
  const builtIn = VAPE_LINES.find((line) => line.value === lineKey);
  if (!builtIn) return null;

  return {
    lineKey,
    label: builtIn.label,
    specs: VAPE_LINE_SPECS[lineKey] ?? [],
    defaultPrice: LINE_DEFAULT_PRICES[lineKey] ?? null,
    isBuiltIn: true,
  };
}

function formatVapeLineRow(row) {
  const specs = Array.isArray(row.specs)
    ? row.specs
    : typeof row.specs === 'string'
      ? JSON.parse(row.specs)
      : [];

  return {
    lineKey: row.line_key,
    label: row.label,
    specs,
    defaultPrice: row.default_price != null ? Number(row.default_price) : null,
    isBuiltIn: VAPE_LINES.some((line) => line.value === row.line_key),
  };
}

function getFallbackVapeLines() {
  return VAPE_LINES.map((line) => ({
    lineKey: line.value,
    label: line.label,
    specs: VAPE_LINE_SPECS[line.value] ?? [],
    defaultPrice: LINE_DEFAULT_PRICES[line.value] ?? null,
    isBuiltIn: true,
  }));
}

async function getVapeLinesForStore(pool, storeId) {
  try {
    const result = await pool.query(
      `SELECT line_key, label, specs, default_price
       FROM vape_product_lines
       WHERE store_id = $1
       ORDER BY label ASC`,
      [storeId]
    );

    if (result.rows.length > 0) {
      return result.rows.map(formatVapeLineRow);
    }
  } catch (err) {
    if (err.code !== '42P01') {
      throw err;
    }
  }

  return getFallbackVapeLines();
}

async function getVapeLineForStore(pool, storeId, lineKey) {
  try {
    const result = await pool.query(
      `SELECT line_key, label, specs, default_price
       FROM vape_product_lines
       WHERE store_id = $1 AND line_key = $2`,
      [storeId, lineKey]
    );

    if (result.rows.length > 0) {
      return formatVapeLineRow(result.rows[0]);
    }
  } catch (err) {
    if (err.code !== '42P01') {
      throw err;
    }
  }

  return getBuiltInLine(lineKey);
}

async function vapeLineExistsForStore(pool, storeId, lineKey) {
  const line = await getVapeLineForStore(pool, storeId, lineKey);
  return Boolean(line);
}

async function ensureUniqueLineKey(pool, storeId, label, preferredKey) {
  let lineKey = preferredKey || slugifyLineKey(label);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? lineKey : `${lineKey}_${attempt + 1}`;
    const existing = await pool.query(
      `SELECT 1 FROM vape_product_lines WHERE store_id = $1 AND line_key = $2`,
      [storeId, candidate]
    );
    if (existing.rows.length === 0) {
      return candidate;
    }
  }

  return `${lineKey}_${Date.now()}`;
}

async function upsertVapeLine(pool, storeId, { lineKey, label, specs, defaultPrice }) {
  try {
    return await upsertVapeLineRecord(pool, storeId, { lineKey, label, specs, defaultPrice });
  } catch (err) {
    if (err.code === '42P01') {
      return {
        ok: false,
        error: 'Product line storage is not available yet. Run sql/010_vape_lines_and_descriptions.sql on the database.',
      };
    }
    throw err;
  }
}

async function upsertVapeLineRecord(pool, storeId, { lineKey, label, specs, defaultPrice }) {
  const normalizedSpecs = Array.isArray(specs) ? specs : parseSpecsText(specs);
  const trimmedLabel = String(label || '').trim();

  if (!trimmedLabel) {
    return { ok: false, error: 'product line name is required' };
  }

  const resolvedKey = lineKey || (await ensureUniqueLineKey(pool, storeId, trimmedLabel));

  const result = await pool.query(
    `INSERT INTO vape_product_lines (store_id, line_key, label, specs, default_price)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (store_id, line_key)
     DO UPDATE SET
       label = EXCLUDED.label,
       specs = EXCLUDED.specs,
       default_price = EXCLUDED.default_price,
       updated_at = NOW()
     RETURNING line_key, label, specs, default_price`,
    [
      storeId,
      resolvedKey,
      trimmedLabel,
      JSON.stringify(normalizedSpecs),
      defaultPrice == null || defaultPrice === '' ? null : Number(defaultPrice),
    ]
  );

  return { ok: true, line: formatVapeLineRow(result.rows[0]) };
}

function buildVapeLineMap(lines) {
  return lines.reduce((map, line) => {
    map[line.lineKey] = line;
    return map;
  }, {});
}

module.exports = {
  NEW_LINE_OPTION,
  slugifyLineKey,
  parseSpecsText,
  formatSpecsText,
  getBuiltInLine,
  getVapeLinesForStore,
  getVapeLineForStore,
  vapeLineExistsForStore,
  upsertVapeLine,
  buildVapeLineMap,
};
