# How-to guides

Short, task-based steps. Each guide says what to do and where the detail lives. The reference is the
[knowledge base](../knowledge-base.md).

| Task | Guide |
|---|---|
| Run the website, chatbot-api or crm-api on your machine | [Run locally](run-locally.md) |
| Run the automated tests and checks | [Run the tests](run-the-tests.md) |
| Ship a change to production | [Deploy](deploy.md) |
| Change a plan's price, limits or features | [Change plans and prices](change-plans-and-prices.md) |
| Add a third-party tag (analytics, ads, pixel) | [Add a tracking tag](add-a-tracking-tag.md) |
| Make a new link-preview image | [Remake the share images](remake-share-images.md) |
| Look at the screens a lead reaches from an email link | [Preview email-link pages](preview-email-link-pages.md) |
| Run a one-off SQL fix on the live database | [Run a data fix](run-a-data-fix.md) |

**Two rules that apply to every guide:**

- Anything that touches production (the live database, the live APIs, deploys) needs the owner's go-ahead first.
- Use `--config wrangler.toml` for every Wrangler command in `bytes-website/crm-api-worker`. Without it, Wrangler acts on
  the website worker.
