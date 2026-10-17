# Run a data fix

A data fix is a one-off SQL file in `bytes-website/crm-api-worker/data-fixes/`. It changes rows in the **live** database.
So it needs the owner's go-ahead every time, and you run it by hand. Nothing in CI runs it.

The existing fix is `2026-10-11-bytesfx-name.sql`. It updates stored email text, not the code. See the brand-name section
in the [knowledge base](../knowledge-base.md#7-features-by-area).

## Steps

1. **Read the file.** Check which rows it changes and whether a `WHERE` clause limits it.
2. **Count first.** Write a `SELECT COUNT(*)` for the same condition and run it on the live database, with the owner's
   go-ahead. Record the number.
3. **Get the owner's go-ahead** for the count result and for the change itself. State the number of rows it will touch.
4. **Run the fix**, from `bytes-website/crm-api-worker`:
   ```
   npx wrangler d1 execute chatbot-db --remote --config wrangler.toml --file data-fixes/<file>.sql
   ```
   Use `chatbot-db`, the database name the config binds. Do not use `crm-database`, which the package's migration
   scripts name.
5. **Count again** with the same condition. The result should be zero, or the number you expected.
6. **Record it.** Add a note to `HANDOVER.md` with the date, the file name and the counts before and after.

## If the upload fails

On 11 Oct 2026 the first try failed with "Authentication error [code: 10000]" during the upload step. Running
`npx wrangler login` again fixed it. Log in and retry the same command. Do not change the SQL to get past an auth error.

## Never

- Do not run the file against the local database and assume that proves the live one.
- Do not run a fix twice without counting first. A second run can change rows that the first run has already fixed.
