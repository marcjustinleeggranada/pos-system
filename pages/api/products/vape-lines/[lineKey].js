import requireAuth from '../../../../middleware/requireAuth';
import pool from '../../../../lib/db';
import { getDepartmentForStore } from '../../../../lib/categories';
import { getVapeLineForStore, upsertVapeLine } from '../../../../lib/vapeLines';

async function handler(req, res) {
  if (getDepartmentForStore(req.storeId) !== 'vape') {
    return res.status(403).json({ error: 'Vape product lines are only available for vape stores' });
  }

  const lineKey = String(req.query.lineKey || '').trim();
  if (!lineKey) {
    return res.status(400).json({ error: 'Invalid product line key' });
  }

  if (req.method === 'GET') {
    try {
      const line = await getVapeLineForStore(pool, req.storeId, lineKey);
      if (!line) {
        return res.status(404).json({ error: 'Product line not found' });
      }
      return res.status(200).json({ line });
    } catch (err) {
      console.error('Vape line fetch error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    const { label, specs, default_price } = req.body || {};

    try {
      const existing = await getVapeLineForStore(pool, req.storeId, lineKey);
      if (!existing) {
        return res.status(404).json({ error: 'Product line not found' });
      }

      const result = await upsertVapeLine(pool, req.storeId, {
        lineKey,
        label: label ?? existing.label,
        specs: specs ?? existing.specs,
        defaultPrice: default_price ?? existing.defaultPrice,
      });

      if (!result.ok) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(200).json({ line: result.line });
    } catch (err) {
      console.error('Vape line update error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
