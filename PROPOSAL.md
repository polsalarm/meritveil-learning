# Product Proposal

## What is the product, and who uses it?

**MeritVeil** — private proof-of-completion rewards for community quests.

An organizer (a developer community, DAO, hackathon, or learning cohort) deploys one quest contract with public terms — reward per completion, capacity, deadline, and a digest of the quest description — and funds a tNIGHT reward pool once. A participant completes the quest and sends evidence (a link, PR, screenshot, or attendance proof) to the organizer off-chain. The organizer reviews it and signs a completion attestation bound to that participant, that quest, and that contract. The participant then proves in zero knowledge that they hold a valid organizer-signed attestation and claims the reward. Each participant commitment is paid exactly once, total payouts can never exceed the funded pool, and the organizer can close early and refund exactly the unclaimed balance.

**Users**

- **Organizers** who want to reward contributors publicly and auditably without publishing contributors' evidence.
- **Participants** who want to be paid for verified work without exposing their evidence or an identity-linked approval trail on-chain.
- **Observers** (sponsors, community members) who want to verify that every payout was backed by a genuine organizer approval and the pool was never overspent.

**Trust boundary.** The organizer is trusted to review evidence honestly; MeritVeil does not judge evidence quality. It guarantees that only organizer-approved participants are paid, each exactly once, within the funded pool.

## Why Midnight specifically?

On a transparent chain, proving eligibility for a reward means publishing the approval or the evidence behind it. That exposes contributors' work and personal details, links every payout to a public approval trail, and lets a copied approval be replayed.

Midnight lets the contract verify the organizer's signature and the participant binding inside a zero-knowledge proof, using private witnesses that never reach the ledger. The chain learns only that a valid, unused, correctly bound attestation exists — not the evidence, its digest, the signature, or the participant's secret. Forged, modified, cross-participant, cross-quest, and cross-contract attestations fail the proof, so replay protection is enforced by the circuit rather than by an off-chain server. Public ledger state still gives observers exact accounting: terms, pool balance, claim count, and each payout transfer.

## Data Model

| Data Point | Type | Disclosed To |
|---|---|---|
| Quest terms (reward, capacity, deadline, quest digest) | Public ledger | Everyone |
| Organizer public key | Public ledger | Everyone |
| Funded pool balance and total paid out | Public ledger | Everyone |
| Claimed participant commitments (duplicate prevention) | Public ledger | Everyone |
| Payout recipient address and transfer amount | Public ledger | Everyone |
| Quest open/closed state | Public ledger | Everyone |
| Completion evidence (bytes, URI) | Off-chain, shared with organizer | Organizer only |
| Evidence digest | Private witness | No one on-chain (participant and organizer off-chain) |
| Organizer attestation signature | Private witness | No one on-chain (participant and organizer off-chain) |
| Participant secret | Private witness | No one |
| Organizer signing secret | Private witness | No one |

## Mainnet Feasibility

Realistic for a Preprod MVP at Level 4 and a feedback-hardened release by Level 6, because the scope is deliberately narrow: one organizer and one quest per contract, native tNIGHT only, and no token issuance, cross-contract calls, or custom off-chain infrastructure beyond a stateless attestation exchange.

- **Proven building blocks.** Signature verification reuses the Jubjub Schnorr pattern from Midnight's official ZK Loan example; payouts use native token transfers; duplicate prevention is a set of participant commitments.
- **Already exercised.** The Level 1–3 counter proves the core primitive — proving knowledge of a private secret against a public commitment — end to end with Lace, a local proof server, and Preprod.
- **Main risks.** Circuit size and proving time for in-circuit signature verification; Midnight SDK and ledger version churn before Mainnet; organizer key management and encrypted backup of private state in the browser; DUST fee UX for first-time users.
- **Mainnet path.** Pin one compatible Midnight stack, keep the contract surface small and fully tested (constructor bounds, authorization, signature binding, deadline/capacity, illegal transitions), and migrate from tNIGHT to NIGHT when Mainnet DApp deployment is generally available.
