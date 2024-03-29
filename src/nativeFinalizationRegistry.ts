/* eslint-disable @typescript-eslint/no-explicit-any */
import { NativeDeletable } from "./native/NativeDeletable";

interface FinalizationRegistry {
  readonly [Symbol.toStringTag]: "FinalizationRegistry";

  /**
   * Registers an object with the registry.
   * @param target The target object to register.
   * @param heldValue The value to pass to the finalizer for this object. This cannot be the
   * target object.
   * @param unregisterToken The token to pass to the unregister method to unregister the target
   * object. If provided (and not undefined), this must be an object. If not provided, the target
   * cannot be unregistered.
   */
  register(target: any, heldValue: any, unregisterToken?: any): void;

  /**
   * Unregisters an object from the registry.
   * @param unregisterToken The token that was used as the unregisterToken argument when calling
   * register to register the target object.
   */
  unregister(unregisterToken: any): void;
}

interface FinalizationRegistryConstructor {
  readonly prototype: FinalizationRegistry;

  /**
   * Creates a finalization registry with an associated cleanup callback
   * @param cleanupCallback The callback to call after an object in the registry has been reclaimed.
   */
  new (cleanupCallback: (heldValue: any) => void): FinalizationRegistry;
}

declare let FinalizationRegistry: FinalizationRegistryConstructor;

export const nativeFinalizationRegistry =
  typeof FinalizationRegistry === "undefined"
    ? undefined
    : new FinalizationRegistry((nativeObj: NativeDeletable) => {
        if (!nativeObj.isDeleted()) {
          nativeObj.delete();
        }
      });
