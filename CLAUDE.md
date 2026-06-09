## Cross-model collaboration
 
Trigger: any request to co-author, review, implement, or verify a plan with
another model — OR any time you create or edit a file under `docs/cross-model/`.
 
When triggered, FIRST read `docs/cross-model/cross-model-review-flow.md` and
follow it exactly. Do not act on such a request before reading it.
 
Summary (fallback only; the file above is authoritative):
Use one canonical `plan.md`, revised in place; reviews live in sibling files.
Reviewers append findings only and never edit the plan body, checkboxes, or
status. Authors/executors resolve findings by updating status/resolution fields.
ASCII severity/status are authoritative. Never start implementation or claim
final completion while any BLOCKER or MAJOR finding is OPEN. Work on `feat/<slug>`,
never commit to `main`.
 