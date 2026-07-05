# API Dependency Map

This map outlines the flow of business logic and execution pipelines across services for key operations in the **FoodMesh Platform**.

---

## 1. Aggregator Webhook Ordering Pipeline (Online Order)

```
[POST /api/v1/integrations/mock/swiggy/orders]
                     │
                     ▼
[IntegrationController.receiveMockSwiggyOrder]
                     │
                     ▼
       [OrderGatewayService.ingestSwiggy]
                     │
                     ▼
[MappingResolutionService.resolveOutletAndItems]
                     │
                     ▼
        [OrderService.createExternalOrder]
                     │
                     ▼
       [InventoryService.deductStock] (Lazy Allocation Fallback)
                     │
                     ▼
   [OrderTimelineService.logEvent] (State: PLACED)
                     │
                     ▼
     [EventBusService.publish] (Transactional Outbox Queue)
                     │
                     ▼
 [RealtimeSocket.broadcast] (Alert staff and KDS monitors)
```

---

## 2. Dine-In Table Ordering Flow (QR Session)

```
[POST /api/v1/public/qr/orders]
                     │
                     ▼
    [PublicController.placeQrOrder]
                     │
                     ▼
   [QRSessionService.verifyActive]
                     │
                     ▼
       [OrderService.createDineInOrder]
                     │
                     ▼
     [KdsService.enqueuePrepTicket]
                     │
                     ▼
     [BillingService.linkOrderToSession]
                     │
                     ▼
 [RealtimeSocket.broadcast] (Alert kitchen and waiter dashboard)
```

---

## 3. POS Billing & Table Release Flow

```
[POST /api/v1/billing/sessions/:sessionId/bill]
                     │
                     ▼
[BillingController.finalizeSessionBill]
                     │
                     ▼
    [BillingService.calculateSubtotalAndTaxes]
                     │
                     ▼
        [PaymentService.chargePOS]
                     │
                     ▼
     [QRSessionService.closeSession]
                     │
                     ▼
      [TableService.releaseTable] (Status -> AVAILABLE)
                     │
                     ▼
 [RealtimeSocket.broadcast] (Update floor map display)
```
