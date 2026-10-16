# Team contribution plan

The initial five commits are attributed to the repository owner's configured Git identity.
They are not evidence that teammates implemented those changes. The tasks below are
proposed work, not completed contributions or pre-made commits. Each teammate should
implement, validate and commit their own five changes. Only organizers can determine
whether contributions satisfy the event's rules.

## CodieONTOP: visitor interface and accessibility

Use branch `feature/visitor-experience`.

| Commit | Work to implement | Acceptance check | Suggested message |
| --- | --- | --- | --- |
| 1 | Add alphabetical ascending/descending hospital sorting that preserves search filters | Switching order changes the first/last result and resets pagination without losing filters | `feat: add hospital directory sort controls` |
| 2 | Add removable chips for city, ownership and organ-keyword filters | Removing one chip clears only its filter; Clear filters clears all | `feat: add removable directory filter chips` |
| 3 | Improve autocomplete matching for repeated spaces and punctuation while preserving original display text | Equivalent punctuation/spacing finds the same hospitals; empty searches behave normally | `fix: normalize hospital autocomplete queries` |
| 4 | Add focus restoration and keyboard focus containment to hospital detail dialogs | Tab stays in the dialog; Escape closes it and focus returns to the originating listing | `fix: make hospital detail dialogs keyboard accessible` |
| 5 | Add a compact responsive request timeline and a readable full-date view | Long histories remain readable at 360px width and timestamps show the intended timezone | `feat: improve request timeline layout and timestamps` |

Keep organ matching labeled as name-keyword search. Do not infer medical services.

## ayushisingh4564-commits: API reliability and coordination safeguards

Use branch `feature/coordination-reliability`.

| Commit | Work to implement | Acceptance check | Suggested message |
| --- | --- | --- | --- |
| 1 | Prevent duplicate active synthetic requests for the same visitor, city and organ | Duplicate submission returns a clear conflict; a different organ/city or a closed prior request is handled deliberately | `feat: prevent duplicate active demo requests` |
| 2 | Detect appointment collisions for the same receiving staff/city and overlapping slot | Conflicting booking is rejected; nonoverlapping booking succeeds; cancelled bookings release the slot | `feat: validate internal appointment time conflicts` |
| 3 | Scope simulated availability records to the staff account's city | Bhopal updates do not change Indore counts; visitors and administrators cannot modify inventory | `feat: isolate simulated availability by staff city` |
| 4 | Add server-side status filtering and pagination to request lists without bypassing ownership/city checks | Pagination returns consistent totals; unauthorized records never enter any page | `feat: paginate scoped coordination requests` |
| 5 | Add idempotency protection for request creation retries | Retrying the same submission key returns the original request; differing payload/key behavior is tested | `feat: make demo request creation idempotent` |

Include focused regression tests with each API feature. No real patient information,
clinical allocation rankings, organ offers or external notifications should be added.

## Work and push from your own account

First accept the repository invitation. Configure Git with your own name and an email
verified on your GitHub account (or your own GitHub-provided noreply address).
Never copy another person's author identity.

```sh
git clone https://github.com/devrajsengar786-sssup/organbridge-demo.git
cd organbridge-demo
git switch -c feature/visitor-experience
```

Ayush should use `feature/coordination-reliability` instead. For each task:

1. Implement that task and inspect the changed files.
2. Run `npm test` and any relevant browser checks.
3. Stage only its implementation and tests.
4. Commit with an accurate message from the table or your own equivalent.

```sh
git diff
git add path/to/changed-file path/to/relevant-test
git commit -m "Describe the change you actually implemented"
git push -u origin HEAD
```

Open a pull request from your branch to `main`. Do not use empty commits, change
author names to manufacture participation, or cherry-pick the owner's changes as
if you authored them. Review the event's merge policy: a squash merge collapses
commit history, so the team must confirm what organizers count before merging.

CodeVishal-17 is invited as a collaborator as requested. An invitation does not
create GitHub contributor credit; actual authored contributions do.
