import requireAuth from '../../../../middleware/requireAuth';
import pool from '../../../../lib/db';
import { getDepartmentForStore } from '../../../../lib/categories';
import {
  getVapeLinesForStore,
  parseSpecsText,
  upsertVapeLine,
} from '../../../../lib/vapeLines';

async function handler(req, res) {
  if (getDepartmentForStore(req.storeId) !== 'vape') {
    return res.status(403).json({ error: 'Vape product lines are only available for vape stores' });
  }

  if (req.method === 'GET') {
    try {
      const lines = await getVapeLinesForStore(pool, req.storeId);
      return res.status(200).json({ lines });
    } catch (err) {
      console.error('Vape lines list error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { label, specs, default_price, line_key } = req.body || {};

    try {
      const result = await upsertVapeLine(pool, req.storeId, {
        lineKey: line_key ? String(line_key).trim() : undefined,
        label,
        specs: parseSpecsText(specs),
        defaultPrice: default_price,
      });

      if (!result.ok) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(201).json({ line: result.line });
    } catch (err) {
      console.error('Vape line create error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
