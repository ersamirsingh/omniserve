export class SwiggySimulator {
    provider = "MOCK_SWIGGY";
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
                    addon_id: it.externalAddonId,
                    name: it.addonName || "Extra Addon",
                    price: addonPrice,
                });
            }
            subtotal += itemTotal * quantity;
            return {
                item_id: it.externalItemId,
                name: it.name,
                quantity,
                price: itemPrice,
                variant_id: it.externalVariantId || undefined,
                addons: addons.length > 0 ? addons : undefined,
            };
        });
        const totalAmount = subtotal;
        const payload = {
            order_id: args.orderId,
            outlet_id: args.externalOutletId,
            customer: {
                name: "Swiggy Guest",
                phone: "9876543210",
                email: "swiggy-guest@example.com",
            },
            pricing: {
                subtotal,
                tax: 0,
                delivery_fee: 0,
                discount: 0,
                total_amount: totalAmount,
            },
            payment: {
                mode: args.paymentMode === "CASH" ? "COD" : "ONLINE",
                status: args.paymentMode === "CASH" ? "PENDING" : "PAID",
            },
            items: itemsFormatted,
        };
        if (args.chaos) {
            payload._chaosMode = args.chaos;
        }
        return payload;
    }
}
