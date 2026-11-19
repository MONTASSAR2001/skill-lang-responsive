#!/bin/bash
cd /home/montassar/Desktop/projects/skill-lang-responsive
node lab/harness/run-responsive.mjs --label F-baseline --split all --base http://localhost:4173/baseline/responsive > lab/results/F-baseline.log 2>&1
node lab/harness/run-responsive.mjs --label F-v1 --split dev --base http://localhost:4173/outputs/v1/responsive > lab/results/F-v1.log 2>&1
node lab/harness/check-responsive.mjs --url http://localhost:3217/ --id hale --out lab/results/F-baseline/hale > lab/results/F-baseline-hale.log 2>&1
