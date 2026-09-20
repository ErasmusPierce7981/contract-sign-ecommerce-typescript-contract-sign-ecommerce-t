import assert from "node:assert/strict";
import { fulfillmentState } from "./checkout_service.js";

const checkout = { orderId: "order-1", customerEmail: "buyer@example.com", items: [{ name: "mug", quantity: 2, unitPrice: 12 }] };
assert.equal(fulfillmentState(checkout), "ready_for_fulfillment");
assert.equal(fulfillmentState({ ...checkout, items: [{ ...checkout.items[0], quantity: 0 }] }), "needs_review");
console.log("checkout fulfillment decision passes");
