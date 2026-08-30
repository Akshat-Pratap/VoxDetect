# scripts/

One-off utilities for the P1 ML track (folium-style). Keep small, self-contained
helpers here; the reusable modules stay in `src/`, experiments stay in `notebooks/`.

Planned / add as needed:

- `organize_test_data.py` — move downloaded clips into
  `test_data/real/{english,hindi}/...` and `test_data/cloned/{english,hindi}/...`
- `generate_clones.py` — use a TTS voice-cloning tool to synthesize a cloned clip
  from a reference recording (for the P4 test-data build)
- `audit_results.py` — summarize every `results/*.json` into a comparison table
