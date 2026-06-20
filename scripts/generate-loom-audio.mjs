import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const projectRoot = '/Users/ernestoortiz/Downloads/Claude/signal-and-friction-app';
const scriptPath = path.join(projectRoot, 'LOOM_SCRIPT.md');
const tempAiff = path.join(projectRoot, 'temp_voiceover.aiff');
const finalM4a = path.join(projectRoot, 'audio.m4a');

async function run() {
  console.log('--- LOOM AUDIO GENERATOR ---');
  console.log(`Reading script from: ${scriptPath}`);
  
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script file not found: ${scriptPath}`);
  }

  const content = fs.readFileSync(scriptPath, 'utf8');
  
  // Extract speech between delimiters
  const match = content.match(/<!-- SPEECH_START -->([\s\S]*?)<!-- SPEECH_END -->/);
  if (!match) {
    throw new Error('Could not find speech block in LOOM_SCRIPT.md. Make sure it is enclosed in <!-- SPEECH_START --> and <!-- SPEECH_END -->');
  }

  const speechText = match[1].trim();
  console.log(`Extracted Speech Text (${speechText.length} characters):\n`);
  console.log('----------------------------------------');
  console.log(speechText);
  console.log('----------------------------------------\n');

  console.log('Synthesizing speech using macOS "say" command (Voice: Samantha, Rate: 165)...');
  
  // Use Samantha voice at 165 wpm for clean professional pacing
  const sayCommand = `say -v Samantha -r 165 -o "${tempAiff}" "${speechText.replace(/"/g, '\\"')}"`;
  execSync(sayCommand);
  console.log(`Successfully generated raw AIFF audio: ${tempAiff}`);

  console.log('Converting AIFF to high-quality AAC (M4A) using macOS afconvert...');
  // afconvert converts standard audio formats natively
  const afconvertCommand = `afconvert -f m4af -d aac -q 127 "${tempAiff}" "${finalM4a}"`;
  execSync(afconvertCommand);
  console.log(`Successfully converted to AAC: ${finalM4a}`);

  console.log('Cleaning up temporary AIFF file...');
  if (fs.existsSync(tempAiff)) {
    fs.unlinkSync(tempAiff);
  }
  
  console.log('✓ Audio generation complete! Output saved at: audio.m4a');
}

run().catch(console.error);
