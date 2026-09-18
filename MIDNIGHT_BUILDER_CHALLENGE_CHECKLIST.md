# MeritVeil — Midnight Builder Challenge Checklist

Execution is gated per submission: complete and submit one level, then wait for confirmation before starting the next. Level 4 also requires accepted Level 3 proposal approval.

## Level 1 — New Moon

Goal: prove the local Midnight toolchain and a privacy-aware contract on Preview.

- [x] Scaffold `meritveil-learning` from the official hello-world template in WSL.
- [x] Rename the source, generated artifact path, scripts, and imports to `contracts/counter.compact`, `tests/counter.test.ts`, and `managed/counter/`.
- [x] Pin Node 22.23.1, npm 10.9.8, Compact compiler 0.31.1, MidnightJS 4.1.1, ledger 8.1.0, on-chain runtime 3.0.0, and proof server 8.1.0.
- [x] Boot the undeployed node, indexer, and proof server; compile and deploy the renamed starter.
- [x] Implement the private-owner counter with public counter/commitment state and a private `Bytes<32>` owner witness.
- [x] Prove a valid owner increment on the undeployed network and read back the confirmed public count.
- [x] Add behavior tests for a valid owner, a rejected wrong secret with unchanged state, and absence of the secret from decoded public state.
- [x] Generate the circuit, prover key, verifier key, compiler metadata, and TypeScript binding under `managed/counter/`.
- [x] Fund the generated Preview wallet through the Preview faucet.
- [x] Deploy the private-owner counter to Preview and capture the contract address.
- [x] Complete README description, address table, behavior, privacy model, stack, prerequisites, setup, tests, initial idea, and screenshot sections.
- [x] Add compile and deployment screenshots.
- [x] Fill the final Initial Idea paragraph.
- [x] Make at least five meaningful commits.
- [x] Push a public GitHub repository.
- [ ] Submit Level 1 through the challenge portal.

### Level 1 exit proof

- [x] Compact compile command succeeds.
- [x] Three behavior tests pass.
- [x] Preview deployment address appears in README.
- [x] Repository contains all final source, generated artifacts, tests, lockfile, and complete README.

## Level 2 — Waxing Crescent

Goal: add the wallet-to-proof-to-chain browser flow to the Level 1 repository.

- [ ] Add a React + Vite browser workspace using the active leaderboard browser layout.
- [ ] Implement `CounterAPI` for deploy/join, private-state binding, state subscription, ledger decoding, and increment calls.
- [ ] Deploy the unchanged counter from the browser to Preprod with a new browser-private owner secret.
- [ ] Implement Lace discovery, chooser, Preprod network checks, rejection/install guidance, and disconnect.
- [ ] Centralize wallet, network, indexer, proof-server, public-data, private-state, and ZK providers in one browser manager.
- [ ] Show idle, proving, submitting, confirmed, rejected, and failed transaction states.
- [ ] Read the confirmed counter value from the indexer and keep the private secret out of UI, logs, URLs, analytics, and ledger reads.
- [ ] Use one typed Vite environment object and commit only `.env.example`.
- [ ] Build and manually inspect the complete browser flow and console.
- [ ] Deploy the static app to Vercel with Lace using the tester's local proof server.
- [ ] Update README with the live URL, Preprod address, privacy claim, prerequisites, local steps, and demo placeholder.
- [ ] Record the under-two-minute demo, make at least eight meaningful commits, and submit Level 2.

### Level 2 exit proof

- [ ] Production build succeeds with zero errors.
- [ ] A fresh browser without Lace shows installation guidance.
- [ ] Lace connects to Preprod, increment confirms, the indexer returns the new count, and disconnect clears wallet state.
- [ ] The public deployment points to the documented Preprod contract.

## Level 3 — First Quarter

Goal: harden the learning DApp and obtain proposal approval for MeritVeil.

- [ ] Strengthen contract tests around transitions, authorization, duplicate prevention, and private-data absence.
- [ ] Add GitHub Actions for pinned install, Compact compile, contract tests, and browser build.
- [ ] Add the green CI badge directly below the README title.
- [ ] Polish wallet/proof/submission errors, loading states, mobile layout, focus/keyboard behavior, privacy copy, and console cleanliness.
- [ ] Create `PROPOSAL.md` with the challenge's exact headings and the complete MeritVeil proposal.
- [ ] Keep the proposal narrow: one organizer and quest per contract, public terms and funded tNIGHT pool, organizer-reviewed evidence, private participant-bound attestation, one payout per commitment.
- [ ] Put README sections in the required order and link the proposal.
- [ ] Record the one-minute demo, make at least ten meaningful commits, submit Level 3, and wait for approval.

### Level 3 exit proof

- [ ] CI passes from a clean checkout.
- [ ] Production build and demonstrated flow have zero console errors.
- [ ] README contains a live URL and non-empty Preprod address.
- [ ] `PROPOSAL.md` uses the literal challenge headings and matches the planned privacy model.

## Level 4 — Waxing Gibbous

Goal: build and deploy the approved MeritVeil MVP in a fresh repository.

- [ ] After proposal approval, scaffold `meritveil` from the official leaderboard template in WSL.
- [ ] Keep `contract/` and `api/`, rename the browser workspace to `web/`, add `docs/`, and remove every leaderboard path and symbol.
- [ ] Pin the coherent Midnight stack and commit `contract/managed/meritveil/`.
- [ ] Add and validate canonical `web/public/quest.json`; implement the shared RFC 8785/SHA-256 248-bit `questDigest` algorithm.
- [ ] Implement the exact Compact state model, constructor bounds, quest-scoped identities, and private witnesses.
- [ ] Implement exact one-time funding with native tNIGHT in integer STAR.
- [ ] Port the official ZK Loan Jubjub Schnorr verification module and reuse its generated challenge circuit for signing.
- [ ] Implement private completion attestations bound to contract, quest, participant, evidence digest, nonce, and validity.
- [ ] Implement one-time claim payout, capacity completion, early organizer close, and exact one-time refund.
- [ ] Implement encrypted private-state backup/import using PBKDF2-HMAC-SHA-256 and AES-256-GCM.
- [ ] Implement exact claim-request and attestation JSON validation/serialization.
- [ ] Implement evidence hashing, request creation, organizer review/signing, local verification, and serverless exchange in `api/src/attestation.ts`.
- [ ] Implement the deep `MeritVeilAPI` on-chain interface and complete public `QuestState` projection.
- [ ] Build read-only, organizer deploy/fund, organizer review/sign/export, and participant request/import/claim browser flows.
- [ ] Present the organizer trust boundary and public payout boundary accurately.
- [ ] Add permanent behavior tests for every constructor bound, authorization rule, signature binding, deadline/capacity rule, and illegal transition.
- [ ] Add CI for compile, tests, type checks, and production build.
- [ ] Deploy and exercise the complete flow on Preprod with a local proof server.
- [ ] Create `docs/USAGE.md`, complete README, prepare launch posts, create the product X account, record the demo, make at least fifteen meaningful commits, and submit Level 4.

### Level 4 exit proof

- [ ] Contract compiles and every product behavior test passes on undeployed.
- [ ] Forged, modified, cross-participant, cross-quest, and cross-contract attestations fail without state changes.
- [ ] A valid attestation pays exactly once and total payouts never exceed the exact funded pool.
- [ ] A live Preprod payout changes the public balances by the configured reward, with DUST treated separately.
- [ ] Chain state excludes evidence bytes/URI/digest, signature, organizer secret, and participant secret while exposing recipient and transfer.
- [ ] README, frontend configuration, manifest, live UI, address, and quest digest agree.

## Level 5 — Full Moon

Goal: validate the Preprod product with 50 identifiable testers and implement the highest-value feedback.

- [ ] Add `docs/FEEDBACK.md` with collection method, raw dated feedback, themes, and change/reason/commit records.
- [ ] Add `USERS.md` with 50 consented, verified Preprod addresses, dates, and an accurate current count.
- [ ] Prepare Discord/Telegram, X, and direct-message recruitment copy with prerequisites and exact test flow.
- [ ] Recruit and verify 50 real Preprod users without publishing private evidence or secrets.
- [ ] Rank feedback deterministically and implement the first three actionable items, or all when fewer than three exist.
- [ ] Re-run affected end-to-end flows after each change and update user-facing docs when behavior changes.
- [ ] Add the Level 5 validation section and links to README.
- [ ] Make at least twenty meaningful commits and submit Level 5.

### Level 5 exit proof

- [ ] `USERS.md` contains 50 consented, verified Preprod wallet addresses with no placeholders.
- [ ] Raw feedback supports every theme and each claimed change has a matching commit.
- [ ] The full live flow still completes after the selected improvements.

## Level 6 — Supermoon

Goal: launch the feedback-improved final Preprod release and onboard 20 launch users.

- [ ] Reconfirm the complete Midnight compatibility set and migrate only if Preprod requires it.
- [ ] Add the literal Level 6 improvements table to `docs/FEEDBACK.md`, with every status `Implemented`.
- [ ] Redeploy the final contract to Preprod and replace every old address atomically across code, config, and docs.
- [ ] Re-fund only the final contract used for the demo and onboarding.
- [ ] Update `docs/USAGE.md` with nontechnical Preprod getting-started and first-transaction guidance.
- [ ] Add `LAUNCH_USERS.md` with 20 consented, verified final-release users and dates.
- [ ] Complete every final README section and link the current X profile and brand assets.
- [ ] Produce the brand brief and reusable end-to-end onboarding script.
- [ ] Create visual assets, update X, onboard 20 users, record the final demo, make at least thirty meaningful commits, and submit Level 6.

### Level 6 exit proof

- [ ] Contract behavior, frontend, configuration, and docs use one current Preprod address.
- [ ] Final demo shows the address, complete wallet-to-payout flow, and privacy boundary.
- [ ] `LAUNCH_USERS.md` contains 20 verified, consented users and no placeholders.
- [ ] Feedback improvements are implemented, documented, and exercised on the live release.
