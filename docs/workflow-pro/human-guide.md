# Workflow Pro Human Guide

## What It Is

Workflow Pro is the layer where a user can design, inspect, question, and improve workflows. The existing Graph view is already useful for execution: it has nodes, edges, runtime packets, image model settings, LLM reasoning controls, generated asset history, and delete/start controls. Workflow Pro should sit above that as a professional design cockpit.

The key shift is simple:

```text
Graph = run and inspect executable nodes.
Workflow Pro = understand, design, critique, optimize, and export/import the workflow.
```

## Why It Exists

Sean's target is not just drawing boxes. The platform needs a Workflow Brain that can read the whole workflow before it runs. It should know what the workflow is trying to do, why each node exists, how data moves, what files travel with text, what the model settings mean, and which features are missing.

Without Workflow Pro, the app can have a graph that runs. With Workflow Pro, the app can have a graph that a strong LLM can understand and improve.

## The Big Idea

One JSON file should be able to generate a workflow.

That JSON should include:

- workflow intent
- success criteria
- nodes and their purposes
- edge rationale and packet contracts
- serial, parallel, conditional, fallback, and brain-decision modes
- model settings
- file compiler settings
- generated artifact policies
- capability inventory
- explicit missing features
- brain proposal permissions

This lets a future LLM open the project with no shared memory and still understand the situation.

## Main Screens

Workflow Pro should have internal views:

- Design: workflow structure, contract status, node overview.
- Brain: current brain understanding, questions, optimization suggestions.
- Evidence: run timeline, packet movement, generated artifacts, errors.
- Proposal Diff: compare current workflow to a brain-proposed workflow.
- Files: file nodes, compiler state, raw and compiled artifacts.
- Settings: validation strictness, model policies, artifact policies.

Concept 5 and concept 6 from the V23 report are useful as information architecture references. Concept 5 informs Evidence. Concept 6 informs Proposal Diff. They should not be copied visually as colorful layouts.

## First Version Scope

The first engineering version should be foundation-first:

- add `workflow-pro` as a third workspace view mode
- render a Workflow Pro shell
- read current workspace/graph/runtimeLite state
- show capability inventory and contract summary
- prepare import/export contracts
- avoid changing Graph behavior

This first version does not need full autonomous workflow rewriting. It should make the contract visible and make the next steps safe.

