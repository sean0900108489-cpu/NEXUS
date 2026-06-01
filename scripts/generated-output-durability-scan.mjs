#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const blockingFindings = [];

const streamServicePath = "src/lib/backend/api/agent-stream-service.ts";
const workflowLlmClientPath = "src/lib/workflow-runtime-lite/llm-client.ts";
const runtimeTestPath = "src/lib/backend/runtime/agent-runtime.test.ts";
const memoryCompressRoutePath = "src/app/api/v1/agents/memory-compress/route.ts";
const nexusStorePath = "src/store/nexus-store.ts";
const nexusStoreTestPath = "src/store/nexus-store.test.ts";
const nexusTypesPath = "src/lib/nexus-types.ts";

const streamServiceSource = readRequired(streamServicePath);
const workflowLlmClientSource = readRequired(workflowLlmClientPath);
const runtimeTestSource = readRequired(runtimeTestPath);
const memoryCompressRouteSource = readRequired(memoryCompressRoutePath);
const nexusStoreSource = readRequired(nexusStorePath);
const nexusStoreTestSource = readRequired(nexusStoreTestPath);
const nexusTypesSource = readRequired(nexusTypesPath);
const persistFunctionStart = streamServiceSource.indexOf("async function persistTaskOutputMessage");
const persistFunctionEnd = streamServiceSource.indexOf(
  "function createImmediateV1StreamErrorResponse",
);
const persistFunction =
  persistFunctionStart === -1
    ? ""
    : streamServiceSource.slice(
        persistFunctionStart,
        persistFunctionEnd === -1 ? undefined : persistFunctionEnd,
      );

const persistCallIndex = streamServiceSource.indexOf("await persistTaskOutputMessage(");
const completeTaskIndex = streamServiceSource.indexOf("await runtimeService.completeTask(");
const failTaskAfterPersist =
  persistCallIndex === -1
    ? false
    : streamServiceSource.slice(persistCallIndex).includes("await runtimeService.failTask(");

const streamCompletionAuthority = {
  failsTaskOnPersistenceFailure:
    persistCallIndex !== -1 && failTaskAfterPersist,
  persistsBeforeComplete:
    persistCallIndex !== -1 &&
    completeTaskIndex !== -1 &&
    persistCallIndex < completeTaskIndex,
  upsertShape: {
    agentId: persistFunction.includes("agentId,"),
    fallbackContent: persistFunction.includes('"Stream completed without payload."'),
    idUsesOutputMessageId: persistFunction.includes("id: outputMessageId"),
    roleAssistant: persistFunction.includes('role: "assistant"'),
    taskId: persistFunction.includes("taskId: task.id"),
    workspaceId: persistFunction.includes("workspaceId"),
  },
};

if (!streamCompletionAuthority.persistsBeforeComplete) {
  blockingFindings.push({
    code: "streamTask.completeBeforeDurableOutput",
    file: streamServicePath,
    message: "Stream tasks must persist the assistant output message before marking the task completed.",
  });
}

if (!streamCompletionAuthority.failsTaskOnPersistenceFailure) {
  blockingFindings.push({
    code: "streamTask.persistenceFailureDoesNotFailTask",
    file: streamServicePath,
    message: "Output persistence failures must flow into task failure instead of completed lifecycle state.",
  });
}

for (const [field, present] of Object.entries(streamCompletionAuthority.upsertShape)) {
  if (!present) {
    blockingFindings.push({
      code: "messageAuthority.upsertShapeMissing",
      field,
      file: streamServicePath,
      message: "Durable output message upsert is missing an authority/join field.",
    });
  }
}

const workflowRuntimeProducer = {
  outputIdShape: workflowLlmClientSource.includes("`${runId}:${node.id}:output`"),
  passesOutputIdToStream: /\boutputMessageId,\s*\n\s*workspaceId: workspace\.id/.test(
    workflowLlmClientSource,
  ),
  runtimeHeader: workflowLlmClientSource.includes('"X-Nexus-Workflow-Runtime", "lite"'),
};

if (!workflowRuntimeProducer.outputIdShape) {
  blockingFindings.push({
    code: "workflowRuntime.outputMessageIdShapeChanged",
    file: workflowLlmClientPath,
    message: "Workflow Runtime Lite must produce addressable output ids shaped as runId:nodeId:output.",
  });
}

if (!workflowRuntimeProducer.passesOutputIdToStream) {
  blockingFindings.push({
    code: "workflowRuntime.outputMessageIdNotSent",
    file: workflowLlmClientPath,
    message: "Workflow Runtime Lite must send outputMessageId to the stream API.",
  });
}

if (!workflowRuntimeProducer.runtimeHeader) {
  blockingFindings.push({
    code: "workflowRuntime.headerMissing",
    file: workflowLlmClientPath,
    message: "Workflow Runtime Lite stream calls must preserve the runtime marker header.",
  });
}

const regressionCoverage = {
  assertsCreateTaskPreservesOutputId: runtimeTestSource.includes(
    "expect(createData.task.outputMessageId).toBe(outputMessageId)",
  ),
  assertsDurableMessageLookup: runtimeTestSource.includes(
    "getInMemoryMessageRepository().findById(outputMessageId)",
  ),
  assertsJoinFields:
    runtimeTestSource.includes('role: "assistant"') &&
    runtimeTestSource.includes("taskId: createData.task.id") &&
    runtimeTestSource.includes('workspaceId: "workspace-runtime"'),
  workflowStyleOutputIdFixture: runtimeTestSource.includes(
    "`workflow_run:${crypto.randomUUID()}:llm-node:output`",
  ),
};

for (const [field, present] of Object.entries(regressionCoverage)) {
  if (!present) {
    blockingFindings.push({
      code: "regressionCoverage.outputDurabilityMissing",
      field,
      file: runtimeTestPath,
      message: "Output durability regression coverage is missing a required assertion.",
    });
  }
}

const memoryOutputAuthority = {
  localPersistenceMarksNeedsDurableWrite: nexusStoreSource.includes(
    'durability: "needs_memory_write_route"',
  ),
  memoryCompressRouteDoesNotCompleteTask:
    !memoryCompressRouteSource.includes(".completeTask(") &&
    !memoryCompressRouteSource.includes("completeTask("),
  memoryCompressTaskQueuedOnly: memoryCompressRouteSource.includes("queuedOnly: true"),
  memoryCompressWorkerUnavailableMarker: memoryCompressRouteSource.includes(
    "workerAvailable: false",
  ),
  runtimeCompletionNotCompletedByTask: memoryCompressRouteSource.includes(
    'runtimeCompletion: "not_completed_by_task"',
  ),
  storeTestsAssertMemoryDurability:
    nexusStoreTestSource.includes('durability: "needs_memory_write_route"') &&
    nexusStoreTestSource.includes('mode: "preserve_full_until_durable_write"'),
  typeNarrowsMemoryDurability:
    nexusTypesSource.includes('mode: "preserve_full_until_durable_write"') &&
    nexusTypesSource.includes('durability: "needs_memory_write_route"'),
};

for (const [field, present] of Object.entries(memoryOutputAuthority)) {
  if (!present) {
    blockingFindings.push({
      code: "memoryAuthority.lifecycleBoundaryMissing",
      field,
      file:
        field === "storeTestsAssertMemoryDurability"
          ? nexusStoreTestPath
          : field === "typeNarrowsMemoryDurability"
            ? nexusTypesPath
            : field === "localPersistenceMarksNeedsDurableWrite"
              ? nexusStorePath
              : memoryCompressRoutePath,
      message:
        "Memory compression output must remain explicitly lifecycle-only until a durable memory write route exists.",
    });
  }
}

const report = {
  blockingFindings,
  memoryOutputAuthority,
  mode: {
    destructivePayloads: false,
    liveDatabaseRead: false,
    secretExported: false,
    type: "static-generated-output-durability-scan",
  },
  regressionCoverage,
  streamCompletionAuthority,
  workflowRuntimeProducer,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (blockingFindings.length > 0) {
  process.exitCode = 1;
}

function readRequired(relativePath) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}
