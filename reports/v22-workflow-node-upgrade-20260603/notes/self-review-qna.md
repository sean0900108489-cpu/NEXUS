# V22 Self Review Q&A

## Round 1 - Workflow Import Contract

Question: If another LLM generates workflow JSON tomorrow, what prevents it from
creating a graph the runtime cannot execute?

Answer: The manifest needs a typed validation layer before import. The current
`machine-manifest.json` is a schema draft, not yet an enforcing validator. The
next high-value step is to add a workflow import validator that checks node
type, port compatibility, model capability requirements, artifact policy, and
compiler declarations before any graph state mutation.

## Round 2 - Brain Controller Telemetry

Question: How does a future brain controller receive graph state without
scraping the UI or becoming tightly coupled to React Flow?

Answer: The brain should subscribe to runtime-level events, not component
state. Its input should be a stream of `ContextPacket`, `NodeExecution`,
`WorkflowRun`, `ArtifactVaultRecord`, edge state, compiler metadata, and model
settings. React Flow remains a renderer; the brain observes the graph runtime
and proposes structured patches.

## Round 3 - Media Model Expansion

Question: When video, image edit, audio, and 3D generation nodes arrive, how do
we avoid turning the graph toolbar into one-off feature code?

Answer: Treat every media node as a plugin-like capability profile with common
ports and artifact policies. Each node line should define accepted inputs,
compiler pipeline, model parameter controls, output artifact kind, storage
rules, and download behavior. UI controls should be generated from capability
metadata where possible, while execution adapters stay independent by media
type.
