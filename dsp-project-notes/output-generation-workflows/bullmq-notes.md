# BullMQ — Complete Notes

## Prerequisites

### Why background jobs exist

In a web server, every request should respond quickly (under a few hundred ms ideally). But some tasks are slow — sending emails, resizing images, calling slow APIs, generating reports. You don't want the user's HTTP request to wait for all that. So instead, you *queue* the work and let a separate process handle it asynchronously.

### The producer / consumer pattern

This is the core mental model for any queue system:

- **Producer**: your app code that says "hey, do this work later" and drops a job into the queue
- **Queue**: a persistent list of pending work
- **Consumer** (also called a *worker*): a separate process that picks jobs off the queue and does the actual work

### Redis

BullMQ uses Redis as its backbone — Redis is an in-memory data store that's extremely fast and supports data structures like lists and sorted sets, which make it perfect for a job queue. You don't need to be a Redis expert, but you should know it's a key-value store that runs separately from your app (usually on `localhost:6379` in development).

### Node.js async / event loop basics

BullMQ is a Node.js library. You'll want to be comfortable with `async/await` and Promises since all BullMQ operations are async.

---

## What is BullMQ?

BullMQ is a **Node.js job queue library** built on Redis. It lets you:

- Add jobs to a queue from one part of your app (the producer)
- Process those jobs in separate worker processes (the consumer)
- Handle retries, delays, priorities, rate limiting, and job lifecycle events

It's the modern, TypeScript-first successor to the older `Bull` library (same author).

---

## Core Concepts

### The three main classes

**`Queue`** — the producer side. You import this in your app and call `.add()` to push jobs in.

**`Worker`** — the consumer side. You give it a queue name and a *processor function* — the actual code that runs for each job.

**`QueueEvents`** — an event emitter that lets you listen for things like `completed`, `failed`, `progress` across your whole queue (useful for logging or notifications).

### Job lifecycle states

Jobs move through these states:

- `waiting` → job is in the queue, not yet picked up
- `active` → a worker is currently running it
- `completed` → finished successfully
- `failed` → threw an error and exhausted all retries
- `delayed` → scheduled to run in the future
- `prioritized` → waiting but will jump ahead of normal jobs

### Basic usage

```js
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis();

// Producer — add a job
const emailQueue = new Queue('emails', { connection });
await emailQueue.add('sendWelcome', { to: 'user@example.com' });

// Consumer — process jobs
const worker = new Worker('emails', async (job) => {
  console.log('Sending email to', job.data.to);
  await sendEmail(job.data.to);
}, { connection });
```

### Why BullMQ over plain Redis or other libraries?

- **Retries with backoff** — if a job fails, it can automatically retry N times with exponential backoff
- **Delayed jobs** — schedule jobs to run in the future: `queue.add('remind', data, { delay: 3600000 })`
- **Rate limiting** — process at most X jobs per second
- **Job priorities** — some jobs jump the line
- **Concurrency** — one worker can process multiple jobs in parallel
- **Job progress** — workers can report progress (0–100%) that your app can listen to
- **Sandboxed processors** — workers can run in separate child processes so a crash doesn't take down your whole worker
- **TypeScript first** — BullMQ is fully typed

---

## Architecture: How it fits into your system

When a user hits your endpoint (e.g. `POST /export-report`), your API server calls `queue.add()` to drop the job into Redis and immediately returns a `202 Accepted` with the `jobId`. The user doesn't wait.

A separate **worker server** polls Redis, picks up jobs, runs your processor function (the actual business logic), and then writes the result back to your own database.

```js
const worker = new Worker('reports', async (job) => {
  // 1. Do the actual work
  const pdf = await generateReport(job.data);

  // 2. Update YOUR database
  await db.reports.update({
    where: { id: job.data.reportId },
    data: { status: 'completed', url: pdf.url }
  });
}, { connection });
```

**Important distinction:** Redis/BullMQ tracks its own internal job state (for retries, concurrency, etc.) and your DB tracks your app's business state (what the user actually queries). They are parallel — you own the DB updates yourself inside the processor function.

---

## Worker Management

### BullMQ does NOT spawn workers

When you write `new Worker(...)`, you're creating a worker *within whatever process is already running*. BullMQ does not spawn or manage worker processes for you — you are responsible for starting them.

You'd typically run `worker.js` using something like **PM2**, **Docker replicas**, or **Kubernetes** to manage how many worker processes exist, restarts on crash, scaling, etc.

BullMQ handles everything *inside* that process: polling Redis, respecting concurrency limits, retrying failed jobs.

### Concurrency

You can set `concurrency` per worker so a single process runs multiple jobs in parallel:

```js
new Worker('emails', processor, { connection, concurrency: 10 });
```

**What you manage:** Starting worker processes, scaling them, restarting on crash (PM2 / k8s).

**What BullMQ manages:** Job polling from Redis, concurrency within a process, retry logic and backoff.

---

## Flows (Pipelines)

BullMQ has a first-class feature for multi-step pipelines called **Flows**. A Flow is a tree of jobs where parent jobs wait for their children to complete before they run.

### Key behaviour: all jobs are enqueued upfront

When you call `flow.add()`, **all jobs — children and parent — are written to Redis atomically in one shot.** The children are immediately in `waiting` state and workers can start picking them up right away. The parent sits in `waiting-children` state, blocked until every child completes.

The parent is not a "spawner" — it's a **completion gate**. It runs last, not first. The tree structure in your code is just how you declare the relationship, not the execution order.

### Declaration vs execution order

You declare the tree **upside down** in code:

| In code (declaration order) | Actual execution order |
|---|---|
| Root = parent (runs last) | Deepest child runs first |
| Children nested inside | Children run immediately, in parallel |
| Deepest child at the bottom | Parent runs only after all children complete |

### Example

```js
import { FlowProducer } from 'bullmq';

const flow = new FlowProducer({ connection });

const tree = await flow.add({
  name: 'pipeline-complete',   // parent — runs last
  queueName: 'pipeline',
  children: [
    { name: 'fetch-data',  queueName: 'pipeline', data: { step: 1 } },
    { name: 'transform',   queueName: 'pipeline', data: { step: 2 } },
    { name: 'notify',      queueName: 'pipeline', data: { step: 3 } },
  ]
});

// The parent job ID is your pipeline run ID
console.log(tree.job.id); // e.g. "abc123"
```

---

## Failure Management in Pipelines

### BullMQ does NOT auto-cancel sibling jobs on failure

When a job fails:

- It retries if you configured `attempts > 1`
- If it exhausts all retries, it moves to `failed` state
- The parent stays in `waiting-children` indefinitely — it never runs
- Sibling jobs that are already in `waiting` state will still be picked up by workers

### Scenario A — Sequential chain (safe by design)

If you chain steps sequentially (each step is a child of the previous), you get natural cancellation for free. Step 3 only gets enqueued *after* Step 2 completes. If Step 2 fails, Step 3 was never added to Redis — nothing to cancel.

### Scenario B — Parallel steps (manual cancellation required)

If steps run in parallel (all enqueued upfront), you must handle cancellation yourself. When a job's `failed` event fires, iterate over sibling jobs and call `job.remove()` on those still in `waiting` state. Jobs already in `active` state cannot be stopped — they're mid-execution.

```js
worker.on('failed', async (job, err) => {
  const parentId = job.opts.parent?.id;
  if (!parentId) return;

  const children = await queue.getJobChildren(parentId);

  for (const child of children) {
    const state = await child.getState();
    if (state === 'waiting' || state === 'delayed') {
      await child.remove(); // safe — hasn't started yet
    }
    // if state === 'active' — too late, it's already running
  }
});
```

### The gate check pattern

Even if a job slips from `waiting` into `active` before you could remove it, you can bail out early with a DB check at the top of every processor:

```js
const worker = new Worker('pipeline', async (job) => {
  // First thing — check if the pipeline was cancelled
  const run = await db.pipelineRuns.findById(job.data.runId);
  if (run.status === 'cancelled') return; // bail out immediately

  // ... actual work
});
```

### Practical advice

Design your pipeline **sequentially unless you have a real reason for parallelism.** Sequential chains give you natural cancellation — failure at step N means steps N+1 onward are never born. Parallel pipelines shift the cancellation burden onto you, and there's always a race window where a job slips from `waiting` into `active` before you remove it.

---

## Mapping a Real Pipeline to Flows

For a pipeline like:

```
[1] Ingestion
    → [2] Threat Gen. (parallel)  +  [3] CVE Matching (parallel)
        → [4] Attack Path
            → [5] Risk Scoring
                → [6] Mitigation Rec.
                    → [7] Export / Report
```

The `flow.add()` call is declared **root-first** (last step at the top):

```js
await flowProducer.add({
  // [7] runs last — it's the root
  name: 'export-report',
  queueName: 'pipeline',
  data: { runId },
  children: [{
    name: 'mitigation-rec',
    queueName: 'pipeline',
    data: { runId },
    children: [{
      name: 'risk-scoring',
      queueName: 'pipeline',
      data: { runId },
      children: [{
        // [4] waits for BOTH step 2 and 3 to finish
        name: 'attack-path',
        queueName: 'pipeline',
        data: { runId },
        children: [
          {
            name: 'threat-generation',
            queueName: 'pipeline',
            data: { runId },
            children: [{
              name: 'ingestion',   // runs first
              queueName: 'pipeline',
              data: { runId },
            }]
          },
          {
            name: 'cve-matching',
            queueName: 'pipeline',
            data: { runId },
            // Note: ingestion must be handled separately — see below
          }
        ]
      }]
    }]
  }]
});
```

### Important caveat: a single job cannot be a child of two parents

Step 1 (Ingestion) feeds into both Step 2 and Step 3, but BullMQ doesn't support a single job being a child of two parents.

**Recommended solution:** Run Step 1 *before* the flow, store its output (the canonical graph) in your DB, then kick off the flow with that data already available. Steps 2 and 3 can both read from the DB independently. This fits naturally with the orchestrator worker pattern — your orchestrator runs Step 1, saves the result, then calls `flowProducer.add()` for Steps 2–7.

---

## Quick Reference

| Concept | What BullMQ does | What you do |
|---|---|---|
| Worker processes | Nothing — no spawning | Start with PM2 / Docker / k8s |
| Job polling | Handles automatically | Nothing |
| Retries | Configurable per job | Set `attempts` and `backoff` |
| Flow enqueue | All jobs at once, atomically | Call `flow.add()` once |
| Parent execution | Waits for all children | Just declare the tree |
| Sibling cancellation on failure | Nothing automatic | Call `job.remove()` manually |
| DB status updates | Nothing | Write inside processor function |
