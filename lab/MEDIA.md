# Benchmark screenshots and videos

The bulky binary evidence (about 866 screenshots and screen recordings under `lab/results/`, `lab/outputs/` and `lab/baseline/`, roughly 200 MB) was removed from the working tree in v1.0.0 so that `claude plugin marketplace add` and ordinary clones stay small and fast. Nothing was rewritten: the files are still in git history.

Restore them locally with:

```bash
git checkout evidence-media-v1.0.0 -- lab/results lab/outputs lab/baseline
```

The numeric results (`*.json`, `*.tsv`), judges, rubrics and the images referenced by `docs/evaluation/` (`lab/results/evidence/`) are still in the tree. Third-party imagery from the demo template used in those screenshots is another reason to keep them out of the default checkout.
