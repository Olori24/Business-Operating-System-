import { spawn } from "node:child_process";

const compose = ["compose", "-f", "docker-compose.test.yml"];
const env = {
  ...process.env,
  DATABASE_URL: "postgres://bos:bos@localhost:54329/bos",
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

try {
  await run("docker", [...compose, "up", "-d", "--wait"]);
  await run("npm", ["run", "test:integration"]);
} finally {
  await run("docker", [...compose, "down", "-v"]).catch(() => {});
}
