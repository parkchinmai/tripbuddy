export type FeeMode = 'none' | 'sc' | 'vat' | 'both';
export type FeeOrder = 'sc_then_vat' | 'vat_then_sc';

export interface FeeConfig {
  feeMode: FeeMode;
  feeOrder: FeeOrder;
}

export interface BillItem {
  name: string;
  price: number;
  quantity: number;
  type: 'shared' | 'shared_selected' | 'personal';
  assignedTo?: string;
  sharedWith?: string[];
}

export function calcFees(subtotal: number, config: FeeConfig): { serviceCharge: number; vat: number; total: number } {
  if (subtotal === 0) return { serviceCharge: 0, vat: 0, total: 0 };

  if (config.feeMode === 'none') {
    return { serviceCharge: 0, vat: 0, total: subtotal };
  }
  if (config.feeMode === 'sc') {
    const sc = subtotal * 0.1;
    return { serviceCharge: sc, vat: 0, total: subtotal + sc };
  }
  if (config.feeMode === 'vat') {
    const vat = subtotal * 0.07;
    return { serviceCharge: 0, vat, total: subtotal + vat };
  }
  if (config.feeOrder === 'sc_then_vat') {
    const sc = subtotal * 0.1;
    const vat = (subtotal + sc) * 0.07;
    return { serviceCharge: sc, vat, total: subtotal + sc + vat };
  }
  const vat = subtotal * 0.07;
  const sc = (subtotal + vat) * 0.1;
  return { serviceCharge: sc, vat, total: subtotal + sc + vat };
}

export function calcBillSplit(
  items: BillItem[],
  members: string[],
  feeConfig?: FeeConfig
): Record<string, number> {
  const config = feeConfig || { feeMode: 'both', feeOrder: 'sc_then_vat' as const };
  const itemTotals = items.map(i => ({ ...i, total: i.price * i.quantity }));
  const subtotal = itemTotals.reduce((s, i) => s + i.total, 0);
  if (subtotal === 0 || members.length === 0) return {};

  const { serviceCharge, vat, total: _total } = calcFees(subtotal, config);
  const fees = serviceCharge + vat;
  const count = members.length;

  const shares: Record<string, number> = {};
  for (const name of members) {
    const personalSum = itemTotals
      .filter(i => i.type === 'personal' && i.assignedTo === name)
      .reduce((s, i) => s + i.total, 0);

    const sharedSum = itemTotals
      .filter(i => i.type === 'shared')
      .reduce((s, i) => s + i.total, 0);
    const sharedPerPerson = count > 0 ? sharedSum / count : 0;

    const selectedSharedSum = itemTotals
      .filter(i => i.type === 'shared_selected' && i.sharedWith?.includes(name))
      .reduce((s, i) => s + (i.sharedWith?.length ? i.total / i.sharedWith.length : 0), 0);

    const personSubtotal = personalSum + sharedPerPerson + selectedSharedSum;
    const feeShare = subtotal > 0 ? (personSubtotal / subtotal) * fees : 0;
    shares[name] = Math.round((personSubtotal + feeShare) * 100) / 100;
  }

  return shares;
}
