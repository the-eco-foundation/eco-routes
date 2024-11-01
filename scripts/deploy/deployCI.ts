import * as fs from 'fs';
import * as path from 'path';



console.log("some deploy stuff")

const currentDir = path.resolve('.');
console.log(`Current directory: ${currentDir}`);

fs.readdir(currentDir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }
  console.log('Files in directory:', files);
});