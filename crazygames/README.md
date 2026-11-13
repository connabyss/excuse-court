# CrazyGames builds

The web game is `../index.html`. These scripts turn it into the CrazyGames version: a fixed 16:9 stage that fits
every CrazyGames frame, packed-in fonts, and the CrazyGames SDK v3. Nothing here changes the live site.

- `python make_cg.py` builds `build/index.html`, the Basic Launch version (the one submitted 13 Nov 2026).
- `python make_cg_full.py` builds `build_full/index.html`, kept ready for Full Launch. It adds:
  - `happytime()` for the first great acquittal of a visit, a new rank, and a perfect docket, at most once per 5 s
  - `reportGameCompletedPercentage()`: 20% per case of the first docket, 100% when it closes, and 100 on later visits
  - `gameplayStop()` on the closing card and `gameplayStart()` when the player leaves it
  - `setGameContext()` with the docket and case number

Copy `fonts/` and `judge/` from the uploaded package next to the built `index.html`. Upload the folder with
"Select folder" in the developer portal; CrazyGames doesn't accept zip files.

Test: serve the repo root on port 8765 (`python -m http.server 8765`), then `node test_full.js` (needs Playwright). It
plays a full docket against a logging SDK stub and prints every SDK call.
