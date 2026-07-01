export class ZomatoSimulator {
    provider = "MOCK_ZOMATO";
    generatePayload(args) {
        let subtotal = 0;
        const itemsFormatted = args.items.map((it) => {
            const itemPrice = it.price;
            const quantity = it.quantity || 1;
            let itemTotal = itemPrice;
            const addons = [];
            if (it.externalAddonId) {
                const addonPrice = it.addonPrice || 20;
                itemTotal += addonPrice;
                addons.push({
                    addonCode: it.externalAddonId,
                    title: it.addonName || "Extra Addon",
                    charge: addonPrice,
                });
            }
            subtotal += itemTotal * quantity;
            return {
                itemId: it.externalItemId,
                variantCode: it.externalVariantId || undefined,
                title: it.name,
                qty: quantity,
                rate: itemPrice,
                extraAddons: addons.length > 0 ? addons : undefined,
            };
        });
        const payload = {
            orderId: args.orderId,
            outletCode: args.externalOutletId,
            customerDetails: {
                customerName: "Zomato Guest",
                customerPhone: "9876543222",
                customerEmail: "zomato-guest@example.com",
            },
            deliveryInfo: {
                addressLine: "123 Zomato Street",
                cityName: "Mumbai",
                postalCode: "400001",
            },
            paymentDetails: {
                paymentMethod: args.paymentMode === "CASH" ? "CASH" : "ONLINE",
                isPaid: args.paymentMode !== "CASH",
                txId: args.paymentMode !== "CASH" ? `TXN-ZMT-${args.orderId}` : undefined,
            },
            billDetails: {
                totalBill: subtotal,
                taxes: 0,
                deliveryCharge: 0,
                promoDiscount: 0,
                packingCharge: 0,
            },
            cart: {
                items: itemsFormatted,
            },
            instructions: "Keep it hot!",
        };
        if (args.chaos) {
            payload._chaosMode = args.chaos;
        }
        return payload;
    }
}
