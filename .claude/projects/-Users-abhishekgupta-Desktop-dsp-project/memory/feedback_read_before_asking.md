---
name: Read code before asking questions about it
description: User expects Claude to read relevant source files proactively before asking questions about what the code does
type: feedback
---

Read the relevant source file before asking the user what their code does or contains. The user expects proactive code reading — asking "do you know what X does?" when the file is available is unnecessary friction.

**Why:** User explicitly called this out ("U could read it urself as well") when asked about the contents of an error handler that was readable in the codebase.

**How to apply:** When discussing a specific file or function that likely exists in the project, read it first, then frame the discussion around what you found rather than asking the user to recall it.
