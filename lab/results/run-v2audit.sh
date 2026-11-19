#!/bin/bash
cd /home/montassar/Desktop/projects/skill-lang-responsive
export PLAYWRIGHT_MODULE=/home/montassar/.claude/plugins/cache/pixel-clone/pixel-clone/0.1.0/node_modules/playwright
declare -A INT=( [r04-dashboard]="" [r05-tables]="" [r08-complex]="#hscroll" )
for c in r01-hero r02-nav r03-grids r04-dashboard r05-tables r06-forms r07-media r08-complex r09-typography r10-footer; do
  mkdir -p lab/results/v2-run/$c
  node skills/universal-responsive-design/scripts/audit.mjs --url http://localhost:4173/responsive/$c/ --out lab/results/v2-run/$c/start ${INT[$c]:+--intentional "${INT[$c]}"} > lab/results/v2-run/$c/start.log 2>&1
done
echo done > lab/results/v2-run/audit-start.done
