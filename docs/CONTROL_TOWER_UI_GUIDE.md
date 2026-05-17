# Control Tower UI Guide

The Control Tower is your review desk for observing agent activity, approving sensitive steps, and reviewing execution timelines in one centralized dashboard. This guide will walk you through using the Control Tower UI from start to finish.

## 1. Start the Demo

To begin exploring the Control Tower, you need to initialize a demo session. This seeds the kernel with sample data and creates a mock agent.

1. Locate the **Get started** panel in the left sidebar.
2. Click the **Start demo** button. 
3. A **demo session label** (agent ID) will be generated. This tells the system to attach your requests to this specific walkthrough.

*(Note: You can always click **Reset demo** to clear all mock data and start from scratch.)*

## 2. Review the Live Snapshot

The **Live snapshot** panel is the ground truth for your demo. It displays the current "World State" — the counters, services, and other values the agent can read or change.
* When you start the demo, you'll see default resources (like `demo:counter` or `service:payment-api`).
* Keep an eye on this panel; as the agent executes actions, these values will update in real-time.

## 3. Send a Sample Request

Once the demo is running, you can propose tasks for the agent to perform.

1. Go to the **Send a sample request** panel in the sidebar.
2. Select an action from the dropdown menu (e.g., *Increase counter by a larger batch*, *Simulate rolling back a service*).
3. Review the **Simple fields**. The defaults are safe for the demo, but you can adjust them (like changing the number to increment, or updating a note).
4. Review the plain-language summary of what the action will do.
5. Click **Send request**.

*(Advanced: If you want to modify the exact payload, open the **Advanced: raw request (JSON)** accordion to edit the raw input directly.)*

## 4. Approve or Reject Sensitive Actions

Some actions (like large batch operations or service rollbacks) require human oversight.

1. Check the **Approval Inbox** panel in the main content area. If your request needs approval, it will appear here.
2. Review the request details.
3. Click **Approve** to allow the agent to proceed, or **Reject** to block it.
4. When approving or rejecting, you will be prompted to provide an optional operator hint or rejection reason for the audit trail.

## 5. Review Runs and the Activity Timeline

After a request is sent (and approved, if necessary), you can track its lifecycle.

1. Scroll to the **Runs** panel. Each row represents a single agent attempt.
2. The table shows the status of each run (e.g., `succeeded`, `failed`, `pending_approval`).
3. **Click on a specific run** to select it.
4. Look at the **Activity timeline** panel next to it. This provides a step-by-step replay of the selected run:
   * It shows plain-language narratives of what happened.
   * You can expand entries to see the raw trace details and timestamps.

## Summary Workflow
**Start Demo** ➔ **Send Request** ➔ **Check Inbox (Approve/Reject)** ➔ **Watch Snapshot Update** ➔ **Review Timeline**