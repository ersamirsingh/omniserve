export interface OrderGeneratorOptions {
  provider: 'MOCK_SWIGGY' | 'MOCK_ZOMATO' | 'WEBSITE';
  outletId?: string;
  presetName?: string;
}

const SAMPLE_CUSTOMERS = [
  { name: 'Alex Johnson', phone: '9876543210', email: 'alex@example.com', address: '123 Park Avenue, Downtown' },
  { name: 'Priya Sharma', phone: '9812345678', email: 'priya@example.com', address: '45 Green Park, Tech Hub' },
  { name: 'Rahul Verma', phone: '9765432109', email: 'rahul@example.com', address: '88 Cyber City, Block B' },
  { name: 'Sophia Chen', phone: '9654321098', email: 'sophia@example.com', address: '12 Sunrise Apartments, West End' },
  { name: 'David Smith', phone: '9543210987', email: 'david@example.com', address: '55 Ocean Drive, Harbor Heights' }
];

const PRESETS = [
  {
    name: 'Burger Feast',
    items: [
      { id: 'item_101', title: 'Classic Cheese Burger', price: 249, qty: 2 },
      { id: 'item_102', title: 'Crispy Peri Peri Fries', price: 129, qty: 1 },
      { id: 'item_103', title: 'Cold Coffee Shake', price: 149, qty: 2 }
    ]
  },
  {
    name: 'Pizza Party',
    items: [
      { id: 'item_201', title: 'Farmhouse Special Pizza 12"', price: 499, qty: 1 },
      { id: 'item_202', title: 'Garlic Breadsticks', price: 159, qty: 1 },
      { id: 'item_203', title: 'Choco Lava Cake', price: 119, qty: 2 }
    ]
  },
  {
    name: 'Asian Express',
    items: [
      { id: 'item_301', title: 'Hakka Noodles', price: 229, qty: 1 },
      { id: 'item_302', title: 'Manchurian Gravy', price: 249, qty: 1 },
      { id: 'item_303', title: 'Steamed Momos (8 pcs)', price: 179, qty: 1 }
    ]
  }
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomId(prefix: string): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}_${rand}`;
}

export function generateSwiggyOrderPayload(options: OrderGeneratorOptions): any {
  const customer = getRandomElement(SAMPLE_CUSTOMERS);
  const preset = getRandomElement(PRESETS);
  const orderId = generateRandomId('SWG');

  let subtotal = 0;
  const items = preset.items.map((it) => {
    const qty = Math.floor(Math.random() * 2) + 1;
    subtotal += it.price * qty;
    return {
      item_id: it.id,
      name: it.title,
      quantity: qty,
      price: it.price,
      addons: [
        { addon_id: 'add_01', name: 'Extra Cheese', price: 30 }
      ]
    };
  });

  const tax = Math.round(subtotal * 0.05);
  const deliveryFee = 40;
  const packagingFee = 0;
  const discount = Math.random() > 0.5 ? 50 : 0;
  const totalAmount = subtotal + tax + deliveryFee - discount;

  return {
    order_id: orderId,
    outlet_id: options.outletId || '',
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email
    },
    delivery_address: {
      line1: customer.address,
      city: 'Metropolis',
      state: 'State',
      pincode: '400001'
    },
    payment: {
      mode: 'ONLINE',
      status: 'PAID',
      transaction_id: generateRandomId('TXN')
    },
    pricing: {
      subtotal,
      tax,
      delivery_fee: deliveryFee,
      packaging_fee: packagingFee,
      discount,
      total_amount: totalAmount
    },
    items,
    notes: 'Please deliver quickly and call on arrival.'
  };
}

export function generateZomatoOrderPayload(options: OrderGeneratorOptions): any {
  const customer = getRandomElement(SAMPLE_CUSTOMERS);
  const preset = getRandomElement(PRESETS);
  const orderId = generateRandomId('ZOM');

  let itemSubTotal = 0;
  const items = preset.items.map((it) => {
    const qty = Math.floor(Math.random() * 2) + 1;
    itemSubTotal += it.price * qty;
    return {
      itemId: it.id,
      title: it.title,
      qty,
      rate: it.price,
      extraAddons: [
        { addonCode: 'add_z1', title: 'Spicy Dip', charge: 20 }
      ]
    };
  });

  const taxes = Math.round(itemSubTotal * 0.05);
  const deliveryCharges = 35;
  const packingCharge = 0;
  const promoDiscount = Math.random() > 0.5 ? 40 : 0;
  const totalBill = itemSubTotal + taxes + deliveryCharges - promoDiscount;

  return {
    orderId,
    outletCode: options.outletId || '',
    customerDetails: {
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email
    },
    deliveryInfo: {
      addressLine: customer.address,
      cityName: 'Metropolis',
      postalCode: '400001'
    },
    paymentDetails: {
      paymentMethod: 'ONLINE',
      isPaid: true,
      txId: generateRandomId('TXN_Z')
    },
    billDetails: {
      itemSubTotal,
      taxes,
      deliveryCharges,
      packingCharge,
      promoDiscount,
      totalBill
    },
    cart: {
      items
    },
    instructions: 'Leave at the doorstep if unreachable.'
  };
}

export function generateOrderPayload(options: OrderGeneratorOptions): { endpoint: string; payload: any } {
  let endpoint = '/integrations/mock/swiggy/orders';
  let payload: any;

  if (options.provider === 'MOCK_ZOMATO') {
    endpoint = '/integrations/mock/zomato/orders';
    payload = generateZomatoOrderPayload(options);
  } else {
    // Default Swiggy Mock
    endpoint = '/integrations/mock/swiggy/orders';
    payload = generateSwiggyOrderPayload(options);
  }

  return { endpoint, payload };
}
