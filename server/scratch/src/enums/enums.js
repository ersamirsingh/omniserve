export var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["RESTAURANT_OWNER"] = "RESTAURANT_OWNER";
    UserRole["OUTLET_MANAGER"] = "OUTLET_MANAGER";
    UserRole["STAFF"] = "STAFF";
})(UserRole || (UserRole = {}));
export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
    UserStatus["BLOCKED"] = "BLOCKED";
})(UserStatus || (UserStatus = {}));
export var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["ACCEPTED"] = "ACCEPTED";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY"] = "READY";
    OrderStatus["PICKED_UP"] = "PICKED_UP";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (OrderStatus = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (PaymentStatus = {}));
export var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["FREE"] = "FREE";
    SubscriptionPlan["STARTER"] = "STARTER";
    SubscriptionPlan["PRO"] = "PRO";
    SubscriptionPlan["ENTERPRISE"] = "ENTERPRISE";
})(SubscriptionPlan || (SubscriptionPlan = {}));
export var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["RESTORE"] = "RESTORE";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["EXPORT"] = "EXPORT";
    AuditAction["IMPORT"] = "IMPORT";
    AuditAction["STATUS_CHANGE"] = "STATUS_CHANGE";
})(AuditAction || (AuditAction = {}));
export var NotificationType;
(function (NotificationType) {
    NotificationType["ORDER_PLACED"] = "ORDER_PLACED";
    NotificationType["ORDER_ACCEPTED"] = "ORDER_ACCEPTED";
    NotificationType["ORDER_PREPARING"] = "ORDER_PREPARING";
    NotificationType["ORDER_READY"] = "ORDER_READY";
    NotificationType["ORDER_DELIVERED"] = "ORDER_DELIVERED";
    NotificationType["ORDER_CANCELLED"] = "ORDER_CANCELLED";
    NotificationType["PAYMENT_SUCCESS"] = "PAYMENT_SUCCESS";
    NotificationType["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    NotificationType["LOW_INVENTORY"] = "LOW_INVENTORY";
    NotificationType["SYSTEM"] = "SYSTEM";
    NotificationType["GENERAL"] = "GENERAL";
    NotificationType["OPERATIONAL_ALERT"] = "OPERATIONAL_ALERT";
})(NotificationType || (NotificationType = {}));
export var WebhookStatus;
(function (WebhookStatus) {
    WebhookStatus["PENDING"] = "PENDING";
    WebhookStatus["PROCESSING"] = "PROCESSING";
    WebhookStatus["SUCCESS"] = "SUCCESS";
    WebhookStatus["FAILED"] = "FAILED";
})(WebhookStatus || (WebhookStatus = {}));
export var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["INACTIVE"] = "INACTIVE";
    SubscriptionStatus["CANCELLED"] = "CANCELLED";
})(SubscriptionStatus || (SubscriptionStatus = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["WALLET"] = "WALLET";
    PaymentMethod["NET_BANKING"] = "NET_BANKING";
    PaymentMethod["COD"] = "COD";
})(PaymentMethod || (PaymentMethod = {}));
export var OrderSource;
(function (OrderSource) {
    OrderSource["DINE_IN"] = "DINE_IN";
    OrderSource["TAKEAWAY"] = "TAKEAWAY";
    OrderSource["DELIVERY"] = "DELIVERY";
    OrderSource["ONLINE"] = "ONLINE";
    OrderSource["QR_DINE_IN"] = "QR_DINE_IN";
    OrderSource["SWIGGY"] = "SWIGGY";
    OrderSource["ZOMATO"] = "ZOMATO";
    OrderSource["POS"] = "POS";
    OrderSource["WEBSITE"] = "WEBSITE";
    OrderSource["ONDC"] = "ONDC";
    OrderSource["WHATSAPP"] = "WHATSAPP";
    OrderSource["WAITER"] = "WAITER";
})(OrderSource || (OrderSource = {}));
export var ReviewSource;
(function (ReviewSource) {
    ReviewSource["GOOGLE"] = "GOOGLE";
    ReviewSource["ZOMATO"] = "ZOMATO";
    ReviewSource["SWIGGY"] = "SWIGGY";
    ReviewSource["INTERNAL"] = "INTERNAL";
    ReviewSource["FACEBOOK"] = "FACEBOOK";
    ReviewSource["TRIPADVISOR"] = "TRIPADVISOR";
    ReviewSource["OTHER"] = "OTHER";
})(ReviewSource || (ReviewSource = {}));
export var SentimentLabel;
(function (SentimentLabel) {
    SentimentLabel["POSITIVE"] = "POSITIVE";
    SentimentLabel["NEUTRAL"] = "NEUTRAL";
    SentimentLabel["NEGATIVE"] = "NEGATIVE";
})(SentimentLabel || (SentimentLabel = {}));
export var WebhookProvider;
(function (WebhookProvider) {
    WebhookProvider["RAZORPAY"] = "RAZORPAY";
    WebhookProvider["STRIPE"] = "STRIPE";
    WebhookProvider["ZOMATO"] = "ZOMATO";
    WebhookProvider["SWIGGY"] = "SWIGGY";
    WebhookProvider["DUNZO"] = "DUNZO";
    WebhookProvider["PORTER"] = "PORTER";
    WebhookProvider["CUSTOM"] = "CUSTOM";
})(WebhookProvider || (WebhookProvider = {}));
export var WeekDay;
(function (WeekDay) {
    WeekDay["MONDAY"] = "Monday";
    WeekDay["TUESDAY"] = "Tuesday";
    WeekDay["WEDNESDAY"] = "Wednesday";
    WeekDay["THURSDAY"] = "Thursday";
    WeekDay["FRIDAY"] = "Friday";
    WeekDay["SATURDAY"] = "Saturday";
    WeekDay["SUNDAY"] = "Sunday";
})(WeekDay || (WeekDay = {}));
