# Fernwood photo study

A browser study that measures how people report an AI-altered image of a real person. Participants are randomized to one of two reporting menus. The guideline text is identical in both arms except for one added section in the direct arm.

| Arm | Report menu |
| --- | --- |
| `status_quo` | Copyright or IP, impersonation, privacy, harassment, nudity, spam or scam, something else |
| `direct` | The same options plus "AI-generated or manipulated image of a real person", listed first |

All other options are shuffled per participant with a seeded shuffle. The order is logged.

## Files

- `index.html`: the whole study. Host it on GitHub Pages.
- `apps-script/Code.gs`: the endpoint that writes to your Google Sheet.
- `test/`: a mock endpoint and a Playwright run.

## Set up the Sheet (about 10 minutes)

1. Create a Google Sheet. Open Extensions > Apps Script.
2. Paste `Code.gs`. Change `TOKEN`.
3. Run `setup()` once and approve permissions. It creates the Participants, Events, Assignments and Dictionary tabs.
4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Copy the web app URL.
5. In `index.html`, set `CONFIG.ENDPOINT` to that URL and `CONFIG.TOKEN` to the same token.
6. Open `index.html?arm=direct` once. With an endpoint set, the `arm` parameter is ignored, so test by finishing a run and checking the Sheet.
7. For Prolific, set the study URL to `https://YOU.github.io/REPO/?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}` and set `COMPLETION_URL`.

Editing the script after deploying requires Deploy > Manage deployments > New version.

## What is recorded

No photo, face data or name is sent. The photo is processed in the browser and cleared at debrief. Only clicks, timings and answers are sent. The optional first name stays on the device. Free-text "tell us more" fields are logged as `[given]` only. The "what were you looking for" answer is stored as typed, so remind participants not to enter identifying details.

Assignment is balanced on the server. If the server is unreachable for 4 seconds, the page assigns randomly in the browser and records `assign_source = client`.

Time spent with the tab hidden is excluded from every duration.

## Data dictionary

See the Dictionary tab, created by `setup()`. Primary outcome: `decision_ms` (report dialog opened to first option selected). Secondary: `first_path`, `final_path`, `path_changes`, `back_count`, `policy_dwell_ms`, `gave_up`, `report_total_ms`.

## Placeholders to replace before piloting

- Consent, debrief and withdrawal text (marked "Placeholder"). Use IRB-approved language.
- The pathway list and form fields. They are plausible stand-ins, not an audited inventory.
- Guideline wording. Pretest that it is neutral and equally readable in both arms.
- The altered image is a simple local composite, not an AI model. Swap in your stimulus if you need higher fidelity.
- Protection resources and meter values are illustrative. Verify each service and law before use, then set `LAST_REVIEWED`.
- `STANDIN_NAME`, `COMPLETION_CODE`, `COMPLETION_URL`.

## Preview mode

With `ENDPOINT` blank, nothing is sent. Add `?arm=direct` or `?arm=status_quo` to force an arm. The last screen shows the rows that would be written.
