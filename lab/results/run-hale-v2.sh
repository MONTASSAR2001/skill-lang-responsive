#!/bin/bash
cd /home/montassar/Desktop/projects/skill-lang-responsive
while ! grep -q "criticalViewports" lab/results/F-v1-hale.log 2>/dev/null; do sleep 10; done
node lab/harness/check-responsive.mjs --url http://localhost:3218/ --id hale --out lab/results/F-v2/hale > lab/results/F-v2-hale.log 2>&1
