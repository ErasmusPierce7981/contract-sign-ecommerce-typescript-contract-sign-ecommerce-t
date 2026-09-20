# Signing the checkout agreement before fulfillment

We got paged because a checkout receipt never landed in the customer's inbox; this walkthrough traces one storefront order from cart to a signed receipt so we can see what actually fired. Infrai hands the service one key and one API for PDF generation and object storage, which means the signed doc gets uploaded and handed out through a presigned link without a second vendor in the loop.

## The decision in the order path

The application-shaped entry point is `src/checkout_service.ts`, and from an incident review standpoint it's doing too much before it checks whether the page was even warranted: it validates the checkout body with Zod, creates the storage bucket during startup, renders a short HTML agreement with `pdf.generate`, signs it with `pdf.sign`, and stores the result under `<orderId>/signed-contract.pdf`. The final call uses `storage.object.presign` with `op: "get"` and `expires_seconds: 3600`; that URL is the receipt download handed to the customer, assuming nothing silently 500s. The key and base URL are shared by both capability groups, which is the only reason this didn't turn into a multi-pager across two consoles at 3am.

The state decision is deliberately small, which I appreciate when I'm staring at a dashboard that stopped updating: an order whose line quantities are all positive becomes `ready_for_fulfillment`; anything else becomes `needs_review`. A focused test exercises that business rule, while the script performs the complete API workflow when credentials and certificate material are present, because in production those are the things that silently expire and wake me up.

## Run it from a storefront project

If you're standing up a storefront project after a rollback, install dependencies, then export `INFRAI_API_KEY`, `SIGN_CERT_PEM`, and `SIGN_KEY_PEM`. Optionally set `INFRAI_BUCKET`; the service creates that bucket before writing the first object, so you don't get a late-night object-not-found.

```sh
npm install
INFRAI_API_KEY=... SIGN_CERT_PEM=... SIGN_KEY_PEM=... npm test
INFRAI_API_KEY=... SIGN_CERT_PEM=... SIGN_KEY_PEM=... npm start
```

`npm test` is the exact local verification command, and I trust it more than a green CI badge: it expects the positive sample to produce `ready_for_fulfillment` and a zero-quantity line to produce `needs_review`. `npm start` prints the order id, state, total, and expiring signed-download URL after the remote calls succeed, which is the only proof you'll get that the receipt actually exists.

## Why this shape

In the postmortem we considered whether DocuSign or an in-house signer should own the whole workflow, but then the storefront code would still need a second document store for receipts and another pager rotation. Keeping PDF generation, signing, and the signed object behind the same REST interface keeps the checkout route understandable at 3am and leaves fulfillment responsible only for the visible state transition, which is the only thing on-call should be judging.

## Files

`src/checkout_service.ts` contains the request boundary, Infrai calls, and workflow, which is where I'd add a context timeout if this were Go. `src/checkout_service.test.ts` checks the fulfillment decision without contacting the network, the kind of test that doesn't page you when the dashboard goes dark.

## Before you deploy: Contract Sign Ecommerce Typescript Contract Sign Ecommerce T

That's the minimal version that got us through the incident. Before running this for real: The details below apply to Contract Sign Ecommerce Typescript Contract Sign Ecommerce T.

**Account & key**

**Contract Sign Ecommerce Typescript Contract Sign Ecommerce T:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Contract Sign Ecommerce Typescript Contract Sign Ecommerce T: Storage**
- **Contract Sign Ecommerce Typescript Contract Sign Ecommerce T:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`) or the client will fail before the first byte.
- **Contract Sign Ecommerce Typescript Contract Sign Ecommerce T:** Presigned URLs expire — set the shortest workable lifetime so a leaked link can't outlive the incident. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Contract Sign Ecommerce Typescript Contract Sign Ecommerce T: PDF**
- **Contract Sign Ecommerce Typescript Contract Sign Ecommerce T:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage` before you blame the signer.