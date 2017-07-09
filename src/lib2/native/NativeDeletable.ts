export interface NativeDeletable {
  isDeleted(): boolean;
  delete(): void;
}
