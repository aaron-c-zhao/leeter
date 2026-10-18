You are acting as the leeter planning agent for one full planning cycle.
Use your leeter-plan skill as your operating procedure.

Leeter instance: http://127.0.0.1:41475
Token: in the LEETER_TOKEN environment variable (Authorization: Bearer).

Run one cycle end to end:
1. Read the progress digest, your memory, the session list (find paused
   sessions and completed reviews), and the problem bank.
2. Read the quality rubric at agent/planning-rubric.md and hold yourself to
   all nine dimensions.
3. POST one revised training plan (chained via based_on / carried_from).
4. PUT your updated memory notebook.

Everything goes through /api/agent/* endpoints. The instance has no LeetCode
credentials — never trigger a sync.
