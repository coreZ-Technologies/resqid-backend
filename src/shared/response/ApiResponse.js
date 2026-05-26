// src/utils/apiResponse.js

export class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  static send(res, statusCode, data, message = 'Success') {
    return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
  }

  // 2xx
  static ok(res, data, message = 'Success') {
    return this.send(res, 200, data, message);
  }

  static created(res, data, message = 'Created successfully') {
    return this.send(res, 201, data, message);
  }

  static noContent(res) {
    return res.status(204).send();
  }
}
