# NEXUS // AI OPS

A futuristic multi-agent AI IDE built with Next.js, TypeScript, Tailwind, Zustand, framer-motion, react-rnd, and React Flow.

## Capabilities

- Spawn independent AI agent workstations with identity, mission, provider, model, memory, context notes, tools, and message history.
- Drag, resize, maximize, minimize, duplicate, close, and arrange agent windows across one command workspace.
- Materialize and persist a schema-versioned workspace in local storage on first load.
- Save, export, and import validated portable JSON workspace snapshots.
- Use the command palette for agent creation, layout control, snapshot operations, and workspace reset.
- Stream responses through `/api/agent-stream` with a local mock stream by default.
- Configure OpenAI-compatible streaming per agent from the Settings sidebar.
- Add chat, image, or video agents from the Settings sidebar while keeping each agent's model, key, base URL, memory, and transcript isolated.
- Use image/video workstations as media generation canvases with mock artifact previews until live providers are wired in.
- Stop in-flight streams without leaving an agent stuck in a streaming state.
- Run a minimal mock tool executor for executable tools while planned tools are labeled honestly.
- Toggle from workstation panels to a persistent React Flow graph planner.
- Drag agent graph nodes and manually wire directed data-flow edges between agents.

## Graph Planner

Use the top bar `View: Graph` toggle to switch from draggable agent panels to the visual workflow canvas. Each agent appears as a cyberpunk React Flow node with input and output handles, memory load, model, status, and a live mission/message preview. Drag nodes to reposition them, connect an output handle to another agent input to sketch data flow, and use `Focus / Open` to return to that agent's workstation.

Graph positions and edges are stored in the same local workspace snapshot as panels, messages, memory, and settings. Select edges or nodes and press `Delete` / `Backspace` to remove them; deleting a node removes that agent from the workspace. The graph is currently a manual blueprint layer only; autonomous handoffs and execution loops are intentionally deferred.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## OpenAI-Compatible Streaming

Open the top-bar Settings control and configure each agent's model, API key, and base URL. Keys are masked in the UI, persisted in this browser workspace, and sent to `/api/agent-stream` as an `Authorization` header only when that specific agent dispatches a message.

Agents with an empty key use mock streaming independently. The top bar shows `STREAM: MOCK` when no agents have keys, `STREAM: LIVE` when every active agent has a key, and `STREAM: MIXED` when only some agents are live-configured.

## Multi-Modal Agents

Use Settings -> Add New Agent to create a Chat, Image, or Video workstation. Chat agents keep the standard stream transcript; image and video agents replace the transcript with a generation canvas, prompt composer, progress state, and media artifact preview. Image agents use the DALL-E adapter through `/api/image-gen` when that agent has an API key, and fall back to the local mock image adapter when no key is configured. Video remains mock-only.

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
```
