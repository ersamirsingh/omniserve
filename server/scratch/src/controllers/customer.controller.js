import { Types } from "mongoose";
import { CustomerService } from "../services/customer.service.js";
import { ApiResponseHandler } from "../utils/response.handler.js";
export class CustomerController {
    // Regex patterns from the customer model
    static PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;
    static EMAIL_REGEX = /^\S+@\S+\.\S+$/;
    static PINCODE_REGEX = /^\d{6}$/;
    /**
     * Helper to validate coordinate and location object structures
     */
    static validateAddressPayload(res, address) {
        if (address.pincode && !this.PINCODE_REGEX.test(address.pincode)) {
            ApiResponseHandler.badRequest(res, "Please provide a valid 6-digit pincode");
            return false;
        }
        if (address.location) {
            const { type, coordinates } = address.location;
            if (type && type !== "Point") {
                ApiResponseHandler.badRequest(res, "Address location type must be Point");
                return false;
            }
            if (coordinates) {
                if (!Array.isArray(coordinates) ||
                    coordinates.length !== 2 ||
                    isNaN(coordinates[0]) ||
                    isNaN(coordinates[1])) {
                    ApiResponseHandler.badRequest(res, "Address location coordinates must be an array of two numbers [longitude, latitude]");
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Create or Upsert a Customer
     * POST /customers
     */
    static async upsertCustomer(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { firstName, lastName, phone, email, address } = req.body;
            // Validate required fields
            if (!firstName || !phone) {
                ApiResponseHandler.badRequest(res, "firstName and phone are required");
                return;
            }
            if (typeof firstName !== "string" ||
                firstName.trim().length === 0 ||
                firstName.length > 50) {
                ApiResponseHandler.badRequest(res, "firstName must be a non-empty string and under 50 characters");
                return;
            }
            if (lastName &&
                (typeof lastName !== "string" ||
                    lastName.trim().length === 0 ||
                    lastName.length > 50)) {
                ApiResponseHandler.badRequest(res, "lastName must be a non-empty string and under 50 characters");
                return;
            }
            if (!CustomerController.PHONE_REGEX.test(phone)) {
                ApiResponseHandler.badRequest(res, "Please provide a valid phone number");
                return;
            }
            if (email && !CustomerController.EMAIL_REGEX.test(email)) {
                ApiResponseHandler.badRequest(res, "Please provide a valid email address");
                return;
            }
            // Address structure validation if provided
            if (address && !CustomerController.validateAddressPayload(res, address)) {
                return;
            }
            const customerData = {
                firstName: firstName.trim(),
                lastName: lastName ? lastName.trim() : undefined,
                phone: phone.trim(),
                email: email ? email.trim().toLowerCase() : undefined,
                address,
            };
            const { customer, isNew } = await CustomerService.upsertCustomer(req.user.tenantId, customerData, req.user.userId);
            const responseCode = isNew ? 201 : 200;
            const responseMessage = isNew
                ? "Customer created successfully"
                : "Customer updated successfully";
            ApiResponseHandler.success(res, responseCode, responseMessage, {
                id: customer._id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                fullName: customer.fullName,
                phone: customer.phone,
                email: customer.email,
                totalOrders: customer.totalOrders,
                totalSpent: customer.totalSpent,
                address: customer.address,
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt,
            });
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || "Failed to upsert customer");
        }
    }
    /**
     * List Customers
     * GET /customers
     */
    static async listCustomers(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const search = req.query.search;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const skip = (page - 1) * limit;
            const filters = {
                limit,
                skip,
            };
            if (search && search.trim().length > 0) {
                filters.search = search.trim();
            }
            const { customers, total } = await CustomerService.getCustomers(req.user.tenantId, filters);
            ApiResponseHandler.success(res, 200, "Customers retrieved successfully", {
                customers: customers.map((c) => ({
                    id: c._id,
                    firstName: c.firstName,
                    lastName: c.lastName,
                    fullName: c.fullName,
                    phone: c.phone,
                    email: c.email,
                    totalOrders: c.totalOrders,
                    totalSpent: c.totalSpent,
                    address: c.address,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                })),
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to list customers");
        }
    }
    /**
     * Get Customer Details by ID
     * GET /customers/:id
     */
    static async getCustomerById(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, "Invalid customer ID format");
                return;
            }
            const customer = await CustomerService.getCustomerById(id, req.user.tenantId);
            if (!customer) {
                ApiResponseHandler.notFound(res, "Customer not found");
                return;
            }
            ApiResponseHandler.success(res, 200, "Customer details retrieved successfully", {
                id: customer._id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                fullName: customer.fullName,
                phone: customer.phone,
                email: customer.email,
                totalOrders: customer.totalOrders,
                totalSpent: customer.totalSpent,
                address: customer.address,
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt,
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve customer");
        }
    }
    /**
     * Replace/Update Customer Details
     * PUT /customers/:id
     */
    static async updateCustomer(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, "Invalid customer ID format");
                return;
            }
            const { firstName, lastName, phone, email } = req.body;
            if (!firstName || !phone) {
                ApiResponseHandler.badRequest(res, "firstName and phone are required");
                return;
            }
            if (typeof firstName !== "string" ||
                firstName.trim().length === 0 ||
                firstName.length > 50) {
                ApiResponseHandler.badRequest(res, "firstName must be a non-empty string and under 50 characters");
                return;
            }
            if (lastName &&
                (typeof lastName !== "string" ||
                    lastName.trim().length === 0 ||
                    lastName.length > 50)) {
                ApiResponseHandler.badRequest(res, "lastName must be a non-empty string and under 50 characters");
                return;
            }
            if (!CustomerController.PHONE_REGEX.test(phone)) {
                ApiResponseHandler.badRequest(res, "Please provide a valid phone number");
                return;
            }
            if (email && !CustomerController.EMAIL_REGEX.test(email)) {
                ApiResponseHandler.badRequest(res, "Please provide a valid email address");
                return;
            }
            const updateData = {
                firstName: firstName.trim(),
                lastName: lastName ? lastName.trim() : undefined,
                phone: phone.trim(),
                email: email ? email.trim().toLowerCase() : undefined,
            };
            const customer = await CustomerService.updateCustomer(id, req.user.tenantId, updateData, req.user.userId);
            if (!customer) {
                ApiResponseHandler.notFound(res, "Customer not found");
                return;
            }
            ApiResponseHandler.success(res, 200, "Customer details updated successfully", {
                id: customer._id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                fullName: customer.fullName,
                phone: customer.phone,
                email: customer.email,
                totalOrders: customer.totalOrders,
                totalSpent: customer.totalSpent,
                address: customer.address,
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt,
            });
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || "Failed to update customer");
        }
    }
    /**
     * Soft-delete a Customer
     * DELETE /customers/:id
     */
    static async deleteCustomer(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, "Invalid customer ID format");
                return;
            }
            const customer = await CustomerService.deleteCustomer(id, req.user.tenantId, req.user.userId);
            if (!customer) {
                ApiResponseHandler.notFound(res, "Customer not found");
                return;
            }
            ApiResponseHandler.success(res, 200, "Customer deleted successfully");
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to delete customer");
        }
    }
    /**
     * Add a new Address to Customer profile
     * POST /customers/:id/addresses
     */
    static async addAddress(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, "Invalid customer ID format");
                return;
            }
            const addressData = req.body;
            if (!this.validateAddressPayload(res, addressData)) {
                return;
            }
            const address = await CustomerService.addAddress(id, req.user.tenantId, addressData, req.user.userId);
            if (!address) {
                ApiResponseHandler.notFound(res, "Customer not found");
                return;
            }
            ApiResponseHandler.success(res, 201, "Address added successfully", address);
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || "Failed to add address");
        }
    }
    /**
     * Update an Address
     * PATCH /customers/:id/addresses/:addrId
     */
    static async updateAddress(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { id, addrId } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, "Invalid customer ID format");
                return;
            }
            if (!Types.ObjectId.isValid(addrId)) {
                ApiResponseHandler.badRequest(res, "Invalid address ID format");
                return;
            }
            const addressData = req.body;
            if (!this.validateAddressPayload(res, addressData)) {
                return;
            }
            const address = await CustomerService.updateAddress(id, req.user.tenantId, addrId, addressData, req.user.userId);
            if (!address) {
                ApiResponseHandler.notFound(res, "Customer or address not found");
                return;
            }
            ApiResponseHandler.success(res, 200, "Address updated successfully", address);
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || "Failed to update address");
        }
    }
    /**
     * Delete an Address
     * DELETE /customers/:id/addresses/:addrId
     */
    static async deleteAddress(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { id, addrId } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, "Invalid customer ID format");
                return;
            }
            if (!Types.ObjectId.isValid(addrId)) {
                ApiResponseHandler.badRequest(res, "Invalid address ID format");
                return;
            }
            const success = await CustomerService.deleteAddress(id, req.user.tenantId, addrId, req.user.userId);
            if (!success) {
                ApiResponseHandler.notFound(res, "Customer or address not found");
                return;
            }
            ApiResponseHandler.success(res, 200, "Address deleted successfully");
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to delete address");
        }
    }
}
