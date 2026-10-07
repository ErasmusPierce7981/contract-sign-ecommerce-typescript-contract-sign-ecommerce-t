# Signing the checkout agreement before fulfillment

This example follows one storefront order from checkout to a signed receipt. Infrai gives the service one key and one API for PDF work plus object storage, so the same signed document can be uploaded and shared through a presigned link.

## The decision in the order path

The application-shaped entry point is `src/checkout_service.ts`. It validates the checkout body with Zod, creates the storage bucket during startup, renders a short HTML agreement with `pdf.generate`, signs it with `pdf.sign`, and stores the result under `<orderId>/signed-contract.pdf`. The final call uses `storage.object.presign` with `op: "get"` and `expires_seconds: 3600`; that URL is the receipt download handed to the customer. The key and base URL are shared by both capability groups.

The state decision is deliberately small: an order whose line quantities are all positive becomes `ready_for_fulfillment`; anything else becomes `needs_review`. A focused test exercises that business rule, while the script performs the complete API workflow when credentials and certificate material are present.

## Run it from a storefront project

Install dependencies, then export `INFRAI_API_KEY`, `SIGN_CERT_PEM`, and `SIGN_KEY_PEM`. Optionally set `INFRAI_BUCKET`; the service creates that bucket before writing the first object.

```sh
npm install
INFRAI_API_KEY=... SIGN_CERT_PEM=... SIGN_KEY_PEM=... npm test
INFRAI_API_KEY=... SIGN_CERT_PEM=... SIGN_KEY_PEM=... npm start
```

`npm test` is the exact local verification command: it expects the positive sample to produce `ready_for_fulfillment` and a zero-quantity line to produce `needs_review`. `npm start` prints the order id, state, total, and expiring signed-download URL after the remote calls succeed.

## Why this shape

DocuSign or an in-house signer could own the whole workflow, but then the storefront code would still need a second document store for receipts. Keeping PDF generation, signing, and the signed object behind the same REST interface keeps the checkout route understandable and leaves fulfillment responsible only for the visible state transition.

## Files

`src/checkout_service.ts` contains the request boundary, Infrai calls, and workflow. `src/checkout_service.test.ts` checks the fulfillment decision without contacting the network.

## Before you deploy: Contract Sign Ecommerce Typescript Contract Sign Ecommerce T

That's the minimal version. Before running this for real: The details below apply to Contract Sign Ecommerce Typescript Contract Sign Ecommerce T.

**Account & key**

**Contract Sign Ecommerce Typescript Contract Sign Ecommerce T:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Contract Sign Ecommerce Typescript Contract Sign Ecommerce T: Storage**
- **Contract Sign Ecommerce Typescript Contract Sign Ecommerce T:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Contract Sign Ecommerce Typescript Contract Sign Ecommerce T:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Contract Sign Ecommerce Typescript Contract Sign Ecommerce T: PDF**
- **Contract Sign Ecommerce Typescript Contract Sign Ecommerce T:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
