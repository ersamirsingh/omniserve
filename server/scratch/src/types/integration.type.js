export var IntegrationProvider;
(function (IntegrationProvider) {
    IntegrationProvider["QR"] = "QR";
    IntegrationProvider["MOCK_SWIGGY"] = "MOCK_SWIGGY";
    IntegrationProvider["MOCK_ZOMATO"] = "MOCK_ZOMATO";
    IntegrationProvider["SWIGGY"] = "SWIGGY";
    IntegrationProvider["ZOMATO"] = "ZOMATO";
    IntegrationProvider["ONDC"] = "ONDC";
    IntegrationProvider["MAGICPIN"] = "MAGICPIN";
    IntegrationProvider["WEBSITE"] = "WEBSITE";
    IntegrationProvider["WHATSAPP"] = "WHATSAPP";
    IntegrationProvider["PORTER"] = "PORTER";
    IntegrationProvider["DUNZO"] = "DUNZO";
    IntegrationProvider["CUSTOM"] = "CUSTOM";
})(IntegrationProvider || (IntegrationProvider = {}));
export var IntegrationConnectionStatus;
(function (IntegrationConnectionStatus) {
    IntegrationConnectionStatus["ACTIVE"] = "ACTIVE";
    IntegrationConnectionStatus["PAUSED"] = "PAUSED";
    IntegrationConnectionStatus["ERROR"] = "ERROR";
})(IntegrationConnectionStatus || (IntegrationConnectionStatus = {}));
export var IntegrationProcessingStatus;
(function (IntegrationProcessingStatus) {
    IntegrationProcessingStatus["RECEIVED"] = "RECEIVED";
    IntegrationProcessingStatus["NORMALIZING"] = "NORMALIZING";
    IntegrationProcessingStatus["NORMALIZED"] = "NORMALIZED";
    IntegrationProcessingStatus["PLACED"] = "PLACED";
    IntegrationProcessingStatus["MAPPING_REVIEW_REQUIRED"] = "MAPPING_REVIEW_REQUIRED";
    IntegrationProcessingStatus["FAILED_VALIDATION"] = "FAILED_VALIDATION";
    IntegrationProcessingStatus["RETRY_PENDING"] = "RETRY_PENDING";
    IntegrationProcessingStatus["DLQ"] = "DLQ";
    IntegrationProcessingStatus["CANCELLED"] = "CANCELLED";
})(IntegrationProcessingStatus || (IntegrationProcessingStatus = {}));
export var IntegrationEventDirection;
(function (IntegrationEventDirection) {
    IntegrationEventDirection["INBOUND"] = "INBOUND";
    IntegrationEventDirection["OUTBOUND"] = "OUTBOUND";
    IntegrationEventDirection["INTERNAL"] = "INTERNAL";
})(IntegrationEventDirection || (IntegrationEventDirection = {}));
export var IntegrationEventStatus;
(function (IntegrationEventStatus) {
    IntegrationEventStatus["PENDING"] = "PENDING";
    IntegrationEventStatus["PROCESSING"] = "PROCESSING";
    IntegrationEventStatus["SUCCESS"] = "SUCCESS";
    IntegrationEventStatus["FAILED"] = "FAILED";
    IntegrationEventStatus["RETRY_PENDING"] = "RETRY_PENDING";
    IntegrationEventStatus["DLQ"] = "DLQ";
    IntegrationEventStatus["SKIPPED"] = "SKIPPED";
})(IntegrationEventStatus || (IntegrationEventStatus = {}));
export var SyncJobType;
(function (SyncJobType) {
    SyncJobType["MENU_PUBLISH"] = "MENU_PUBLISH";
    SyncJobType["INVENTORY_UPDATE"] = "INVENTORY_UPDATE";
    SyncJobType["STATUS_UPDATE"] = "STATUS_UPDATE";
    SyncJobType["ORDER_ACK"] = "ORDER_ACK";
    SyncJobType["ORDER_CANCEL"] = "ORDER_CANCEL";
    SyncJobType["MENU_SYNC"] = "MENU_SYNC";
    SyncJobType["INVENTORY_SYNC"] = "INVENTORY_SYNC";
    SyncJobType["ORDER_STATUS_SYNC"] = "ORDER_STATUS_SYNC";
})(SyncJobType || (SyncJobType = {}));
export var SyncJobStatus;
(function (SyncJobStatus) {
    SyncJobStatus["PENDING"] = "PENDING";
    SyncJobStatus["PROCESSING"] = "PROCESSING";
    SyncJobStatus["SUCCESS"] = "SUCCESS";
    SyncJobStatus["FAILED"] = "FAILED";
    SyncJobStatus["RETRY_PENDING"] = "RETRY_PENDING";
    SyncJobStatus["DLQ"] = "DLQ";
    SyncJobStatus["CANCELLED"] = "CANCELLED";
})(SyncJobStatus || (SyncJobStatus = {}));
