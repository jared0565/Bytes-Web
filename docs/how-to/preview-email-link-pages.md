# Preview email-link pages

The screens a lead reaches from an email link (confirm, confirmed, a link that cannot be used, an error, and the two
unsubscribe screens) are rendered by the crm-api worker. They are not part of the website. To see them on your machine,
you run the worker's pages through a small local server, with the database and settings mocked.

The mocks are in `bytes-website/crm-api-worker/test/pages.mjs`. The page styles are `PAGE_CSS` in
`bytes-website/crm-api-worker/src/index.js` (around line 2298), and the page code sits beside it.

## Steps

1. Build the test copy of the worker. The test runner creates it in `test/.build`. Run the `pages` suite once so the
   build exists:
   ```
   cd bytes-website/crm-api-worker
   node test/run.mjs pages
   ```
2. Write a small Node script (put it in your scratch folder, not in the repo) that:
   - imports the worker's `fetch` handler from the test build
   - uses the mocked database and settings from `test/pages.mjs`
   - serves that handler with Node's `http` module on a local port
3. Open the page for each screen in a browser, at phone width and at desktop width.
4. **Stop the server before you run the tests again.** On Windows the server holds `test/.build` open, and the test
   runner cannot clear that folder.

## Things to check

- The frame uses the website's colours and fonts, copied by hand. If the site's palette changes, copy the change here too.
- A second press of a button, or the Back button, shows "Link already used". That is correct behaviour.
- No script runs on these pages. That is deliberate, because email scanners open every link.
