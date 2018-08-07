export class ClipperError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, ClipperError.prototype);
    this.name = this.constructor.name;
    this.stack = new Error().stack;
  }
}
