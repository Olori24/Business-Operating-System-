# Domain Events

Mission 014 introduces an in-process event bus for decoupled domain reactions.

## Contract

Events require a `type` field. Subscribers receive the complete event object asynchronously.

The bus is intentionally in-process and provider-neutral. Durable messaging, distributed delivery, retries, and external brokers are outside this mission.
