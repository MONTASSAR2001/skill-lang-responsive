#!/bin/bash
cd /home/montassar/Desktop/projects/skill-lang-responsive
node lab/harness/run-responsive.mjs --label run0-baseline --split all --base http://localhost:4173/baseline/responsive > lab/results/run0-baseline.log 2>&1
node lab/harness/run-responsive.mjs --label v1-run --split dev > lab/results/v1-run.log 2>&1
