import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/build-release.yml", import.meta.url), "utf8");
const required = [
  "pull_request:",
  "contents: read",
  "ENIGMA_VIRTUAL_BOX_INSTALLER_URL",
  "ENIGMA_VIRTUAL_BOX_INSTALLER_SHA256",
  "tagmeister-Windows.zip",
  "github.event_name != 'pull_request'",
];
const forbidden = [
  "softprops/action-gh-release",
  "tag_name:",
  "enigmaprotector.com/assets/files/enigmavb.exe",
];
const errors = [
  ...required.filter((value) => !workflow.includes(value)).map((value) => `missing ${value}`),
  ...forbidden.filter((value) => workflow.includes(value)).map((value) => `forbidden ${value}`),
];

if (errors.length) {
  throw new Error(`Release workflow contract failed:\n- ${errors.join("\n- ")}`);
}

console.log("Release workflow contract passed");
