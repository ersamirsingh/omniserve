export class ApiResponseHandler {
    static success(res, statusCode, message, data) {
        return res.status(statusCode).json({
            success: true,
            message,
            ...(data && { data }),
        });
    }
    static error(res, statusCode, message, error) {
        return res.status(statusCode).json({
            success: false,
            message,
            ...(error && { error }),
        });
    }
    static unauthorized(res, message = 'Unauthorized') {
        return this.error(res, 401, message);
    }
    static forbidden(res, message = 'Forbidden') {
        return this.error(res, 403, message);
    }
    static notFound(res, message = 'Not found') {
        return this.error(res, 404, message);
    }
    static badRequest(res, message = 'Bad request', data) {
        return res.status(400).json({
            success: false,
            message,
            ...(data && { data }),
        });
    }
    static internalError(res, message = 'Internal server error') {
        return this.error(res, 500, message);
    }
}
