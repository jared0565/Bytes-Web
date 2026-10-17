# Run a data fix

A data fix is a one-off SQL file in `bytes-website/crm-api-worker/data-fixes/`. It changes rows in the **live** database.
So it needs the owner's go-ahead every time, and you run it by hand. Nothing in CI runs it.

The existing fix is `2026-10-11-bytesfx-name.sql`. It updates stored email text, not the code. See the brand-name section
in the [knowledge base](../knowledge-base.md#7-features-by-area).

Run every command below from `bytes-website/crm-api-worker`. The database is `chatbot-db`, the name the config binds.
Do not use `crm-database`, which the package's migration scripts name.

- `d1 execute` reaches the **live** database only because of `--remote`. Without it, Wrangler uses a local copy, and
  the result proves nothing about production.
- `d1 time-travel` has no local mode. **It always acts on the live database**, with or without `--remote`.

## Steps

1. **Read the file.** Check which rows it changes and whether a `WHERE` clause limits it.
2. **Count first.** Turn the fix's `WHERE` clause into a count, and run it with the owner's go-ahead:
   ```
   npx wrangler d1 execute chatbot-db --remote --config wrangler.toml --command "SELECT COUNT(*) AS n FROM <table> WHERE <the fix's condition>"
   ```
   Record the number.
3. **Get the owner's go-ahead** for the change itself. State the number of rows it will touch.
4. **Take a restore point** just before the fix, and record the bookmark it prints:
   ```
   npx wrangler d1 time-travel info chatbot-db --config wrangler.toml
   ```
5. **Run the fix:**
   ```
   npx wrangler d1 execute chatbot-db --remote --config wrangler.toml --file data-fixes/<file>.sql
   ```
6. **Count again** with the same command. The result should be zero, or the number you expected.
7. **Record it.** Add a note to `HANDOVER.md` with the date, the file name, the counts before and after, and the
   bookmark.

## If the upload fails

On 11 Oct 2026 the first try failed with "Authentication error [code: 10000]" during the upload step. Running
`npx wrangler login` again fixed it. Log in and retry the same command. Do not change the SQL to get past an auth error.

## If a fix went wrong

D1 can put the whole database back to the bookmark from step 4, or to an earlier time. How far back depends on the
account's plan: up to 30 days, as Wrangler's help states it. These commands change production:

```
npx wrangler d1 time-travel restore chatbot-db --config wrangler.toml --bookmark <bookmark>
npx wrangler d1 time-travel restore chatbot-db --config wrangler.toml --timestamp <unix time or RFC 3339>
```

**A restore replaces the whole database, not just the rows the fix touched.** Leads, chats, page views and anything
else written to D1 after that point are lost. So only the owner decides to restore, and a second, narrower fix is often the better
choice. Neither command has been run on this project.

## Never

- Do not run the file against the local database and assume that proves the live one.
- Do not run a fix twice without counting first. A second run can change rows that the first run has already fixed.
