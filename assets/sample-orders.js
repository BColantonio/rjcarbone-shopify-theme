/**
 * Fictional order fixtures shared by the local returns and saved-orders prototypes.
 *
 * @typedef {{ id: string, title: string, purchasedQuantity: number }} SampleOrderItem
 * @typedef {{ id: string, date: string, items: SampleOrderItem[] }} SampleOrder
 */

/** @type {SampleOrder[]} */
export const sampleOrders = [
  {
    id: 'DEMO-1042',
    date: '2026-02-14',
    items: [
      {
        id: 'sample-roscass5047',
        title: 'Rose Sample - ROSCASS5047 - Confirm Title',
        purchasedQuantity: 3,
      },
      { id: 'sample-yarass10', title: 'Achillea Yarrow Assorted #10', purchasedQuantity: 2 },
      { id: 'sample-gco', title: 'Cocculus', purchasedQuantity: 1 },
    ],
  },
  {
    id: 'DEMO-2087',
    date: '2026-03-08',
    items: [
      {
        id: 'sample-ssofp213144gop',
        title: 'Gold/Platinum Palladium Mix Pick - 17 inches',
        purchasedQuantity: 5,
      },
      {
        id: 'sample-sxm683gd',
        title: 'Glitter Holly Spray Gold - 17 inches - Dozen',
        purchasedQuantity: 2,
      },
      {
        id: 'sample-sxmdvp1325re',
        title: 'Embossed Red Velvet/Glitter Poinsettia Stem - 13.25 inches',
        purchasedQuantity: 4,
      },
    ],
  },
];
