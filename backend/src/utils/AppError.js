export class AppError extends Error {
  constructor(status, message, code = 'ERRO') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
