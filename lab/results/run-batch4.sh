#!/bin/bash
cd /home/montassar/Desktop/projects/skill-lang-responsive
node lab/harness/run-l10n.mjs --label F-v1 --split dev --base http://localhost:4173/outputs/v1/l10n > lab/results/F-v1-l10n.log 2>&1
node lab/harness/run-l10n.mjs --label F-v2 --split dev --base http://localhost:4173/outputs/v2/l10n > lab/results/F-v2-l10n.log 2>&1
