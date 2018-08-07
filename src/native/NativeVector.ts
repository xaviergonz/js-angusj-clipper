import { NativeDeletable } from "./NativeDeletable";

export interface NativeVector<T> extends NativeDeletable {
  size(): number;
  get(index: number): T;
  set(index: number, value: T): void;
}
