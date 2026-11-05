# File Converter documentation audit

Pinned reference: 6278ae831b4fcbe62790359448564c96b44bab84. All six documentation/text files retrieved; no failures. README.md and PRODUCT.md establish current features; DESIGN.md describes their implemented interface. Font/brand documents cover asset and licence provenance.

The scope is a browser-local document/data/image conversion application, native readers and a persistent device-local library. Ten formats and 44 conversion paths are documented, with compatible output selection, on-demand engines, PDF page navigation, sanitized document readers and explicit save/download/delete. IndexedDB metadata/blob transactions, content/name deduplication and cross-tab refresh support the library.

No conversion API, cloud file storage, account, OCR, exact-layout preservation or cloud synchronization is promised. Browser/OS access to a shared profile matters; local storage is not app-level encrypted. Keep public privacy wording about processing location rather than claiming complete security. The README documents tested round trips/resource limits, but this documentation-only audit did not rerun that product.

Safe brief: File Converter brings conversion, reading and a saved-file library into one browser-based application. Documents, tables and images move through compatible format adapters; users can inspect source/output files, download results and explicitly save them in the current browser. Processing and saved content stay on-device, with clear format, fidelity and storage limits.

## Documentation inventory

- `DESIGN.md` — retrieved and screened.
- `PRODUCT.md` — retrieved and screened.
- `README.md` — retrieved and screened.
- `public/brand/FONT-LICENSE.txt` — retrieved and screened.
- `public/brand/README.md` — retrieved and screened.
- `public/fonts/LICENSE.txt` — retrieved and screened.
