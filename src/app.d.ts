// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      // Example: set by hooks.server.ts after validating a cookie/JWT.
      user?: import("$lib/server/types/auth").SessionUser;
    }

    interface PageData {
      // Example: anything you return from load functions.
      currentUser?: import("$lib/server/types/auth").SessionUser;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
