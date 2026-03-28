"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
function validate(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                res.status(400).json({
                    error: {
                        message: "Validation failed",
                        code: "VALIDATION_ERROR",
                        details: err.errors.map((e) => ({
                            field: e.path.join("."),
                            message: e.message,
                        })),
                    },
                });
                return;
            }
            next(err);
        }
    };
}
//# sourceMappingURL=validate.js.map