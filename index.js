import { ChatGPTAPI } from "chatgpt";
import fs, { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(path.dirname(__filename)));
const txtFilePath = path.join(path.dirname(__filename), "api_key.txt");

let chatGPT;

console.log(__dirname);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function readApiKeyFromFile(filePath, callback) {
  fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) {
      callback(err);
    } else {
      const apiKey = data.trim();
      if (apiKey) {
        callback(null, apiKey);
      } else {
        callback(new Error("Api key not found in file."));
      }
    }
  });
}

function writeApiKeyToFile(filePath, apiKey) {
  fs.writeFileSync(filePath, apiKey.trim());
}
function showWelcomeScreen() {
  console.log("##########################################");
  console.log("#                                        #");
  console.log("#      Welcome!                          #");
  console.log("#                                        #");
  console.log("#      React js Auto Jest Tool           #");
  console.log("#      Author: Emre Ramazanoglu          #");
  console.log("#      Github: emreramazanoglu72         #");
  console.log("#                                        #");
  console.log("##########################################");

  readApiKeyFromFile(txtFilePath, (err, apiKey) => {
    if (err) {
      rl.question("Please enter your Chat GPT API key: ", apiKey => {
        chatGPT = new ChatGPTAPI({ apiKey });
        writeApiKeyToFile(txtFilePath, apiKey);
        checkQuestion();
      });
    } else {
      chatGPT = new ChatGPTAPI({ apiKey });
      checkQuestion();
    }
  });
}
// JavaScript dosyalarını tarayacak fonksiyon
function readFiles(dirname, onFileContent, onError) {
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) {
      const filePath = path.join(dirname, filename);
      fs.stat(filePath, function(err, stats) {
        if (err) {
          onError(err);
          return;
        }
        if (stats.isDirectory()) {
          if (filename !== "node_modules") {
            readFiles(filePath, onFileContent, onError);
          }
        } else if (stats.isFile()) {
          if (filename.match(/\.jsx?$/i) || filename.match(/\.tsx?$/i)) {
            if (filename.match(/\.test\.(jsx?|tsx?)$/i)) {
              return;
            }
            fs.readFile(filePath, "utf-8", function(err, content) {
              if (err) {
                onError(err);
                return;
              }
              onFileContent(filename, content, filePath);
            });
          }
        }
      });
    });
  });

  return true;
}

 function createTestFiles() {
  typeWriter("#################################", 15);
  const dirPath = path.join(__dirname);
   readFiles(
    dirPath + "/",
    async function(filename, content, filePath) {
      const fileSavePath = path.dirname(filePath);
      const testName = filename.split(".")[0] + ".test.js";
      const testFilePath = path.join(fileSavePath, testName);
      const testContent = `
        ${content}
        can you write a test for this code with jest show code sample
      `;

      const response = await chatGPT.sendMessage(testContent);
      const regex = /```([\s\S]*?)```/g;
      const matches = response.text.match(regex);
      if (matches == null) return false;

      let testCode = matches[0]
        .replace("```", "// \nimport '@testing-library/jest-dom';")
        .replace("```", "//");
      testCode = testCode.split("\n");
      testCode.shift();
      testCode.pop();
      testCode = testCode.join("\n");
      fs.writeFile(testFilePath, testCode, err => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(`Test file created: ${testName}`);
      });
    },
    function(err) {
      console.log(err);
    }
  );
  return true;
}

function installJest() {
  console.log("Installing jest pack...  ");
  require("child_process").execSync(
    "npm install --save-dev jest @testing-library/react @testing-library/jest-dom",
    {
      stdio: [0, 1, 2]
    }
  );
  console.log("Jest package installations are complete.");
}

function setupJest() {
  console.log("Making jest settings...");
  const packageJsonPath = "./package.json";
  const packageJsonContent = readFileSync(packageJsonPath, {
    encoding: "utf-8"
  });
  const packageJson = JSON.parse(packageJsonContent);

  if (!packageJson.jest) {
    packageJson.jest = {
      testEnvironment: "jsdom",
      setupFilesAfterEnv: ["@testing-library/jest-dom/extend-expect"]
    };
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("Jest settings are complete.");
  } else {
    console.log("The jest is already installed.");
  }
}

function checkJest() {
  if (existsSync("./node_modules/jest")) {
    console.log("The jest is already installed.");
    checkQuestion();
  } else {
    rl.question("Install jest pack? (1 = yes, 0 = no): ", answer => {
      if (answer === "1") {
        installJest();
        setupJest();
        checkQuestion();
      } else {
        console.log("The transaction has been cancelled.");
      }
    });
  }
}

function typeWriter(text, delay = 50) {
  let i = 0;

  function printLetter() {
    if (i < text.length) {
      process.stdout.write(text.charAt(i));
      i++;
      setTimeout(printLetter, delay);
    } else {
      process.stdout.write("\n");
    }
  }

  printLetter();
}

// Kullanım örneği
async function checkQuestion() {
  console.log("1:Check jest Setup");
  console.log("2:Generate Test Files");
  rl.question("Vote : ", async answer => {
    if (answer === "1") {
      checkJest();
    } else if (answer === "2") {
      console.log("Transaction started\n");
      await createTestFiles();
    }
  });
}

showWelcomeScreen();
