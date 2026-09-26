# GSD (Get Shit Done) Guidelines

When working on complex tasks and features in this workspace, follow the GSD spec-driven workflow:

1. **Phased Approach**:
   - **Discuss**: Clarify requirements and align on scope.
   - **Plan**: Create structured plans and phases (e.g. using `/gsd-plan-phase`).
   - **Execute**: Implement incrementally with isolated contexts and verification (e.g. `/gsd-execute-phase`).
   - **Verify**: Audit changes, run tests, and check quality.
   - **Ship**: Finalize milestones and document progress.

2. **Context Management**:
   - Utilize GSD skills (`gsd-*`) available in `.agents/skills` to offload deep execution and avoid context window saturation.
   - Keep state in `.planning/` directories when running multi-phase GSD workflows.
