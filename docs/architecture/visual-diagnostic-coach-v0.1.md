# Visual Diagnostic Coach v0.1

Status: EXPERIMENTAL / PRACTICE ONLY

## Outcome
Train the analyst to perceive and discriminate observable interface details before mapping them to behavioral hypotheses or diagnoses.

## Personal learning profile
The initial analyst profile is an advanced structured reasoner whose primary bottleneck is visual discrimination of web/app interfaces. The system therefore allocates more practice to noticing, contrast and salience than to generic reasoning drills.

## Pedagogical sequence
PERCEIVE -> DESCRIBE -> DISCRIMINATE -> PRIORITIZE SALIENCE -> INTERPRET -> HYPOTHESIZE -> DIAGNOSE.

v0.1 implements two component-skill drills: Noticing (one screenshot) and Contrast (two screenshots). Behavioral mapping, journey inspection and certification remain later stages.

## Authority boundary
The multimodal model is an AI coach, not ground truth. Its scores are practice estimates only and never contribute to premium authorization. Certification requires frozen, independently verified visual cases and adjudicated reference labels.

## Data boundary
Screenshots are compressed client-side and sent only for the live coaching request. Raw screenshots are not persisted in Postgres. Persisted state is limited to context, image fingerprints, analyst observations, structured coach feedback, model metadata and practice metrics.

## Security
Text visible inside screenshots is untrusted content, never instructions. The visual coach prompt explicitly ignores instructions embedded in the interface image. No website is fetched server-side in v0.1, avoiding a new SSRF/browser-automation surface.

## Learning references
- Carnegie Mellon Eberly Center: mastery requires component skills, integration, goal-directed practice and targeted feedback: https://www.cmu.edu/teaching/principles/learning.html
- Stanford d.school: observation/needfinding and perspective-taking as component design skills: https://dschool.stanford.edu/tools/ethnography-field-guide
- Stanford AAALab: contrasting cases as a method for fostering noticing: https://aaalab-server3.stanford.edu/publications/index.html
- Harvard Project Zero: careful observation should be separated from interpretation before evidence-backed inference: https://pz.harvard.edu/resources/see-think-wonder

We use these as design principles; we do not copy or redistribute proprietary/non-commercial teaching materials.

## v0.1 metrics
- visual_specificity (1-5, AI-coach estimate)
- observation_interpretation_separation (1-5, AI-coach estimate)
- salience_coverage_estimate (0-100, AI-coach estimate)
- false_inference_count
- repeat missed-category distribution over time
- practice minutes and session frequency

The first three are formative only until calibrated against expert-labeled visual cases.
