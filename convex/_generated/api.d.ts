/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as approvals from "../approvals.js";
import type * as events from "../events.js";
import type * as executions from "../executions.js";
import type * as hostExecutor from "../hostExecutor.js";
import type * as kernel from "../kernel.js";
import type * as lib_events from "../lib/events.js";
import type * as lib_shapes from "../lib/shapes.js";
import type * as manifests from "../manifests.js";
import type * as world from "../world.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  approvals: typeof approvals;
  events: typeof events;
  executions: typeof executions;
  hostExecutor: typeof hostExecutor;
  kernel: typeof kernel;
  "lib/events": typeof lib_events;
  "lib/shapes": typeof lib_shapes;
  manifests: typeof manifests;
  world: typeof world;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
