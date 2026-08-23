const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:/Users/ASUS/.gemini/antigravity-ide/brain/997c3d20-3de5-4660-9438-7561942a3f78/.system_generated/logs/transcript.jsonl';

async function main() {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      count++;
      console.log(`Line ${count}: type=${obj.type}, source=${obj.source}, status=${obj.status}`);
      if (obj.tool_calls) {
        console.log('  Tool calls:', obj.tool_calls.map(tc => tc.name || tc.ToolName));
        for (const tc of obj.tool_calls) {
          if (tc.name === 'browser_subagent' || tc.ToolName === 'browser_subagent') {
            console.log('  Browser Subagent Args:', JSON.stringify(tc.arguments || tc.Arguments));
          }
        }
      }
    } catch (e) {
      console.error('Line parse error:', e.message);
    }
  }
}

main();
